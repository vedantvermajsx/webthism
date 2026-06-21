const Form = require('../models/Form');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const { sanitizeString } = require('../utils/sanitizer');

const createForm = async (req, res, next) => {
    try {
        const { name, description, fields, campaignId, isActive, redirectUrl, successMessage } = req.body;

        if (campaignId) {
            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({ success: false, message: 'Campaign not found' });
            }
        }

        const form = await Form.create({
            name: sanitizeString(name),
            description: description ? sanitizeString(description) : '',
            fields,
            campaignId: campaignId || null,
            isActive: isActive !== undefined ? isActive : true,
            redirectUrl: redirectUrl || null,
            successMessage
        });

        res.status(201).json({
            success: true,
            message: 'Form created successfully',
            data: form
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        next(error);
    }
};

const getForms = async (req, res, next) => {
    try {
        const { isActive, campaignId, page = 1, limit = 20, sort = '-createdAt' } = req.query;

        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (campaignId) filter.campaignId = campaignId;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [forms, total] = await Promise.all([
            Form.find(filter)
                .populate('campaignId', 'name type status')
                .sort(sort)
                .skip(skip)
                .limit(limitNum),
            Form.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: forms,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        next(error);
    }
};

const getFormById = async (req, res, next) => {
    try {
        const form = await Form.findById(req.params.id)
            .populate('campaignId', 'name type status');

        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        if (!form.isActive) {
            return res.status(404).json({ success: false, message: 'Form not found or inactive' });
        }

        res.json({ success: true, data: form });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid form ID' });
        }
        next(error);
    }
};

const updateForm = async (req, res, next) => {
    try {
        const updates = { ...req.body };

        if (updates.name) updates.name = sanitizeString(updates.name);
        if (updates.description) updates.description = sanitizeString(updates.description);

        const form = await Form.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('campaignId', 'name');

        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        res.json({ success: true, message: 'Form updated successfully', data: form });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid form ID' });
        }
        next(error);
    }
};

const deleteForm = async (req, res, next) => {
    try {
        const form = await Form.findByIdAndDelete(req.params.id);

        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        res.json({ success: true, message: 'Form deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid form ID' });
        }
        next(error);
    }
};

const submitForm = async (req, res, next) => {
    try {
        const form = await Form.findById(req.params.id);

        if (!form || !form.isActive) {
            return res.status(404).json({ success: false, message: 'Form not found or inactive' });
        }

        const submissionData = req.body;
        const validationErrors = [];

        for (const field of form.fields) {
            const value = submissionData[field.name];

            if (field.required && (value === undefined || value === null || value === '')) {
                validationErrors.push({ field: field.name, message: `${field.label} is required` });
                continue;
            }

            if (value !== undefined && value !== null && value !== '') {
                if (field.type === 'email') {
                    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
                    if (!emailRegex.test(value)) {
                        validationErrors.push({ field: field.name, message: `${field.label} must be a valid email` });
                    }
                }
                if (field.type === 'number' && isNaN(Number(value))) {
                    validationErrors.push({ field: field.name, message: `${field.label} must be a number` });
                }
                if (field.type === 'url') {
                    try { new URL(value); } catch {
                        validationErrors.push({ field: field.name, message: `${field.label} must be a valid URL` });
                    }
                }
                if (field.type === 'select' && field.options.length > 0 && !field.options.includes(value)) {
                    validationErrors.push({
                        field: field.name,
                        message: `${field.label} must be one of: ${field.options.join(', ')}`
                    });
                }
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Form submission validation failed',
                errors: validationErrors
            });
        }

        const firstName = sanitizeString(submissionData.first_name || submissionData.firstName || submissionData.name || '');
        const lastName  = sanitizeString(submissionData.last_name || submissionData.lastName || '');
        const email     = submissionData.email || submissionData.email_address || '';
        const phone     = submissionData.phone || submissionData.phone_number || null;
        const company   = submissionData.company || submissionData.organization || null;
        const jobTitle  = submissionData.job_title || submissionData.jobTitle || submissionData.title || null;

        if (!email) {
            return res.status(400).json({ success: false, message: 'An email field is required in the form submission' });
        }

        const lead = await Lead.create({
            firstName: firstName || 'Unknown',
            lastName,
            email,
            phone,
            company: company ? sanitizeString(company) : null,
            jobTitle: jobTitle ? sanitizeString(jobTitle) : null,
            source: 'form',
            formId: form._id,
            campaignId: form.campaignId || null,
            metadata: {
                ip: req.ip || req.connection?.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null,
                referrer: req.headers['referer'] || null,
                utmSource: req.query.utm_source || null,
                utmMedium: req.query.utm_medium || null,
                utmCampaign: req.query.utm_campaign || null
            }
        });

        await Form.findByIdAndUpdate(form._id, { $inc: { submissionCount: 1 } });
        if (form.campaignId) {
            await Campaign.findByIdAndUpdate(form.campaignId, { $inc: { 'metrics.leads': 1 } });
        }

        res.status(201).json({
            success: true,
            message: form.successMessage || 'Thank you! Your information has been submitted successfully.',
            data: {
                leadId: lead._id,
                redirectUrl: form.redirectUrl || null
            }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid form ID' });
        }
        next(error);
    }
};

module.exports = {
    createForm,
    getForms,
    getFormById,
    updateForm,
    deleteForm,
    submitForm
};
