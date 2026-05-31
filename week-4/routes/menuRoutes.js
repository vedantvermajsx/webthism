import express from 'express';
import {
    getMenus,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu
} from '../controllers/menuController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { menuSchema, validate } from '../validation.js';

const router = express.Router();

router.route('/')
    .get(getMenus)
    .post(protect, authorize('restaurant_owner', 'admin'), validate(menuSchema), createMenu);

router.route('/:id')
    .get(getMenuById)
    .put(protect, authorize('restaurant_owner', 'admin'), validate(menuSchema.partial()), updateMenu)
    .delete(protect, authorize('restaurant_owner', 'admin'), deleteMenu);

export default router;
