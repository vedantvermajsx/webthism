const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true }
    },
    paymentMethod: {
        type: String,
        required: true,
        default: 'stripe'
    },
    stripePaymentIntentId: {
        type: String
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false
    },
    paidAt: Date,
    isDelivered: {
        type: Boolean,
        required: true,
        default: false
    },
    deliveredAt: Date,
    trackingNumber: {
        type: String
    },
    status: {
        type: String,
        required: true,
        enum: ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Processing'
    },
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
