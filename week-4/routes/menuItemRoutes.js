import express from 'express';
import {
    getMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
} from '../controllers/menuItemController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { menuItemSchema, validate } from '../validation.js';

const router = express.Router();

router.route('/')
    .get(getMenuItems)
    .post(protect, authorize('restaurant_owner', 'admin'), validate(menuItemSchema), createMenuItem);

router.route('/:id')
    .get(getMenuItemById)
    .put(protect, authorize('restaurant_owner', 'admin'), validate(menuItemSchema.partial()), updateMenuItem)
    .delete(protect, authorize('restaurant_owner', 'admin'), deleteMenuItem);

export default router;
