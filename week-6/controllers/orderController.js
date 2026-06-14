const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { createPaymentIntent, retrievePaymentIntent } = require('../utils/stripe');
const { sendOrderConfirmation, sendPaymentConfirmation, sendShippingUpdate, sendDeliveryConfirmation } = require('../utils/email');

exports.createOrder = async (req, res) => {
    try {
        const { shippingAddress } = req.body;

        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        for (const item of cart.items) {
            if (!item.product) {
                return res.status(400).json({ success: false, message: 'Product no longer exists' });
            }
            if (item.product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.product.name}`
                });
            }
        }

        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.images?.[0]?.url || ''
        }));

        const totalPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        let stripePaymentIntentId;
        try {
            const paymentIntent = await createPaymentIntent(totalPrice, 'usd', {
                userId: req.user.id
            });
            stripePaymentIntentId = paymentIntent.id;
        } catch (stripeError) {
            console.error('Stripe error:', stripeError.message);
        }

        const order = await Order.create({
            user: req.user.id,
            orderItems,
            shippingAddress,
            paymentMethod: 'stripe',
            totalPrice,
            stripePaymentIntentId,
            statusHistory: [{ status: 'Processing', note: 'Order placed' }]
        });

        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { stock: -item.quantity }
            });
        }

        cart.items = [];
        await cart.save();

        const user = await User.findById(req.user.id);
        try {
            await sendOrderConfirmation(order, user.email);
        } catch (emailError) {
            console.error('Order confirmation email failed:', emailError.message);
        }

        res.status(201).json({
            success: true,
            order,
            clientSecret: stripePaymentIntentId ? `pi_simulated_secret_${stripePaymentIntentId}` : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = { user: req.user.id };
        if (status) query.status = status;

        const orders = await Order.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('orderItems.product', 'name price');

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            count: orders.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: Number(page),
            orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('orderItems.product', 'name price images')
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (order.isPaid) {
            return res.status(400).json({ success: false, message: 'Order already paid' });
        }

        if (order.stripePaymentIntentId) {
            try {
                const paymentIntent = await retrievePaymentIntent(order.stripePaymentIntentId);
                if (paymentIntent.status !== 'succeeded') {
                    return res.status(400).json({ success: false, message: 'Payment not completed' });
                }
            } catch (stripeError) {
                console.error('Stripe verification error:', stripeError.message);
            }
        }

        order.isPaid = true;
        order.paidAt = Date.now();
        order.status = 'Confirmed';
        order.statusHistory.push({ status: 'Confirmed', note: 'Payment received' });

        await order.save();

        const user = await User.findById(order.user);
        try {
            await sendPaymentConfirmation(order, user.email);
        } catch (emailError) {
            console.error('Payment confirmation email failed:', emailError.message);
        }

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, trackingNumber, note } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Cannot update cancelled order' });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ success: false, message: 'Order already delivered' });
        }

        order.status = status;
        order.statusHistory.push({ status, note: note || `Status changed to ${status}` });

        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }

        if (status === 'Delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }

        await order.save();

        const user = await User.findById(order.user);
        try {
            if (status === 'Shipped') {
                await sendShippingUpdate(order, user.email);
            } else if (status === 'Delivered') {
                await sendDeliveryConfirmation(order, user.email);
            }
        } catch (emailError) {
            console.error('Status update email failed:', emailError.message);
        }

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (['Shipped', 'Delivered'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Cannot cancel shipped/delivered order' });
        }

        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity }
            });
        }

        order.status = 'Cancelled';
        order.statusHistory.push({ status: 'Cancelled', note: req.body.reason || 'Cancelled by user' });
        await order.save();

        res.json({ success: true, message: 'Order cancelled', order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = {};
        if (status) query.status = status;

        const orders = await Order.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('user', 'name email')
            .populate('orderItems.product', 'name price');

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            count: orders.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: Number(page),
            orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
