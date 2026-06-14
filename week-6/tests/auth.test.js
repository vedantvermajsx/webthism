const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

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

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe('Auth Endpoints', () => {
    const testUser = { name: 'Test User', email: 'test@test.com', password: 'password123' };

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app).post('/api/auth/register').send(testUser);
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject duplicate email', async () => {
            await request(app).post('/api/auth/register').send(testUser);
            const res = await request(app).post('/api/auth/register').send(testUser);
            expect(res.status).toBe(400);
        });

        it('should reject invalid email', async () => {
            const res = await request(app).post('/api/auth/register').send({ ...testUser, email: 'invalid' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            await request(app).post('/api/auth/register').send(testUser);
            const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        it('should reject invalid password', async () => {
            await request(app).post('/api/auth/register').send(testUser);
            const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'wrong' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user', async () => {
            const reg = await request(app).post('/api/auth/register').send(testUser);
            const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });
    });
});
