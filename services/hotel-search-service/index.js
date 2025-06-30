const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.POSTGRES_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Redis client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
(async () => {
    await redisClient.connect();
})();


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to check for an optional JWT and decode it
const decodeTokenOptional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // If token is invalid, treat as logged out
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};


// --- SEARCH ENDPOINT ---
/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Hotel Search operations
 */

/**
 * @swagger
 * /search/search:
 *   get:
 *     summary: Search for available hotel rooms
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: destination
 *         required: true
 *         schema:
 *           type: string
 *         description: City or location to search for.
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date (YYYY-MM-DD).
 *       - in: query
 *         name: people
 *         required: true
 *         schema:
 *           type: integer
 *         description: Number of people.
 *     responses:
 *       200:
 *         description: A list of available rooms. Prices are 15% lower if a valid JWT is provided.
 *       400:
 *         description: Missing required query parameters.
 */
app.get('/search', decodeTokenOptional, async (req, res) => {
    const { destination, startDate, endDate, people } = req.query;

    if (!destination || !startDate || !endDate || !people) {
        return res.status(400).json({ message: "Missing required query parameters: destination, startDate, endDate, people" });
    }

    try {
        const searchQuery = `
            SELECT r.id, r.room_number, r.type, r.price_per_night, r.capacity,
                   h.id as hotel_id, h.name as hotel_name, h.location
            FROM rooms r
            JOIN hotels h ON r.hotel_id = h.id
            WHERE r.capacity >= $1
              AND h.location ILIKE $2
              AND NOT EXISTS (
                  SELECT 1
                  FROM bookings b
                  WHERE b.room_id = r.id
                    AND (b.start_date, b.end_date) OVERLAPS ($3, $4)
              )
        `;

        const results = await pool.query(searchQuery, [people, `%${destination}%`, startDate, endDate]);

        let availableRooms = results.rows;

        // Apply 15% discount for logged-in users
        if (req.user) {
            availableRooms = availableRooms.map(room => ({
                ...room,
                price_per_night: (parseFloat(room.price_per_night) * 0.85).toFixed(2),
                discount_applied: true,
            }));
        }

        res.json(availableRooms);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});


// --- HOTEL DETAILS ENDPOINT (WITH CACHING) ---
/**
 * @swagger
 * /search/hotels/{id}:
 *   get:
 *     summary: Get details for a single hotel, including its rooms (cached)
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the hotel.
 *     responses:
 *       200:
 *         description: Detailed information about the hotel and its rooms.
 *       404:
 *         description: Hotel not found.
 */
app.get('/hotels/:id', async (req, res) => {
    const { id } = req.params;
    const cacheKey = `hotel:${id}`;

    try {
        const cachedHotel = await redisClient.get(cacheKey);

        if (cachedHotel) {
            console.log(`Serving hotel ${id} from cache`);
            return res.json(JSON.parse(cachedHotel));
        }

        console.log(`Fetching hotel ${id} from DB`);
        const hotelResult = await pool.query('SELECT * FROM hotels WHERE id = $1', [id]);
        if (hotelResult.rows.length === 0) {
            return res.status(404).json({ message: 'Hotel not found' });
        }
        const hotel = hotelResult.rows[0];

        // Also fetch rooms for the hotel
        const roomsResult = await pool.query('SELECT * FROM rooms WHERE hotel_id = $1', [id]);
        hotel.rooms = roomsResult.rows;

        // Cache the result for 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(hotel));

        res.json(hotel);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @swagger
 * /search/{hotelId}/availability:
 *   get:
 *     summary: Get available rooms for a specific hotel and date range
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: A list of available room IDs for the given hotel and dates.
 */
app.get('/:hotelId/availability', async (req, res) => {
    const { hotelId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required." });
    }

    try {
        const query = `
            SELECT r.id FROM rooms r
            WHERE r.hotel_id = $1
              AND NOT EXISTS (
                  SELECT 1
                  FROM bookings b
                  WHERE b.room_id = r.id
                    AND (b.start_date, b.end_date) OVERLAPS ($2, $3)
              )
        `;
        const result = await pool.query(query, [hotelId, startDate, endDate]);
        const availableRoomIds = result.rows.map(row => row.id);
        res.json(availableRoomIds);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});


app.get('/', (req, res) => {
    res.send('Hotel Search Service is running');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Hotel Search Service listening on port ${PORT}`);
}); 