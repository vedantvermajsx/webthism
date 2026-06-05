const { z } = require('zod');

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['user', 'admin']).optional()
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

const productSchema = z.object({
    name: z.string().min(3, 'Product name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().positive('Price must be positive'),
    category: z.string(), 
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    images: z.array(z.object({ url: z.string(), public_id: z.string() })).optional()
});

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            errors: error.errors.map(err => ({ field: err.path[0], message: err.message }))
        });
    }
};

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    productSchema
};
