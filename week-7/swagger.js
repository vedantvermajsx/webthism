const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Lead Generation Service API',
            version: '1.0.0',
            description: `
## Week 7 — Lead Generation Service API

A production-ready REST API for capturing and managing leads across forms, campaigns, and contacts.

### Key Features
- **Lead Capture** — Public endpoint to create leads from any source
- **Form Engine** — Dynamic forms with custom fields and auto lead creation on submission
- **Campaign Tracking** — Track lead sources and conversion metrics per campaign
- **Contact Management** — Manage qualified contacts and link them to leads
- **Sanitization** — XSS protection on all free-text inputs
- **Rate Limiting** — Stricter limits on public capture endpoints
            `.trim()
        },
        servers: [
            { url: 'http://localhost:5001', description: 'Development' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Lead: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '64abc123def456789' },
                        firstName: { type: 'string', example: 'Jane' },
                        lastName: { type: 'string', example: 'Doe' },
                        email: { type: 'string', example: 'jane@example.com' },
                        phone: { type: 'string', example: '+1 555-0100' },
                        company: { type: 'string', example: 'Acme Corp' },
                        jobTitle: { type: 'string', example: 'CTO' },
                        source: { type: 'string', enum: ['form', 'manual', 'import', 'campaign', 'api', 'referral'] },
                        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'] },
                        score: { type: 'integer', minimum: 0, maximum: 100, example: 75 },
                        tags: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Contact: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Smith' },
                        email: { type: 'string', example: 'john@example.com' },
                        company: { type: 'string' },
                        jobTitle: { type: 'string' },
                        linkedLeads: { type: 'array', items: { type: 'string' } },
                        isActive: { type: 'boolean' }
                    }
                },
                Form: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Newsletter Signup' },
                        fields: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'email' },
                                    label: { type: 'string', example: 'Email Address' },
                                    type: { type: 'string', enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'number', 'url'] },
                                    required: { type: 'boolean' }
                                }
                            }
                        },
                        isActive: { type: 'boolean' },
                        submissionCount: { type: 'integer' }
                    }
                },
                Campaign: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Summer Launch 2026' },
                        type: { type: 'string', enum: ['email', 'social', 'ppc', 'organic', 'referral', 'content', 'other'] },
                        status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'archived'] },
                        metrics: {
                            type: 'object',
                            properties: {
                                leads: { type: 'integer' },
                                conversions: { type: 'integer' },
                                clicks: { type: 'integer' },
                                impressions: { type: 'integer' }
                            }
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Validation failed' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        },
        tags: [
            { name: 'Leads', description: 'Lead capture and lifecycle management' },
            { name: 'Contacts', description: 'Contact (qualified lead) management' },
            { name: 'Forms', description: 'Dynamic lead capture form builder' },
            { name: 'Campaigns', description: 'Marketing campaign tracking' }
        ],
        paths: {
            // ── Leads ──────────────────────────────────────────────────────
            '/api/leads': {
                post: {
                    tags: ['Leads'],
                    summary: 'Create a new lead (PUBLIC)',
                    description: 'Public endpoint. Captures UTM params from query string automatically.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['firstName', 'email'],
                                    properties: {
                                        firstName: { type: 'string', example: 'Jane' },
                                        lastName: { type: 'string', example: 'Doe' },
                                        email: { type: 'string', example: 'jane@example.com' },
                                        phone: { type: 'string', example: '+1 555-0100' },
                                        company: { type: 'string', example: 'Acme Corp' },
                                        jobTitle: { type: 'string', example: 'CTO' },
                                        source: { type: 'string', enum: ['form', 'manual', 'import', 'campaign', 'api', 'referral'] },
                                        score: { type: 'integer', minimum: 0, maximum: 100 },
                                        tags: { type: 'array', items: { type: 'string' } },
                                        campaignId: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: 'Lead created successfully' },
                        400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                    }
                },
                get: {
                    tags: ['Leads'],
                    summary: 'Get all leads (paginated, filterable)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { in: 'query', name: 'status', schema: { type: 'string', enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'] } },
                        { in: 'query', name: 'source', schema: { type: 'string' } },
                        { in: 'query', name: 'campaignId', schema: { type: 'string' } },
                        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search name, email, or company' },
                        { in: 'query', name: 'tags', schema: { type: 'string' }, description: 'Comma-separated tags' },
                        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
                        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
                        { in: 'query', name: 'sort', schema: { type: 'string', default: '-createdAt' } }
                    ],
                    responses: { 200: { description: 'List of leads with pagination' } }
                }
            },
            '/api/leads/stats': {
                get: {
                    tags: ['Leads'],
                    summary: 'Get lead statistics (counts by status, source, avg score)',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Lead statistics object' } }
                }
            },
            '/api/leads/{id}': {
                get: {
                    tags: ['Leads'],
                    summary: 'Get lead by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Lead object' }, 404: { description: 'Not found' } }
                },
                put: {
                    tags: ['Leads'],
                    summary: 'Update a lead',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated lead' }, 404: { description: 'Not found' } }
                },
                delete: {
                    tags: ['Leads'],
                    summary: 'Delete a lead',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } }
                }
            },
            '/api/leads/{id}/status': {
                patch: {
                    tags: ['Leads'],
                    summary: 'Update lead status',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['status'],
                                    properties: {
                                        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'] }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Status updated' } }
                }
            },
            '/api/leads/{id}/notes': {
                post: {
                    tags: ['Leads'],
                    summary: 'Add a note to a lead',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['content'],
                                    properties: {
                                        content: { type: 'string', example: 'Called and left voicemail.' },
                                        createdBy: { type: 'string', example: 'sales@example.com' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 201: { description: 'Note added' } }
                }
            },

            // ── Contacts ───────────────────────────────────────────────────
            '/api/contacts': {
                post: {
                    tags: ['Contacts'],
                    summary: 'Create a contact',
                    security: [{ bearerAuth: [] }],
                    responses: { 201: { description: 'Contact created' }, 409: { description: 'Duplicate email' } }
                },
                get: {
                    tags: ['Contacts'],
                    summary: 'Get all contacts',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { in: 'query', name: 'search', schema: { type: 'string' } },
                        { in: 'query', name: 'company', schema: { type: 'string' } },
                        { in: 'query', name: 'isActive', schema: { type: 'boolean' } },
                        { in: 'query', name: 'page', schema: { type: 'integer' } },
                        { in: 'query', name: 'limit', schema: { type: 'integer' } }
                    ],
                    responses: { 200: { description: 'List of contacts' } }
                }
            },
            '/api/contacts/{id}': {
                get: {
                    tags: ['Contacts'], summary: 'Get contact by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Contact object' }, 404: { description: 'Not found' } }
                },
                put: {
                    tags: ['Contacts'], summary: 'Update a contact',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated contact' } }
                },
                delete: {
                    tags: ['Contacts'], summary: 'Soft-delete a contact (sets isActive: false)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deactivated' } }
                }
            },
            '/api/contacts/{id}/link-lead': {
                post: {
                    tags: ['Contacts'], summary: 'Link a lead to this contact',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['leadId'],
                                    properties: { leadId: { type: 'string' } }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Lead linked' } }
                }
            },

            // ── Forms ──────────────────────────────────────────────────────
            '/api/forms': {
                post: {
                    tags: ['Forms'], summary: 'Create a form (PROTECTED)',
                    security: [{ bearerAuth: [] }],
                    responses: { 201: { description: 'Form created' } }
                },
                get: {
                    tags: ['Forms'], summary: 'Get all forms (PROTECTED)',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'List of forms' } }
                }
            },
            '/api/forms/{id}': {
                get: {
                    tags: ['Forms'], summary: 'Get form by ID (PUBLIC — for embedding)',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Form definition with fields' }, 404: { description: 'Not found or inactive' } }
                },
                put: {
                    tags: ['Forms'], summary: 'Update a form (PROTECTED)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated form' } }
                },
                delete: {
                    tags: ['Forms'], summary: 'Delete a form (PROTECTED)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deleted' } }
                }
            },
            '/api/forms/{id}/submit': {
                post: {
                    tags: ['Forms'],
                    summary: 'Submit a form (PUBLIC — creates a lead)',
                    description: 'Validates submission against the form\'s field definitions. Maps `email`, `first_name`, `last_name`, `phone`, `company` fields automatically.',
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    example: { first_name: 'Jane', email: 'jane@example.com', company: 'Acme' }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: 'Lead created, returns successMessage and optional redirectUrl' },
                        400: { description: 'Dynamic field validation failed' },
                        404: { description: 'Form not found or inactive' }
                    }
                }
            },

            // ── Campaigns ──────────────────────────────────────────────────
            '/api/campaigns': {
                post: {
                    tags: ['Campaigns'], summary: 'Create a campaign',
                    security: [{ bearerAuth: [] }],
                    responses: { 201: { description: 'Campaign created' } }
                },
                get: {
                    tags: ['Campaigns'], summary: 'Get all campaigns',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { in: 'query', name: 'status', schema: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'archived'] } },
                        { in: 'query', name: 'type', schema: { type: 'string' } },
                        { in: 'query', name: 'search', schema: { type: 'string' } }
                    ],
                    responses: { 200: { description: 'List of campaigns' } }
                }
            },
            '/api/campaigns/{id}': {
                get: {
                    tags: ['Campaigns'], summary: 'Get campaign by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Campaign object with conversionRate virtual' } }
                },
                put: {
                    tags: ['Campaigns'], summary: 'Update a campaign',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated campaign' } }
                },
                delete: {
                    tags: ['Campaigns'], summary: 'Delete a campaign',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deleted' } }
                }
            },
            '/api/campaigns/{id}/leads': {
                get: {
                    tags: ['Campaigns'], summary: 'Get all leads for a campaign',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
                        { in: 'query', name: 'status', schema: { type: 'string' } },
                        { in: 'query', name: 'page', schema: { type: 'integer' } }
                    ],
                    responses: { 200: { description: 'Campaign leads with metrics summary' } }
                }
            },
            '/api/campaigns/{id}/metrics': {
                patch: {
                    tags: ['Campaigns'], summary: 'Update campaign metrics',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        leads: { type: 'integer' },
                                        conversions: { type: 'integer' },
                                        clicks: { type: 'integer' },
                                        impressions: { type: 'integer' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Updated metrics' } }
                }
            }
        }
    },
    apis: ['./routes/*.js']
};

module.exports = swaggerJsdoc(options);
