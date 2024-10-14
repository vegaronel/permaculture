const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['Health', 'Plants', 'Recipes'], required: true },
  content: { type: String, required: true },
  image: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Virtual for user's profile information
PostSchema.virtual('userProfile', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  get: function(user) {
    if (!user) return null;
    return {
      profilePicture: user.profilePicture,
      firstname: user.firstname,
      lastname: user.lastname
    };
  }
});

// Ensure virtuals are included when converting document to JSON
PostSchema.set('toJSON', { virtuals: true });
PostSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', PostSchema);