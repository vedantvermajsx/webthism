import Menu from '../models/Menu.js';
import Restaurant from '../models/Restaurant.js';

export const getMenus = async (req, res, next) => {
    try {
        const { restaurantId } = req.query;
        const query = restaurantId ? { restaurant: restaurantId } : {};
        const menus = await Menu.find(query).populate('restaurant', 'name');
        res.json(menus);
    } catch (error) {
        next(error);
    }
};

export const getMenuById = async (req, res, next) => {
    try {
        const menu = await Menu.findById(req.params.id).populate('restaurant', 'name');
        if (!menu) {
            res.status(404);
            throw new Error('Menu not found');
        }
        res.json(menu);
    } catch (error) {
        next(error);
    }
};

export const createMenu = async (req, res, next) => {
    try {
        const { restaurant, ...menuData } = req.body;
        const restaurantDoc = await Restaurant.findById(restaurant);
        if (!restaurantDoc) {
            res.status(404);
            throw new Error('Restaurant not found');
        }
        if (restaurantDoc.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to add menu to this restaurant');
        }
        const menu = new Menu({ restaurant, ...menuData });
        const createdMenu = await menu.save();
        res.status(201).json(createdMenu);
    } catch (error) {
        next(error);
    }
};

export const updateMenu = async (req, res, next) => {
    try {
        const menu = await Menu.findById(req.params.id).populate('restaurant');
        if (!menu) {
            res.status(404);
            throw new Error('Menu not found');
        }
        if (menu.restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this menu');
        }
        const updatedMenu = await Menu.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(updatedMenu);
    } catch (error) {
        next(error);
    }
};

export const deleteMenu = async (req, res, next) => {
    try {
        const menu = await Menu.findById(req.params.id).populate('restaurant');
        if (!menu) {
            res.status(404);
            throw new Error('Menu not found');
        }
        if (menu.restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this menu');
        }
        await Menu.findByIdAndDelete(req.params.id);
        res.json({ message: 'Menu removed' });
    } catch (error) {
        next(error);
    }
};
