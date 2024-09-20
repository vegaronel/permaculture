const express = require('express');
const app = express();
const Comment = require('../models/comment');

// Add a comment to a post
app.post('/comment/:postId', async (req, res) => {
  const { postId } = req.params;
  const { comment } = req.body;
  const userId = req.session.userId; // Assuming the user is logged in

  try {
    const newComment = new Comment({
      postId: postId,
      userId: userId,  // Get the userId from session
      comment: comment,
    });

    await newComment.save();
    res.redirect(`/post/${postId}`); // Redirect back to the post page
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Error adding comment');
  }
});

module.exports = app;
