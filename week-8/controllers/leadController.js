const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const { sanitizeString } = require('../utils/sanitizer');
const { leadQueue, emailQueue } = require('../services/jobQueue');
const logger = require('../utils/logger');

const createLead = async (req, res, next) => {
    try {
        const {
            firstName, lastName, email, phone, company, jobTitle,
            source, score, tags, campaignId, formId
        } = req.body;

        const leadData = {
            firstName: sanitizeString(firstName),
            lastName: sanitizeString(lastName || ''),
            email,
            phone: phone || null,
            company: company ? sanitizeString(company) : null,
            jobTitle: jobTitle ? sanitizeString(jobTitle) : null,
            source: source || 'manual',
            score: score || 0,
            tags: (tags || []).map(t => sanitizeString(t)),
            campaignId: campaignId || null,
            formId: formId || null,
            metadata: {
                ip: req.ip || req.connection?.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null,
                referrer: req.headers['referer'] || null,
                utmSource: req.query.utm_source || null,
                utmMedium: req.query.utm_medium || null,
                utmCampaign: req.query.utm_campaign || null
            }
        };

        const lead = await Lead.create(leadData);

        if (campaignId) {
            await Campaign.findByIdAndUpdate(campaignId, { $inc: { 'metrics.leads': 1 } });
        }

        leadQueue.add('score-lead', { leadId: lead._id.toString() });
        leadQueue.add('auto-tag-lead', { leadId: lead._id.toString() }, { delay: 2000 });

        emailQueue.add('send-lead-alert', {
            lead: lead.toObject(),
            businessEmail: req.headers['x-alert-email'] || null
        });

        logger.info('Lead created', { leadId: lead._id, email: lead.email, source: lead.source });

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: lead
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        next(error);
    }
};

const getLeads = async (req, res, next) => {
    try {
        const {
            status, source, campaignId, formId,
            tags, search,
            page = 1, limit = 20,
            sort = '-createdAt'
        } = req.query;

        const filter = {};

        if (status) filter.status = status;
        if (source) filter.source = source;
        if (campaignId) filter.campaignId = campaignId;
        if (formId) filter.formId = formId;
        if (tags) filter.tags = { $in: tags.split(',').map(t => t.trim().toLowerCase()) };

        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [leads, total] = await Promise.all([
            Lead.find(filter)
                .populate('campaignId', 'name type status')
                .populate('formId', 'name')
                .sort(sort)
                .skip(skip)
                .limit(limitNum),
            Lead.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: leads,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};

const getLeadById = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('campaignId', 'name type status')
            .populate('formId', 'name fields');

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        next(error);
    }
};

const updateLead = async (req, res, next) => {
    try {
        const updates = { ...req.body };

        if (updates.firstName) updates.firstName = sanitizeString(updates.firstName);
        if (updates.lastName) updates.lastName = sanitizeString(updates.lastName);
        if (updates.company) updates.company = sanitizeString(updates.company);
        if (updates.jobTitle) updates.jobTitle = sanitizeString(updates.jobTitle);
        if (updates.tags) updates.tags = updates.tags.map(t => sanitizeString(t));

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('campaignId', 'name type status');

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, message: 'Lead updated successfully', data: lead });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        next(error);
    }
};

const deleteLead = async (req, res, next) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        if (lead.campaignId) {
            await Campaign.findByIdAndUpdate(lead.campaignId, { $inc: { 'metrics.leads': -1 } });
        }

        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        next(error);
    }
};

const updateLeadStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        if (status === 'converted' && lead.campaignId) {
            await Campaign.findByIdAndUpdate(lead.campaignId, { $inc: { 'metrics.conversions': 1 } });
        }

        emailQueue.add('send-status-update', {
            lead: lead.toObject(),
            previousStatus: lead.status !== status ? lead.status : status,
            recipientEmail: req.headers['x-alert-email'] || null
        });

        logger.info('Lead status updated', { leadId: lead._id, status });

        res.json({ success: true, message: `Lead status updated to '${status}'`, data: lead });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        next(error);
    }
};

const addNote = async (req, res, next) => {
    try {
        const { content, createdBy } = req.body;

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    notes: {
                        content: sanitizeString(content),
                        createdBy: sanitizeString(createdBy || 'system')
                    }
                }
            },
            { new: true }
        );

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: { notes: lead.notes }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        next(error);
    }
};

const getLeadStats = async (req, res, next) => {
    try {
        const [byStatus, bySource, total, recentLeads] = await Promise.all([
            Lead.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Lead.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Lead.countDocuments(),
            Lead.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        ]);

        const averageScore = await Lead.aggregate([
            { $group: { _id: null, avg: { $avg: '$score' } } }
        ]);

        res.json({
            success: true,
            data: {
                total,
                recentLeads,
                averageScore: averageScore[0]?.avg?.toFixed(1) || 0,
                byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
                bySource: bySource.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
            }
        });
    } catch (error) {
        next(error);
    }
};

const bulkUpdateLeads = async (req, res, next) => {
    try {
        const { ids, update } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ids array is required' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ success: false, message: 'Cannot bulk update more than 100 leads at once' });
        }

        const allowedFields = ['status', 'score', 'tags'];
        const safeUpdate = {};
        for (const field of allowedFields) {
            if (update[field] !== undefined) safeUpdate[field] = update[field];
        }

        if (Object.keys(safeUpdate).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        const result = await Lead.updateMany(
            { _id: { $in: ids } },
            { $set: safeUpdate },
            { runValidators: true }
        );

        logger.info('Bulk lead update', { count: result.modifiedCount, fields: Object.keys(safeUpdate) });

        res.json({
            success: true,
            message: `${result.modifiedCount} leads updated`,
            data: { matched: result.matchedCount, modified: result.modifiedCount }
        });
    } catch (error) {
        next(error);
    }
};

const bulkDeleteLeads = async (req, res, next) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ids array is required' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ success: false, message: 'Cannot bulk delete more than 100 leads at once' });
        }

        const result = await Lead.deleteMany({ _id: { $in: ids } });

        logger.info('Bulk lead delete', { count: result.deletedCount });

        res.json({
            success: true,
            message: `${result.deletedCount} leads deleted`,
            data: { deleted: result.deletedCount }
        });
    } catch (error) {
        next(error);
    }
};

const manageTags = async (req, res, next) => {
    try {
        const { action, tags } = req.body;

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({ success: false, message: 'tags array is required' });
        }

        const cleanTags = tags.map(t => sanitizeString(t).toLowerCase());

        let update;
        if (action === 'add') {
            update = { $addToSet: { tags: { $each: cleanTags } } };
        } else if (action === 'remove') {
            update = { $pullAll: { tags: cleanTags } };
        } else if (action === 'replace') {
            update = { $set: { tags: cleanTags } };
        } else {
            return res.status(400).json({ success: false, message: 'action must be: add, remove, or replace' });
        }

        const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true });

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        logger.info('Lead tags updated', { leadId: lead._id, action, tags: cleanTags });

        res.json({ success: true, message: `Tags ${action}ed successfully`, data: { tags: lead.tags } });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        next(error);
    }
};

const getJobStats = async (req, res, next) => {
    try {
        const { leadQueue, emailQueue } = require('../services/jobQueue');
        res.json({
            success: true,
            data: {
                leadQueue: leadQueue.getStats(),
                emailQueue: emailQueue.getStats()
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
    updateLeadStatus,
    addNote,
    getLeadStats,
    bulkUpdateLeads,
    bulkDeleteLeads,
    manageTags,
    getJobStats
};
