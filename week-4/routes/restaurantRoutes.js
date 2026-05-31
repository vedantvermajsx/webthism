import express from 'express';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant
} from '../controllers/restaurantController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { restaurantSchema, validate } from '../validation.js';

const router = express.Router();

router.route('/')
    .get(getRestaurants)
    .post(protect, authorize('restaurant_owner', 'admin'), validate(restaurantSchema), createRestaurant);

router.route('/:id')
    .get(getRestaurantById)
    .put(protect, authorize('restaurant_owner', 'admin'), validate(restaurantSchema.partial()), updateRestaurant)
    .delete(protect, authorize('restaurant_owner', 'admin'), deleteRestaurant);

export default router;
