// models/comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    profilePicture: { type: String, required: false } // Add this line
});

module.exports = mongoose.model('Comment', commentSchema);
