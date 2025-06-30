const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');
const cron = require('node-cron');

const app = express();

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

async function connectAndConsume() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        
        console.log(`[*] Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                const booking = JSON.parse(msg.content.toString());
                // In a real app, you would send an email or push notification to the admin
                console.log(" [x] Received new booking notification:", booking);
                // Here you would find the admin for the hotel and send a detailed message.
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Failed to connect or consume from RabbitMQ', error);
        setTimeout(connectAndConsume, 5000);
    }
}

// Occupancy check function
async function checkHotelOccupancy() {
    console.log('Running nightly occupancy check...');
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const client = await pool.connect();
    try {
        // This query is complex. It calculates the number of "booked days" for each hotel in the next 30 days.
        const occupancyQuery = `
            WITH hotel_room_counts AS (
                SELECT hotel_id, count(id) as total_rooms
                FROM rooms
                GROUP BY hotel_id
            ),
            booked_days_per_hotel AS (
                SELECT
                    r.hotel_id,
                    SUM(
                        LEAST(b.end_date, CURRENT_DATE + 30) -
                        GREATEST(b.start_date, CURRENT_DATE)
                    ) as total_booked_days
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                WHERE (b.start_date, b.end_date) OVERLAPS (CURRENT_DATE, CURRENT_DATE + 30)
                GROUP BY r.hotel_id
            )
            SELECT
                h.id,
                h.name,
                COALESCE(bd.total_booked_days, 0) as total_booked_days,
                (hrc.total_rooms * 30) as total_possible_days,
                (COALESCE(bd.total_booked_days, 0) * 100.0 / (hrc.total_rooms * 30)) as occupancy_percentage
            FROM hotels h
            JOIN hotel_room_counts hrc ON h.id = hrc.hotel_id
            LEFT JOIN booked_days_per_hotel bd ON h.id = bd.hotel_id
        `;

        const { rows } = await client.query(occupancyQuery);

        rows.forEach(hotel => {
            if (hotel.occupancy_percentage < 20) {
                // In a real app, find the hotel admin and send a notification.
                console.log(`[LOW OCCUPANCY ALERT] Hotel "${hotel.name}" (ID: ${hotel.id}) has an occupancy rate of ${parseFloat(hotel.occupancy_percentage).toFixed(2)}% for the next 30 days.`);
            }
        });

    } catch (err) {
        console.error('Error during occupancy check:', err.stack);
    } finally {
        client.release();
    }
}

// Schedule tasks to be run on the server.
// Runs every day at midnight. (Using '*/10 * * * * *' for demo - every 10 seconds)
cron.schedule('0 0 * * *', checkHotelOccupancy);

// Start listening for booking notifications
connectAndConsume();

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Notification Service is running');
});

const PORT = 3006; // Different port, not exposed in docker-compose on purpose
app.listen(PORT, () => {
    console.log(`Notification Service internal server running on port ${PORT}`);
    // Run once on startup for testing
    checkHotelOccupancy();
}); 