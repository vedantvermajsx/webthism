const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price stock images');
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }
        const totalPrice = cart.items.reduce((sum, item) => {
            if (item.product) {
                return sum + item.product.price * item.quantity;
            }
            return sum;
        }, 0);
        res.json({ success: true, cart, totalPrice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }

        const existingItem = cart.items.find(item => item.product.toString() === productId);

        if (existingItem) {
            const newQty = existingItem.quantity + quantity;
            if (newQty > product.stock) {
                return res.status(400).json({ success: false, message: 'Insufficient stock' });
            }
            existingItem.quantity = newQty;
        } else {
            cart.items.push({ product: productId, quantity });
        }

        await cart.save();
        await cart.populate('items.product', 'name price stock images');

        res.status(200).json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (quantity > product.stock) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.product.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not in cart' });
        }

        if (quantity <= 0) {
            cart.items = cart.items.filter(item => item.product.toString() !== productId);
        } else {
            item.quantity = quantity;
        }

        await cart.save();
        await cart.populate('items.product', 'name price stock images');

        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();
        await cart.populate('items.product', 'name price stock images');

        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = [];
        await cart.save();

        res.json({ success: true, message: 'Cart cleared', cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
