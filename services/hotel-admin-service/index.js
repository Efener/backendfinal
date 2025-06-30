const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        if (req.user.role !== 'admin') return res.status(403).send('Admin access required');
        next();
    });
};


// --- AUTHENTICATION ROUTES ---

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User and Admin authentication
 */

/**
 * @swagger
 * /admin/auth/register-admin:
 *   post:
 *     summary: Register a new admin user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already exists
 */
app.post('/auth/register-admin', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide name, email, and password" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role",
            [name, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

/**
 * @swagger
 * /admin/auth/register:
 *   post:
 *     summary: Register a new regular user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered successfully
 */
app.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide name, email, and password" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role",
            [name, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Login for users and admins
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successful login, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 role:
 *                   type: string
 *       400:
 *         description: Invalid credentials
 */
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// --- HOTEL MANAGEMENT ROUTES ---

/**
 * @swagger
 * tags:
 *   name: Hotels
 *   description: Hotel management (Admin only)
 */

/**
 * @swagger
 * /admin/hotels:
 *   get:
 *     summary: Get all hotels
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: A list of hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   location:
 *                     type: string
 *                   description:
 *                     type: string
 */
app.get('/hotels', async (req, res) => {
    try {
        const allHotels = await pool.query("SELECT * FROM hotels");
        res.json(allHotels.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

/**
 * @swagger
 * /admin/hotels/{id}:
 *   get:
 *     summary: Get a single hotel by ID
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A single hotel object
 *       404:
 *         description: Hotel not found
 */
app.get('/hotels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await pool.query("SELECT * FROM hotels WHERE id = $1", [id]);

        if (hotel.rows.length === 0) {
            return res.status(404).json({ message: "Hotel not found" });
        }

        res.json(hotel.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

/**
 * @swagger
 * /admin/hotels:
 *   post:
 *     summary: Add a new hotel
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Hotel created successfully
 */
app.post('/hotels', authenticateToken, async (req, res) => {
    try {
        const { name, location, description } = req.body;
        const newHotel = await pool.query(
            "INSERT INTO hotels (name, location, description) VALUES ($1, $2, $3) RETURNING *",
            [name, location, description]
        );
        res.status(201).json(newHotel.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

/**
 * @swagger
 * /admin/hotels/{id}:
 *   put:
 *     summary: Update a hotel
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 *       404:
 *         description: Hotel not found
 */
app.put('/hotels/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, description } = req.body;
        const updatedHotel = await pool.query(
            "UPDATE hotels SET name = $1, location = $2, description = $3 WHERE id = $4 RETURNING *",
            [name, location, description, id]
        );

        if (updatedHotel.rows.length === 0) {
            return res.status(404).json({ message: "Hotel not found" });
        }

        res.json(updatedHotel.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

/**
 * @swagger
 * /admin/hotels/{id}:
 *   delete:
 *     summary: Delete a hotel
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hotel deleted successfully
 *       404:
 *         description: Hotel not found
 */
app.delete('/hotels/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteOp = await pool.query("DELETE FROM hotels WHERE id = $1 RETURNING *", [id]);

        if (deleteOp.rows.length === 0) {
            return res.status(404).json({ message: "Hotel not found" });
        }
        res.status(200).json({ message: "Hotel deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

// --- ROOM MANAGEMENT ROUTES ---

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management (Admin only)
 */

/**
 * @swagger
 * /admin/hotels/{hotelId}/rooms:
 *   get:
 *     summary: Get all rooms for a specific hotel
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of rooms for the hotel
 */
app.get('/hotels/:hotelId/rooms', async (req, res) => {
    try {
        const { hotelId } = req.params;
        const rooms = await pool.query("SELECT * FROM rooms WHERE hotel_id = $1", [hotelId]);
        res.json(rooms.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

/**
 * @swagger
 * /admin/hotels/{hotelId}/rooms:
 *   post:
 *     summary: Add a new room to a hotel
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_number:
 *                 type: string
 *               type:
 *                 type: string
 *               price_per_night:
 *                 type: number
 *               capacity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Room created successfully
 */
app.post('/hotels/:hotelId/rooms', authenticateToken, async (req, res) => {
    try {
        const { hotelId } = req.params;
        const { room_number, type, price_per_night, capacity } = req.body;

        const newRoom = await pool.query(
            "INSERT INTO rooms (hotel_id, room_number, type, price_per_night, capacity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [hotelId, room_number, type, price_per_night, capacity]
        );
        res.status(201).json(newRoom.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

/**
 * @swagger
 * /admin/rooms/{roomId}:
 *   put:
 *     summary: Update a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_number:
 *                 type: string
 *               type:
 *                 type: string
 *               price_per_night:
 *                 type: number
 *               capacity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       404:
 *         description: Room not found
 */
app.put('/rooms/:roomId', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { room_number, type, price_per_night, capacity } = req.body;

        const updatedRoom = await pool.query(
            "UPDATE rooms SET room_number = $1, type = $2, price_per_night = $3, capacity = $4 WHERE id = $5 RETURNING *",
            [room_number, type, price_per_night, capacity, roomId]
        );

        if (updatedRoom.rows.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        res.json(updatedRoom.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

/**
 * @swagger
 * /admin/rooms/{roomId}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       404:
 *         description: Room not found
 */
app.delete('/rooms/:roomId', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const deleteOp = await pool.query("DELETE FROM rooms WHERE id = $1 RETURNING *", [roomId]);

        if (deleteOp.rows.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }
        res.status(200).json({ message: "Room deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

// Update room availability
app.post('/rooms/:roomId/availability', authenticateToken, async (req, res) => {
    // Placeholder
    res.send(`Availability updated for room ${req.params.roomId}`);
});

app.get('/', (req, res) => {
    res.send('Hotel Admin Service is running');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Hotel Admin Service listening on port ${PORT}`);
}); 