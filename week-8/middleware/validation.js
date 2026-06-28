const { z } = require('zod');


const createLeadSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100).trim(),
    lastName: z.string().max(100).trim().optional().default(''),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    phone: z.string()
        .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
    company: z.string().max(200).trim().optional().nullable(),
    jobTitle: z.string().max(150).trim().optional().nullable(),
    source: z.enum(['form', 'manual', 'import', 'campaign', 'api', 'referral']).optional().default('manual'),
    score: z.number().int().min(0).max(100).optional().default(0),
    tags: z.array(z.string().max(50).toLowerCase().trim()).optional().default([]),
    campaignId: z.string().optional().nullable(),
    formId: z.string().optional().nullable()
});

const updateLeadSchema = z.object({
    firstName: z.string().min(1).max(100).trim().optional(),
    lastName: z.string().max(100).trim().optional(),
    email: z.string().email('Invalid email address').toLowerCase().trim().optional(),
    phone: z.string()
        .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
    company: z.string().max(200).trim().optional().nullable(),
    jobTitle: z.string().max(150).trim().optional().nullable(),
    source: z.enum(['form', 'manual', 'import', 'campaign', 'api', 'referral']).optional(),
    score: z.number().int().min(0).max(100).optional(),
    tags: z.array(z.string().max(50).toLowerCase().trim()).optional(),
    campaignId: z.string().optional().nullable()
});

const updateLeadStatusSchema = z.object({
    status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'], {
        errorMap: () => ({ message: 'Invalid status value' })
    })
});

const addLeadNoteSchema = z.object({
    content: z.string().min(1, 'Note content is required').max(2000, 'Note cannot exceed 2000 characters').trim(),
    createdBy: z.string().optional().default('system')
});


const createContactSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100).trim(),
    lastName: z.string().max(100).trim().optional().default(''),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    phone: z.string().optional().nullable(),
    company: z.string().max(200).trim().optional().nullable(),
    jobTitle: z.string().max(150).trim().optional().nullable(),
    address: z.object({
        street: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        postalCode: z.string().optional().nullable()
    }).optional(),
    tags: z.array(z.string().toLowerCase().trim()).optional().default([])
});

const updateContactSchema = createContactSchema.partial();

// ─── Form Schemas ─────────────────────────────────────────────────────────────

const formFieldSchema = z.object({
    name: z.string()
        .min(1, 'Field name is required')
        .regex(/^[a-z][a-z0-9_]*$/, 'Field name must be lowercase alphanumeric (underscores ok)')
        .trim(),
    label: z.string().min(1, 'Field label is required').trim(),
    type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'number', 'url']).default('text'),
    required: z.boolean().optional().default(false),
    placeholder: z.string().trim().optional().default(''),
    options: z.array(z.string().trim()).optional().default([]),
    order: z.number().int().min(0).optional().default(0)
});

const createFormSchema = z.object({
    name: z.string().min(1, 'Form name is required').max(200).trim(),
    description: z.string().max(500).trim().optional().default(''),
    fields: z.array(formFieldSchema).min(1, 'A form must have at least one field'),
    campaignId: z.string().optional().nullable(),
    isActive: z.boolean().optional().default(true),
    redirectUrl: z.string().url('Redirect URL must be valid').optional().nullable(),
    successMessage: z.string().max(500).trim().optional()
});

const updateFormSchema = createFormSchema.partial();

// ─── Campaign Schemas ─────────────────────────────────────────────────────────

const createCampaignSchema = z.object({
    name: z.string().min(1, 'Campaign name is required').max(200).trim(),
    description: z.string().max(1000).trim().optional().default(''),
    type: z.enum(['email', 'social', 'ppc', 'organic', 'referral', 'content', 'other'], {
        errorMap: () => ({ message: 'Invalid campaign type' })
    }),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional().default('draft'),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    endDate: z.string().datetime({ offset: true }).optional().nullable(),
    budget: z.object({
        amount: z.number().min(0, 'Budget cannot be negative').optional().default(0),
        currency: z.string().length(3, 'Currency must be a 3-letter code').toUpperCase().optional().default('USD')
    }).optional(),
    tags: z.array(z.string().toLowerCase().trim()).optional().default([])
}).refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
}, { message: 'End date must be after start date', path: ['endDate'] });

const updateCampaignSchema = z.object({
    name: z.string().min(1).max(200).trim().optional(),
    description: z.string().max(1000).trim().optional(),
    type: z.enum(['email', 'social', 'ppc', 'organic', 'referral', 'content', 'other']).optional(),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    endDate: z.string().datetime({ offset: true }).optional().nullable(),
    budget: z.object({
        amount: z.number().min(0).optional(),
        currency: z.string().length(3).toUpperCase().optional()
    }).optional(),
    tags: z.array(z.string().toLowerCase().trim()).optional()
});

const updateCampaignMetricsSchema = z.object({
    leads: z.number().int().min(0).optional(),
    conversions: z.number().int().min(0).optional(),
    clicks: z.number().int().min(0).optional(),
    impressions: z.number().int().min(0).optional()
});

// ─── Form Submission Schema ───────────────────────────────────────────────────
// Dynamic — validated contextually in the form submission controller

// ─── Middleware Factory ───────────────────────────────────────────────────────

const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error.errors) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        next(error);
    }
};

module.exports = {
    validate,
    // Lead
    createLeadSchema,
    updateLeadSchema,
    updateLeadStatusSchema,
    addLeadNoteSchema,
    // Contact
    createContactSchema,
    updateContactSchema,
    // Form
    createFormSchema,
    updateFormSchema,
    // Campaign
    createCampaignSchema,
    updateCampaignSchema,
    updateCampaignMetricsSchema
};
