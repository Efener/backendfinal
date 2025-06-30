const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors());

// Swagger JSDoc options
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Hotel Booking System API',
            version: '1.0.0',
            description: 'API documentation for all services in the Hotel Booking System',
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Local development server via API Gateway'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
    },
    // Path to the API docs
    // Note: You have to list all files that contain swagger specs
    apis: [
        './services/hotel-admin-service/index.js',
        './services/hotel-search-service/index.js',
        './services/hotel-booking-service/index.js',
        './services/hotel-comments-service/index.js'
    ],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Servislerin adresleri (Docker Compose içindeki servis adları)
const services = {
    admin: 'http://hotel-admin-service:3001',
    search: 'http://hotel-search-service:3002',
    booking: 'http://hotel-booking-service:3003',
    comments: 'http://hotel-comments-service:3004',
    ai: 'http://ai-agent-service:3005',
};

// Yönlendirme kuralları
app.use('/api/v1/admin', createProxyMiddleware({ target: services.admin, changeOrigin: true, pathRewrite: {'^/api/v1/admin' : ''} }));
app.use('/api/v1/search', createProxyMiddleware({ target: services.search, changeOrigin: true, pathRewrite: {'^/api/v1/search' : ''} }));
app.use('/api/v1/booking', createProxyMiddleware({ target: services.booking, changeOrigin: true, pathRewrite: {'^/api/v1/booking' : ''} }));
app.use('/api/v1/comments', createProxyMiddleware({ target: services.comments, changeOrigin: true, pathRewrite: {'^/api/v1/comments' : ''} }));
app.use('/api/v1/ai', createProxyMiddleware({ target: services.ai, changeOrigin: true, pathRewrite: {'^/api/v1/ai' : ''} }));


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API Gateway listening on port ${PORT}`);
}); 