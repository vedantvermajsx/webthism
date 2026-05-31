import Restaurant from '../models/Restaurant.js';

export const getRestaurants = async (req, res, next) => {
    try {
        const restaurants = await Restaurant.find().populate('owner', 'name email');
        res.json(restaurants);
    } catch (error) {
        next(error);
    }
};

export const getRestaurantById = async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name email');
        if (!restaurant) {
            res.status(404);
            throw new Error('Restaurant not found');
        }
        res.json(restaurant);
    } catch (error) {
        next(error);
    }
};

export const createRestaurant = async (req, res, next) => {
    try {
        const restaurant = new Restaurant({
            ...req.body,
            owner: req.user._id
        });
        const createdRestaurant = await restaurant.save();
        res.status(201).json(createdRestaurant);
    } catch (error) {
        next(error);
    }
};

export const updateRestaurant = async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            res.status(404);
            throw new Error('Restaurant not found');
        }
        if (restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this restaurant');
        }
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(updatedRestaurant);
    } catch (error) {
        next(error);
    }
};

export const deleteRestaurant = async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            res.status(404);
            throw new Error('Restaurant not found');
        }
        if (restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this restaurant');
        }
        await Restaurant.findByIdAndDelete(req.params.id);
        res.json({ message: 'Restaurant removed' });
    } catch (error) {
        next(error);
    }
};
