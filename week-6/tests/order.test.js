const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let userToken;
let adminToken;
let productId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'testsecret';
    process.env.NODE_ENV = 'test';
    await mongoose.connect(process.env.MONGODB_URI);
    app = require('../index');
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    const adminRes = await request(app).post('/api/auth/register').send({
        name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin'
    });
    adminToken = adminRes.body.token;

    const catRes = await request(app).post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Electronics', description: 'Electronic items' });

    const prodRes = await request(app).post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: 'Test Product',
            description: 'A test product with enough description',
            price: 29.99,
            category: catRes.body.category._id,
            stock: 100
        });
    productId = prodRes.body.product._id;

    const userRes = await request(app).post('/api/auth/register').send({
        name: 'User', email: 'user@test.com', password: 'password123'
    });
    userToken = userRes.body.token;

    await request(app).post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId, quantity: 2 });
});

const shippingAddress = {
    address: '123 Main St',
    city: 'Springfield',
    postalCode: '62704',
    country: 'US'
};

describe('Order Endpoints', () => {
    describe('POST /api/orders', () => {
        it('should create an order from cart', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            expect(res.status).toBe(201);
            expect(res.body.order.orderItems).toHaveLength(1);
            expect(res.body.order.totalPrice).toBe(59.98);
            expect(res.body.order.status).toBe('Processing');
        });

        it('should reject empty cart', async () => {
            await request(app).delete('/api/cart')
                .set('Authorization', `Bearer ${userToken}`);
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            expect(res.status).toBe(400);
        });

        it('should clear cart after order', async () => {
            await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const cartRes = await request(app).get('/api/cart')
                .set('Authorization', `Bearer ${userToken}`);
            expect(cartRes.body.cart.items).toHaveLength(0);
        });
    });

    describe('GET /api/orders', () => {
        it('should return user orders', async () => {
            await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).get('/api/orders')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
            expect(res.body.orders).toHaveLength(1);
        });
    });

    describe('GET /api/orders/:id', () => {
        it('should return order details', async () => {
            const orderRes = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).get(`/api/orders/${orderRes.body.order._id}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
            expect(res.body.order.shippingAddress.city).toBe('Springfield');
        });
    });

    describe('PUT /api/orders/:id/pay', () => {
        it('should confirm payment', async () => {
            const orderRes = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).put(`/api/orders/${orderRes.body.order._id}/pay`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
            expect(res.body.order.isPaid).toBe(true);
            expect(res.body.order.status).toBe('Confirmed');
        });
    });

    describe('PUT /api/orders/:id/status', () => {
        it('should update status as admin', async () => {
            const orderRes = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).put(`/api/orders/${orderRes.body.order._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'Shipped', trackingNumber: 'TRK123' });
            expect(res.status).toBe(200);
            expect(res.body.order.status).toBe('Shipped');
            expect(res.body.order.trackingNumber).toBe('TRK123');
        });

        it('should reject non-admin', async () => {
            const orderRes = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).put(`/api/orders/${orderRes.body.order._id}/status`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ status: 'Shipped' });
            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/orders/:id/cancel', () => {
        it('should cancel order and restore stock', async () => {
            const orderRes = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).put(`/api/orders/${orderRes.body.order._id}/cancel`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: 'Changed my mind' });
            expect(res.status).toBe(200);
            expect(res.body.order.status).toBe('Cancelled');
        });
    });

    describe('GET /api/orders/admin/all', () => {
        it('should return all orders for admin', async () => {
            await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress });
            const res = await request(app).get('/api/orders/admin/all')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.orders).toHaveLength(1);
        });

        it('should reject non-admin', async () => {
            const res = await request(app).get('/api/orders/admin/all')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(403);
        });
    });
});
