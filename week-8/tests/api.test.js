const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
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

// ─── Lead Endpoints ──────────────────────────────────────────────────────────
describe('POST /api/leads — Create Lead (public)', () => {
    it('should create a lead with valid data', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({ firstName: 'Jane', email: 'jane@example.com', company: 'Acme' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe('jane@example.com');
        expect(res.body.data.status).toBe('new');
        expect(res.body.data.source).toBe('manual');
    });

    it('should reject a lead with missing email', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({ firstName: 'Jane' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should reject a lead with invalid email', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({ firstName: 'Jane', email: 'not-an-email' });

        expect(res.status).toBe(400);
        expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
    });

    it('should reject a lead with invalid score (>100)', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({ firstName: 'Jane', email: 'jane@example.com', score: 150 });

        expect(res.status).toBe(400);
    });

    it('should reject a lead with an invalid source enum value', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({ firstName: 'Jane', email: 'jane@example.com', source: 'unknown_source' });

        expect(res.status).toBe(400);
    });

    it('should capture UTM params from query string', async () => {
        const res = await request(app)
            .post('/api/leads?utm_source=google&utm_medium=cpc&utm_campaign=summer')
            .send({ firstName: 'Jane', email: 'jane@example.com' });

        expect(res.status).toBe(201);
        expect(res.body.data.metadata.utmSource).toBe('google');
        expect(res.body.data.metadata.utmMedium).toBe('cpc');
        expect(res.body.data.metadata.utmCampaign).toBe('summer');
    });

    it('should strip HTML from firstName', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({ firstName: '<script>alert("xss")</script>Jane', email: 'jane@example.com' });

        expect(res.status).toBe(201);
        expect(res.body.data.firstName).not.toContain('<script>');
    });
});

// ─── Campaign Endpoints ───────────────────────────────────────────────────────
describe('POST /api/campaigns', () => {
    it('should reject without auth', async () => {
        const res = await request(app)
            .post('/api/campaigns')
            .send({ name: 'Test Campaign', type: 'email' });

        expect(res.status).toBe(401);
    });

    it('should reject a campaign without required type', async () => {
        // Even without auth the Zod validation runs first in some middleware stacks,
        // but here auth runs first on campaigns
        const res = await request(app)
            .post('/api/campaigns')
            .send({ name: 'No Type Campaign' });

        expect(res.status).toBe(401);
    });
});

// ─── Form Submission ─────────────────────────────────────────────────────────
describe('POST /api/forms/:id/submit — Form Submission (public)', () => {
    let formId;

    beforeEach(async () => {
        const Form = require('../models/Form');
        const form = await Form.create({
            name: 'Test Form',
            fields: [
                { name: 'first_name', label: 'First Name', type: 'text', required: true, order: 0 },
                { name: 'email', label: 'Email', type: 'email', required: true, order: 1 },
                { name: 'company', label: 'Company', type: 'text', required: false, order: 2 }
            ]
        });
        formId = form._id.toString();
    });

    it('should create a lead from a valid form submission', async () => {
        const res = await request(app)
            .post(`/api/forms/${formId}/submit`)
            .send({ first_name: 'John', email: 'john@example.com', company: 'Acme' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.leadId).toBeDefined();
    });

    it('should fail if required fields are missing', async () => {
        const res = await request(app)
            .post(`/api/forms/${formId}/submit`)
            .send({ company: 'Acme' }); // missing required first_name and email

        expect(res.status).toBe(400);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should fail with invalid email in submission', async () => {
        const res = await request(app)
            .post(`/api/forms/${formId}/submit`)
            .send({ first_name: 'John', email: 'not-valid' });

        expect(res.status).toBe(400);
        expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
    });

    it('should return 404 for a non-existent form', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .post(`/api/forms/${fakeId}/submit`)
            .send({ first_name: 'John', email: 'john@example.com' });

        expect(res.status).toBe(404);
    });

    it('should increment form submissionCount after a valid submission', async () => {
        const Form = require('../models/Form');
        await request(app)
            .post(`/api/forms/${formId}/submit`)
            .send({ first_name: 'John', email: 'john@example.com' });

        const form = await Form.findById(formId);
        expect(form.submissionCount).toBe(1);
    });
});

