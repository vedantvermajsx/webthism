const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');

const createCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: campaign
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        next(error);
    }
};

const getCampaigns = async (req, res, next) => {
    try {
        const {
            status, type, search,
            page = 1, limit = 20, sort = '-createdAt'
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [campaigns, total] = await Promise.all([
            Campaign.find(filter).sort(sort).skip(skip).limit(limitNum),
            Campaign.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: campaigns,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        next(error);
    }
};

const getCampaignById = async (req, res, next) => {
    try {
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        res.json({ success: true, data: campaign });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        next(error);
    }
};

const updateCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        res.json({ success: true, message: 'Campaign updated successfully', data: campaign });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        next(error);
    }
};

const deleteCampaign = async (req, res, next) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        next(error);
    }
};

const getCampaignLeads = async (req, res, next) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

        const filter = { campaignId: req.params.id };
        if (status) filter.status = status;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [leads, total] = await Promise.all([
            Lead.find(filter).sort(sort).skip(skip).limit(limitNum),
            Lead.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: {
                campaign: { id: campaign._id, name: campaign.name, type: campaign.type, status: campaign.status },
                leads,
                metrics: campaign.metrics
            },
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        next(error);
    }
};

const updateCampaignMetrics = async (req, res, next) => {
    try {
        const { leads, conversions, clicks, impressions } = req.body;

        const updates = {};
        if (leads !== undefined) updates['metrics.leads'] = leads;
        if (conversions !== undefined) updates['metrics.conversions'] = conversions;
        if (clicks !== undefined) updates['metrics.clicks'] = clicks;
        if (impressions !== undefined) updates['metrics.impressions'] = impressions;

        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        res.json({ success: true, message: 'Campaign metrics updated', data: campaign });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }
        next(error);
    }
};

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    getCampaignLeads,
    updateCampaignMetrics
};
