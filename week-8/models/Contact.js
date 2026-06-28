const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
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
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    company: {
        type: String,
        trim: true,
        maxlength: [200, 'Company cannot exceed 200 characters'],
        default: null
    },
    jobTitle: {
        type: String,
        trim: true,
        maxlength: [150, 'Job title cannot exceed 150 characters'],
        default: null
    },
    address: {
        street: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        country: { type: String, default: null },
        postalCode: { type: String, default: null }
    },
    linkedLeads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    notes: [{
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: [2000, 'Note cannot exceed 2000 characters']
        },
        createdBy: { type: String, default: 'system' }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

contactSchema.virtual('fullName').get(function () {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

contactSchema.index({ email: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ isActive: 1 });

module.exports = mongoose.model('Contact', contactSchema);
