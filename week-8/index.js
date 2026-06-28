const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
    req.id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const start = Date.now();
    res.on('finish', () => {
        logger.info('HTTP request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            ms: Date.now() - start,
            ip: req.ip,
            reqId: req.id
        });
    });
    next();
});

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const captureLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { success: false, message: 'Too many submissions. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(globalLimiter);
app.use('/api/leads', captureLimit);
app.use('/api/forms/:id/submit', captureLimit);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('MongoDB Connected');

        if (process.env.NODE_ENV !== 'test') {
            const { setupCronJobs } = require('./jobs/leadJobs');
            setupCronJobs();
        }
    } catch (err) {
        logger.error('Database connection error', { error: err.message });
        process.exit(1);
    }
};

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

app.get('/', (req, res) => {
    res.json({
        message: 'Lead Generation Service API',
        version: '2.0.0',
        docs: '/api-docs',
        health: '/health',
        endpoints: {
            leads: '/api/leads',
            contacts: '/api/contacts',
            forms: '/api/forms',
            campaigns: '/api/campaigns'
        }
    });
});

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState];
    const healthy = dbState === 1;

    res.status(healthy ? 200 : 503).json({
        success: healthy,
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: dbStatus,
        memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
    });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/leads',     require('./routes/leads'));
app.use('/api/contacts',  require('./routes/contacts'));
app.use('/api/forms',     require('./routes/forms'));
app.use('/api/campaigns', require('./routes/campaigns'));

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, reqId: req.id, url: req.originalUrl });
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Docs available at http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;
