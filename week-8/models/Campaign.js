const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Campaign name is required'],
        trim: true,
        maxlength: [200, 'Campaign name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        default: ''
    },
    type: {
        type: String,
        enum: {
            values: ['email', 'social', 'ppc', 'organic', 'referral', 'content', 'other'],
            message: 'Type must be one of: email, social, ppc, organic, referral, content, other'
        },
        required: [true, 'Campaign type is required']
    },
    status: {
        type: String,
        enum: {
            values: ['draft', 'active', 'paused', 'completed', 'archived'],
            message: 'Status must be one of: draft, active, paused, completed, archived'
        },
        default: 'draft'
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null,
        validate: {
            validator: function (endDate) {
                if (!endDate || !this.startDate) return true;
                return endDate > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    budget: {
        amount: { type: Number, min: [0, 'Budget cannot be negative'], default: 0 },
        currency: { type: String, default: 'USD', uppercase: true, trim: true }
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    metrics: {
        leads: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

campaignSchema.virtual('conversionRate').get(function () {
    if (this.metrics.leads === 0) return 0;
    return ((this.metrics.conversions / this.metrics.leads) * 100).toFixed(2);
});

campaignSchema.index({ status: 1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
