import { z } from 'zod';

export const restaurantSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    contact: z.string().min(1, 'Contact is required'),
    description: z.string().optional()
});

export const menuSchema = z.object({
    restaurant: z.string().min(1, 'Restaurant ID is required'),
    name: z.string().min(1, 'Name is required')
});

export const menuItemSchema = z.object({
    menu: z.string().min(1, 'Menu ID is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be a positive number'),
    category: z.string().optional(),
    isAvailable: z.boolean().optional()
});

export const bookingSchema = z.object({
    restaurant: z.string().min(1, 'Restaurant ID is required'),
    date: z.string().or(z.date()),
    time: z.string().min(1, 'Time is required'),
    guests: z.number().min(1, 'At least 1 guest is required'),
    specialRequests: z.string().optional()
});

export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        res.status(400);
        next(new Error(error.errors.map(e => e.message).join(', ')));
    }
};