// ─── Sanitization ─────────────────────────────────────────────────────────────
describe('Input Sanitization', () => {
    it('should sanitize XSS in company field', async () => {
        const res = await request(app)
            .post('/api/leads')
            .send({
                firstName: 'Safe Name',
                email: 'safe@example.com',
                company: '<img src=x onerror=alert(1)>Legit Co'
            });

        expect(res.status).toBe(201);
        expect(res.body.data.company).not.toContain('<img');
    });
});

// ─── Week 8: Bulk Operations ──────────────────────────────────────────────────
describe('PATCH /api/leads/bulk/update', () => {
    let token;

    beforeEach(async () => {
        const userPayload = { id: 'user123', role: 'admin' };
        const jwt = require('jsonwebtoken');
        token = jwt.sign(userPayload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    });

    it('should bulk update lead status', async () => {
        const lead1 = await request(app).post('/api/leads').send({ firstName: 'A', email: 'a@test.com' });
        const lead2 = await request(app).post('/api/leads').send({ firstName: 'B', email: 'b@test.com' });

        const res = await request(app)
            .patch('/api/leads/bulk/update')
            .set('Authorization', `Bearer ${token}`)
            .send({
                ids: [lead1.body.data._id, lead2.body.data._id],
                update: { status: 'contacted' }
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.modified).toBe(2);
    });

    it('should reject bulk update with empty ids', async () => {
        const res = await request(app)
            .patch('/api/leads/bulk/update')
            .set('Authorization', `Bearer ${token}`)
            .send({ ids: [], update: { status: 'contacted' } });

        expect(res.status).toBe(400);
    });

    it('should reject bulk update more than 100 leads', async () => {
        const ids = Array.from({ length: 101 }, () => new (require('mongoose').Types.ObjectId)().toString());
        const res = await request(app)
            .patch('/api/leads/bulk/update')
            .set('Authorization', `Bearer ${token}`)
            .send({ ids, update: { status: 'contacted' } });

        expect(res.status).toBe(400);
    });
});

// ─── Week 8: Tag Management ───────────────────────────────────────────────────
describe('PATCH /api/leads/:id/tags', () => {
    let token;

    beforeEach(async () => {
        const jwt = require('jsonwebtoken');
        token = jwt.sign({ id: 'user123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    });

    it('should add tags to a lead', async () => {
        const created = await request(app).post('/api/leads').send({ firstName: 'Tag', email: 'tag@test.com' });
        const id = created.body.data._id;

        const res = await request(app)
            .patch(`/api/leads/${id}/tags`)
            .set('Authorization', `Bearer ${token}`)
            .send({ action: 'add', tags: ['vip', 'enterprise'] });

        expect(res.status).toBe(200);
        expect(res.body.data.tags).toContain('vip');
        expect(res.body.data.tags).toContain('enterprise');
    });

    it('should remove tags from a lead', async () => {
        const created = await request(app).post('/api/leads').send({ firstName: 'Tag2', email: 'tag2@test.com', tags: ['vip', 'old'] });
        const id = created.body.data._id;

        const res = await request(app)
            .patch(`/api/leads/${id}/tags`)
            .set('Authorization', `Bearer ${token}`)
            .send({ action: 'remove', tags: ['old'] });

        expect(res.status).toBe(200);
        expect(res.body.data.tags).not.toContain('old');
    });

    it('should reject invalid action', async () => {
        const created = await request(app).post('/api/leads').send({ firstName: 'Tag3', email: 'tag3@test.com' });
        const id = created.body.data._id;

        const res = await request(app)
            .patch(`/api/leads/${id}/tags`)
            .set('Authorization', `Bearer ${token}`)
            .send({ action: 'invalid', tags: ['vip'] });

        expect(res.status).toBe(400);
    });
});

// ─── Week 8: Health Check ─────────────────────────────────────────────────────
describe('GET /health', () => {
    it('should return health status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.database).toBe('connected');
        expect(res.body.memory).toBeDefined();
    });
});

// ─── Week 8: Job Stats ────────────────────────────────────────────────────────
describe('GET /api/leads/job-stats', () => {
    it('should return queue stats when authenticated', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: 'u1', role: 'admin' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

        const res = await request(app)
            .get('/api/leads/job-stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.leadQueue).toBeDefined();
        expect(res.body.data.emailQueue).toBeDefined();
    });
});
