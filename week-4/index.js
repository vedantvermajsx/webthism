import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db.js';
import swaggerUi from 'swagger-ui-express';
import specs from './swagger.js';
import authRoutes from './routes/authRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import menuItemRoutes from './routes/menuItemRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

connectDB();

const app = express();

app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get('/', (req, res) => {
    res.send('Restaurant API is running...');
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
