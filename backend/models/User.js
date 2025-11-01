const mongoose = require('mongoose');

// Chat message schema
const chatMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    document: {
        filename: String,
        originalName: String,
        mimeType: String
    }
});

// Chat session schema
const chatSessionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: 'New Chat'
    },
    messages: [chatMessageSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    shortlistedJobs: [{
        jobId: String,
        title: String,
        company: String,
        companyLogo: String,
        location: String,
        mode: String,
        url: String,
        matchScore: Number,
        shortlistedAt: { type: Date, default: Date.now }
    }],
    chatSessions: [chatSessionSchema]
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;