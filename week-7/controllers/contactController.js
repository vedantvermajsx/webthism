const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const { sanitizeString } = require('../utils/sanitizer');

const createContact = async (req, res, next) => {
    try {
        const {
            firstName, lastName, email, phone, company,
            jobTitle, address, tags
        } = req.body;

        const contactData = {
            firstName: sanitizeString(firstName),
            lastName: sanitizeString(lastName || ''),
            email,
            phone: phone || null,
            company: company ? sanitizeString(company) : null,
            jobTitle: jobTitle ? sanitizeString(jobTitle) : null,
            address: address || {},
            tags: (tags || []).map(t => sanitizeString(t))
        };

        const contact = await Contact.create(contactData);

        res.status(201).json({
            success: true,
            message: 'Contact created successfully',
            data: contact
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A contact with this email already exists'
            });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
        }
        next(error);
    }
};

const getContacts = async (req, res, next) => {
    try {
        const {
            search, company, isActive,
            page = 1, limit = 20, sort = '-createdAt'
        } = req.query;

        const filter = {};

        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (company) filter.company = { $regex: company, $options: 'i' };

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

        const [contacts, total] = await Promise.all([
            Contact.find(filter)
                .populate('linkedLeads', 'email status source createdAt')
                .sort(sort)
                .skip(skip)
                .limit(limitNum),
            Contact.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: contacts,
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

const getContactById = async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id)
            .populate('linkedLeads', 'email status source score createdAt');

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        res.json({ success: true, data: contact });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid contact ID' });
        }
        next(error);
    }
};

const updateContact = async (req, res, next) => {
    try {
        const updates = { ...req.body };

        if (updates.firstName) updates.firstName = sanitizeString(updates.firstName);
        if (updates.lastName) updates.lastName = sanitizeString(updates.lastName);
        if (updates.company) updates.company = sanitizeString(updates.company);
        if (updates.jobTitle) updates.jobTitle = sanitizeString(updates.jobTitle);
        if (updates.tags) updates.tags = updates.tags.map(t => sanitizeString(t));

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('linkedLeads', 'email status source');

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        res.json({ success: true, message: 'Contact updated successfully', data: contact });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Email already in use by another contact' });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid contact ID' });
        }
        next(error);
    }
};

const deleteContact = async (req, res, next) => {
    try {
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        res.json({ success: true, message: 'Contact deactivated successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid contact ID' });
        }
        next(error);
    }
};

const linkLead = async (req, res, next) => {
    try {
        const { leadId } = req.body;

        if (!leadId) {
            return res.status(400).json({ success: false, message: 'leadId is required' });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { linkedLeads: leadId } },
            { new: true }
        ).populate('linkedLeads', 'email status source createdAt');

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        res.json({
            success: true,
            message: 'Lead linked to contact successfully',
            data: contact
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }
        next(error);
    }
};

module.exports = {
    createContact,
    getContacts,
    getContactById,
    updateContact,
    deleteContact,
    linkLead
};
