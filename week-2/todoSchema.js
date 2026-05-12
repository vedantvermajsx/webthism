import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid MongoDB ObjectId',
});

export const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  user: objectIdSchema,
  completed: z.boolean().optional().default(false)
});

export const updateTodoSchema = todoSchema.partial().omit({ user: true });
