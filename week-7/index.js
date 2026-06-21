const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

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
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
};

connectDB();

app.get('/', (req, res) => {
    res.json({
        message: 'Lead Generation Service API (Week 7)',
        version: '1.0.0',
        docs: '/api-docs',
        endpoints: {
            leads: '/api/leads',
            contacts: '/api/contacts',
            forms: '/api/forms',
            campaigns: '/api/campaigns'
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
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Docs: http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;
