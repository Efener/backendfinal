const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017';
const DB_NAME = 'hotel_comments_db';
let db;

async function connectToMongo() {
    try {
        const client = new MongoClient(MONGO_URL, {
            tls: true,
            // You can add other TLS options here if needed, but this often suffices.
        });
        await client.connect();
        console.log('Connected successfully to MongoDB');
        db = client.db(DB_NAME);
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}
connectToMongo();

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

// --- COMMENTS ROUTES ---
/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Hotel comments and ratings
 */

/**
 * @swagger
 * /comments/hotels/{hotelId}/comments:
 *   get:
 *     summary: Get all comments for a hotel
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of comments.
 */
app.get('/hotels/:hotelId/comments', async (req, res) => {
    const { hotelId } = req.params;
    try {
        const comments = await db.collection('comments')
            .find({ hotel_id: parseInt(hotelId) }) // hotelId is from postgres, so it's an int
            .sort({ created_at: -1 })
            .toArray();
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

/**
 * @swagger
 * /comments/hotels/{hotelId}/comments:
 *   post:
 *     summary: Post a new comment for a hotel
 *     tags: [Comments]
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
 *               comment_text:
 *                 type: string
 *               ratings:
 *                 type: object
 *                 properties:
 *                   cleanliness:
 *                     type: number
 *                   location:
 *                     type: number
 *                   service:
 *                     type: number
 *                   value_for_money:
 *                     type: number
 *     responses:
 *       201:
 *         description: Comment posted successfully.
 *       400:
 *         description: Missing fields.
 */
app.post('/hotels/:hotelId/comments', authenticateToken, async (req, res) => {
    const { hotelId } = req.params;
    const { id: user_id } = req.user;
    const { comment_text, ratings } = req.body; // ratings is an object: { cleanliness: 5, location: 5, ... }

    if (!comment_text || !ratings) {
        return res.status(400).json({ message: 'Comment text and ratings are required.' });
    }

    try {
        const newComment = {
            hotel_id: parseInt(hotelId),
            user_id,
            comment_text,
            ratings,
            created_at: new Date()
        };
        const result = await db.collection('comments').insertOne(newComment);
        
        // Add the generated _id to the object before sending it back
        newComment._id = result.insertedId;
        
        res.status(201).json(newComment);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

/**
 * @swagger
 * /comments/hotels/{hotelId}/comments/stats:
 *   get:
 *     summary: Get aggregated rating statistics for a hotel
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Aggregated statistics.
 *       404:
 *         description: No comments found to generate stats.
 */
app.get('/hotels/:hotelId/comments/stats', async (req, res) => {
    const { hotelId } = req.params;
    try {
        const stats = await db.collection('comments').aggregate([
            { $match: { hotel_id: parseInt(hotelId) } },
            {
                $group: {
                    _id: "$hotel_id",
                    avg_cleanliness: { $avg: "$ratings.cleanliness" },
                    avg_location: { $avg: "$ratings.location" },
                    avg_service: { $avg: "$ratings.service" },
                    avg_value_for_money: { $avg: "$ratings.value_for_money" },
                    total_comments: { $sum: 1 }
                }
            }
        ]).toArray();

        if (stats.length === 0) {
            return res.status(404).json({ message: "No comments found for this hotel to generate stats." });
        }

        res.json(stats[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


app.get('/', (req, res) => {
    res.send('Hotel Comments Service is running');
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Hotel Comments Service listening on port ${PORT}`);
}); 