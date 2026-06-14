const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let adminToken;
let categoryId;

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
    categoryId = catRes.body.category._id;
});

const testProduct = () => ({
    name: 'Test Product',
    description: 'A test product description that is long enough',
    price: 99.99,
    category: categoryId,
    stock: 50
});

describe('Product Endpoints', () => {
    describe('POST /api/products', () => {
        it('should create a product as admin', async () => {
            const res = await request(app).post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(testProduct());
            expect(res.status).toBe(201);
            expect(res.body.product.name).toBe('Test Product');
        });

        it('should reject without auth', async () => {
            const res = await request(app).post('/api/products').send(testProduct());
            expect(res.status).toBe(401);
        });

        it('should reject non-admin', async () => {
            const userRes = await request(app).post('/api/auth/register').send({
                name: 'User', email: 'user@test.com', password: 'password123'
            });
            const res = await request(app).post('/api/products')
                .set('Authorization', `Bearer ${userRes.body.token}`)
                .send(testProduct());
            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/products', () => {
        it('should return products', async () => {
            await request(app).post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(testProduct());
            const res = await request(app).get('/api/products');
            expect(res.status).toBe(200);
            expect(res.body.products.length).toBe(1);
        });

        it('should paginate', async () => {
            for (let i = 0; i < 3; i++) {
                await request(app).post('/api/products')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ ...testProduct(), name: `Product ${i}` });
            }
            const res = await request(app).get('/api/products?limit=2&page=1');
            expect(res.body.products.length).toBe(2);
            expect(res.body.pages).toBe(2);
        });
    });

    describe('GET /api/products/:id', () => {
        it('should return a single product', async () => {
            const created = await request(app).post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(testProduct());
            const res = await request(app).get(`/api/products/${created.body.product._id}`);
            expect(res.status).toBe(200);
            expect(res.body.product.name).toBe('Test Product');
        });
    });

    describe('PUT /api/products/:id', () => {
        it('should update a product', async () => {
            const created = await request(app).post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(testProduct());
            const res = await request(app).put(`/api/products/${created.body.product._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ price: 149.99 });
            expect(res.status).toBe(200);
            expect(res.body.product.price).toBe(149.99);
        });
    });

    describe('DELETE /api/products/:id', () => {
        it('should delete a product', async () => {
            const created = await request(app).post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(testProduct());
            const res = await request(app).delete(`/api/products/${created.body.product._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });
});
