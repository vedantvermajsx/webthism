const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        metadata,
        payment_method_types: ['card']
    });
    return paymentIntent;
};

const retrievePaymentIntent = async (paymentIntentId) => {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
};

module.exports = { stripe, createPaymentIntent, retrievePaymentIntent };
