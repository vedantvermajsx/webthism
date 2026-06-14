const nodemailer = require('nodemailer');

let transporter;

const getTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }
    return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
    try {
        const t = await getTransporter();
        const info = await t.sendMail({
            from: process.env.EMAIL_FROM || '"E-Commerce Store" <noreply@ecommerce.com>',
            to,
            subject,
            html
        });
        if (process.env.NODE_ENV !== 'production') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return info;
    } catch (error) {
        console.error('Email send failed:', error.message);
        throw error;
    }
};

const sendOrderConfirmation = async (order, userEmail) => {
    const itemsHtml = order.orderItems.map(item =>
        `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${item.price.toFixed(2)}</td></tr>`
    ).join('');

    await sendEmail({
        to: userEmail,
        subject: `Order Confirmation - #${order._id}`,
        html: `
            <h2>Order Confirmed</h2>
            <p>Your order <strong>#${order._id}</strong> has been placed.</p>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
                ${itemsHtml}
            </table>
            <p><strong>Total: $${order.totalPrice.toFixed(2)}</strong></p>
            <h3>Shipping Address</h3>
            <p>${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}</p>
        `
    });
};

const sendPaymentConfirmation = async (order, userEmail) => {
    await sendEmail({
        to: userEmail,
        subject: `Payment Received - Order #${order._id}`,
        html: `
            <h2>Payment Confirmed</h2>
            <p>We have received your payment of <strong>$${order.totalPrice.toFixed(2)}</strong> for order <strong>#${order._id}</strong>.</p>
            <p>Your order is now being processed.</p>
        `
    });
};

const sendShippingUpdate = async (order, userEmail) => {
    await sendEmail({
        to: userEmail,
        subject: `Shipping Update - Order #${order._id}`,
        html: `
            <h2>Order Shipped</h2>
            <p>Your order <strong>#${order._id}</strong> has been shipped.</p>
            ${order.trackingNumber ? `<p>Tracking Number: <strong>${order.trackingNumber}</strong></p>` : ''}
            <p>Current Status: <strong>${order.status}</strong></p>
        `
    });
};

const sendDeliveryConfirmation = async (order, userEmail) => {
    await sendEmail({
        to: userEmail,
        subject: `Order Delivered - #${order._id}`,
        html: `
            <h2>Order Delivered</h2>
            <p>Your order <strong>#${order._id}</strong> has been delivered.</p>
            <p>Thank you for shopping with us!</p>
        `
    });
};

module.exports = {
    sendEmail,
    sendOrderConfirmation,
    sendPaymentConfirmation,
    sendShippingUpdate,
    sendDeliveryConfirmation
};
