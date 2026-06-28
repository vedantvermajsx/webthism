const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Note content is required'],
        trim: true,
        maxlength: [2000, 'Note cannot exceed 2000 characters']
    },
    createdBy: {
        type: String,
        default: 'system'
    }
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [100, 'First name cannot exceed 100 characters']
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [100, 'Last name cannot exceed 100 characters'],
        default: ''
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[\d\s\-\(\)]{7,20}$/, 'Please provide a valid phone number'],
        default: null
    },
    company: {
        type: String,
        trim: true,
        maxlength: [200, 'Company name cannot exceed 200 characters'],
        default: null
    },
    jobTitle: {
        type: String,
        trim: true,
        maxlength: [150, 'Job title cannot exceed 150 characters'],
        default: null
    },
    source: {
        type: String,
        enum: {
            values: ['form', 'manual', 'import', 'campaign', 'api', 'referral'],
            message: 'Source must be one of: form, manual, import, campaign, api, referral'
        },
        default: 'manual'
    },
    status: {
        type: String,
        enum: {
            values: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'],
            message: 'Status must be one of: new, contacted, qualified, unqualified, converted, lost'
        },
        default: 'new'
    },
    score: {
        type: Number,
        min: [0, 'Score cannot be less than 0'],
        max: [100, 'Score cannot exceed 100'],
        default: 0
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    notes: [noteSchema],
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        default: null
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    metadata: {
        ip: { type: String, default: null },
        userAgent: { type: String, default: null },
        referrer: { type: String, default: null },
        utmSource: { type: String, default: null },
        utmMedium: { type: String, default: null },
        utmCampaign: { type: String, default: null }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

leadSchema.virtual('fullName').get(function () {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ campaignId: 1 });
leadSchema.index({ formId: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
