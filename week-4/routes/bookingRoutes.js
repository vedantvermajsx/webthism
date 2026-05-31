import express from 'express';
import {
    getBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { bookingSchema, validate } from '../validation.js';

const router = express.Router();

router.route('/')
    .get(protect, getBookings)
    .post(protect, validate(bookingSchema), createBooking);

router.route('/:id')
    .get(protect, getBookingById)
    .put(protect, validate(bookingSchema.partial()), updateBooking)
    .delete(protect, deleteBooking);

export default router;
