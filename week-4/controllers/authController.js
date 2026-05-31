import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { z } from 'zod';

const signupSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['customer', 'restaurant_owner', 'admin']).optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d'
    });
};

export const signup = async (req, res) => {
    try {
        const validatedData = signupSchema.parse(req.body);
        const { name, email, password, role } = validatedData;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role
        });

        res.status(201).json({
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Invalid user data' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await User.findOne({ email });
        if (user && (await user.comparePassword(password))) {
            res.json({
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message || 'Invalid login data' });
    }
};
