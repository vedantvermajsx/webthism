import MenuItem from '../models/MenuItem.js';
import Menu from '../models/Menu.js';
import Restaurant from '../models/Restaurant.js';

export const getMenuItems = async (req, res, next) => {
    try {
        const { menuId } = req.query;
        const query = menuId ? { menu: menuId } : {};
        const menuItems = await MenuItem.find(query).populate('menu', 'name restaurant');
        res.json(menuItems);
    } catch (error) {
        next(error);
    }
};

export const getMenuItemById = async (req, res, next) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id).populate('menu', 'name restaurant');
        if (!menuItem) {
            res.status(404);
            throw new Error('Menu item not found');
        }
        res.json(menuItem);
    } catch (error) {
        next(error);
    }
};

export const createMenuItem = async (req, res, next) => {
    try {
        const { menu, ...itemData } = req.body;
        const menuDoc = await Menu.findById(menu).populate('restaurant');
        if (!menuDoc) {
            res.status(404);
            throw new Error('Menu not found');
        }
        if (menuDoc.restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to add item to this menu');
        }
        const menuItem = new MenuItem({ menu, ...itemData });
        const createdMenuItem = await menuItem.save();
        res.status(201).json(createdMenuItem);
    } catch (error) {
        next(error);
    }
};

export const updateMenuItem = async (req, res, next) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id).populate({
            path: 'menu',
            populate: { path: 'restaurant' }
        });
        if (!menuItem) {
            res.status(404);
            throw new Error('Menu item not found');
        }
        if (menuItem.menu.restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this menu item');
        }
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(updatedMenuItem);
    } catch (error) {
        next(error);
    }
};

export const deleteMenuItem = async (req, res, next) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id).populate({
            path: 'menu',
            populate: { path: 'restaurant' }
        });
        if (!menuItem) {
            res.status(404);
            throw new Error('Menu item not found');
        }
        if (menuItem.menu.restaurant.owner.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this menu item');
        }
        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Menu item removed' });
    } catch (error) {
        next(error);
    }
};
