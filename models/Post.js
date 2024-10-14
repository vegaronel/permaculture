const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstname:{type: String, required: false},
  lastname:{type: String, required: false},
  category: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, required: false },
  profile: { type: String }, // Store profile picture URL here
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
