const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let userToken;
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

    const catRes = await request(app).post('/api/categories')
        .set('Authorization', `Bearer ${adminRes.body.token}`)
        .send({ name: 'Electronics', description: 'Electronic items' });

    const prodRes = await request(app).post('/api/products')
        .set('Authorization', `Bearer ${adminRes.body.token}`)
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
});

describe('Cart Endpoints', () => {
    describe('GET /api/cart', () => {
        it('should return empty cart', async () => {
            const res = await request(app).get('/api/cart')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
            expect(res.body.cart.items).toHaveLength(0);
        });
    });

    describe('POST /api/cart', () => {
        it('should add item to cart', async () => {
            const res = await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 2 });
            expect(res.status).toBe(200);
            expect(res.body.cart.items).toHaveLength(1);
            expect(res.body.cart.items[0].quantity).toBe(2);
        });

        it('should increment quantity for existing item', async () => {
            await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 2 });
            const res = await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 3 });
            expect(res.body.cart.items[0].quantity).toBe(5);
        });

        it('should reject insufficient stock', async () => {
            const res = await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 999 });
            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/cart/:productId', () => {
        it('should update item quantity', async () => {
            await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 2 });
            const res = await request(app).put(`/api/cart/${productId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ quantity: 5 });
            expect(res.status).toBe(200);
            expect(res.body.cart.items[0].quantity).toBe(5);
        });
    });

    describe('DELETE /api/cart/:productId', () => {
        it('should remove item from cart', async () => {
            await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 2 });
            const res = await request(app).delete(`/api/cart/${productId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
            expect(res.body.cart.items).toHaveLength(0);
        });
    });

    describe('DELETE /api/cart', () => {
        it('should clear the cart', async () => {
            await request(app).post('/api/cart')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 2 });
            const res = await request(app).delete('/api/cart')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.status).toBe(200);
            expect(res.body.cart.items).toHaveLength(0);
        });
    });
});
