const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const amqp = require('amqplib');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.POSTGRES_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// RabbitMQ connection
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq';
const QUEUE_NAME = 'booking_notifications';
let channel, connection;

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ', error);
        // Retry connection
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- BOOKING ROUTES ---

/**
 * @swagger
 * tags:
 *   name: Booking
 *   description: Hotel room booking operations
 */

/**
 * @swagger
 * /booking/bookings:
 *   post:
 *     summary: Create a booking for a room
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room_id
 *               - start_date
 *               - end_date
 *             properties:
 *               room_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Booking created successfully.
 *       401:
 *         description: Unauthorized (no token provided).
 *       403:
 *         description: Forbidden (invalid token).
 *       404:
 *         description: Room not found.
 *       409:
 *         description: Room not available for the selected dates.
 */
app.post('/bookings', authenticateToken, async (req, res) => {
    const { room_id, start_date, end_date } = req.body;
    const { id: user_id } = req.user;

    if (!room_id || !start_date || !end_date) {
        return res.status(400).json({ message: "Missing required fields: room_id, start_date, end_date" });
    }

    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: "Check-out date must be after the check-in date." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check for room availability
        const availabilityCheck = await client.query(
            `SELECT id FROM bookings
             WHERE room_id = $1 AND (start_date, end_date) OVERLAPS ($2, $3)`,
            [room_id, start_date, end_date]
        );

        if (availabilityCheck.rows.length > 0) {
            return res.status(409).json({ message: 'Room not available for the selected dates.' });
        }

        // 2. Get room price to calculate total
        const roomResult = await client.query('SELECT price_per_night FROM rooms WHERE id = $1', [room_id]);
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        const price_per_night = parseFloat(roomResult.rows[0].price_per_night);
        const duration = (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24);
        const total_price = price_per_night * duration;

        // 3. Create the booking
        const newBooking = await client.query(
            `INSERT INTO bookings (user_id, room_id, start_date, end_date, total_price)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [user_id, room_id, start_date, end_date, total_price]
        );

        await client.query('COMMIT');

        // 4. Send notification to RabbitMQ
        const notificationPayload = JSON.stringify(newBooking.rows[0]);
        channel.sendToQueue(QUEUE_NAME, Buffer.from(notificationPayload), { persistent: true });
        console.log(`Sent booking notification for booking ${newBooking.rows[0].id}`);

        res.status(201).json(newBooking.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

/**
 * @swagger
 * /booking/bookings:
 *   get:
 *     summary: Get all bookings for the authenticated user
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's bookings.
 *       401:
 *         description: Unauthorized.
 */
app.get('/bookings', authenticateToken, async (req, res) => {
    const { id: user_id } = req.user;
    try {
        const bookings = await pool.query(
            `SELECT b.*, h.name as hotel_name, r.type as room_type
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN hotels h ON r.hotel_id = h.id
             WHERE b.user_id = $1
             ORDER BY b.start_date DESC`,
            [user_id]
        );
        res.json(bookings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


app.get('/', (req, res) => {
    res.send('Hotel Booking Service is running');
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Hotel Booking Service listening on port ${PORT}`);
}); 