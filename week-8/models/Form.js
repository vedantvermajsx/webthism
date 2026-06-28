const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Field name is required'],
        trim: true,
        lowercase: true,
        match: [/^[a-z][a-z0-9_]*$/, 'Field name must be lowercase alphanumeric (underscores allowed)']
    },
    label: {
        type: String,
        required: [true, 'Field label is required'],
        trim: true
    },
    type: {
        type: String,
        enum: {
            values: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'number', 'url'],
            message: 'Field type must be one of: text, email, phone, textarea, select, checkbox, number, url'
        },
        default: 'text'
    },
    required: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        trim: true,
        default: ''
    },
    options: [{
        type: String,
        trim: true
    }],
    order: {
        type: Number,
        default: 0
    }
}, { _id: false });

const formSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Form name is required'],
        trim: true,
        maxlength: [200, 'Form name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    fields: {
        type: [fieldSchema],
        validate: {
            validator: function (fields) {
                return fields.length >= 1;
            },
            message: 'A form must have at least one field'
        }
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    submissionCount: {
        type: Number,
        default: 0
    },
    redirectUrl: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Redirect URL must be a valid http/https URL'],
        default: null
    },
    successMessage: {
        type: String,
        trim: true,
        maxlength: [500, 'Success message cannot exceed 500 characters'],
        default: 'Thank you! Your information has been submitted successfully.'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

formSchema.index({ isActive: 1 });
formSchema.index({ campaignId: 1 });

module.exports = mongoose.model('Form', formSchema);
