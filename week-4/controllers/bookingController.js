import Booking from '../models/Booking.js';
import Restaurant from '../models/Restaurant.js';

export const getBookings = async (req, res, next) => {
    try {
        let query = {};
        if (req.user.role === 'customer') {
            query.customer = req.user._id;
        } else if (req.user.role === 'restaurant_owner') {
            const restaurants = await Restaurant.find({ owner: req.user._id });
            const restaurantIds = restaurants.map(r => r._id);
            query.restaurant = { $in: restaurantIds };
        }
        const bookings = await Booking.find(query)
            .populate('restaurant', 'name address')
            .populate('customer', 'name email');
        res.json(bookings);
    } catch (error) {
        next(error);
    }
};

export const getBookingById = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('restaurant', 'name address')
            .populate('customer', 'name email');
        if (!booking) {
            res.status(404);
            throw new Error('Booking not found');
        }
        if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to view this booking');
        }
        if (req.user.role === 'restaurant_owner') {
            const restaurant = await Restaurant.findById(booking.restaurant._id);
            if (restaurant.owner.toString() !== req.user._id.toString()) {
                res.status(403);
                throw new Error('Not authorized to view this booking');
            }
        }
        res.json(booking);
    } catch (error) {
        next(error);
    }
};

export const createBooking = async (req, res, next) => {
    try {
        const booking = new Booking({
            ...req.body,
            customer: req.user._id
        });
        const createdBooking = await booking.save();
        await createdBooking.populate('restaurant', 'name address');
        await createdBooking.populate('customer', 'name email');
        res.status(201).json(createdBooking);
    } catch (error) {
        next(error);
    }
};

export const updateBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            res.status(404);
            throw new Error('Booking not found');
        }
        if (booking.customer.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this booking');
        }
        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('restaurant', 'name address').populate('customer', 'name email');
        res.json(updatedBooking);
    } catch (error) {
        next(error);
    }
};

export const deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            res.status(404);
            throw new Error('Booking not found');
        }
        if (booking.customer.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this booking');
        }
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking cancelled' });
    } catch (error) {
        next(error);
    }
};
