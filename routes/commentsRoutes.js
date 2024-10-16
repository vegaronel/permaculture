const express = require('express');
const app = express();
const Comment = require('../models/comment');
const User = require('../models/user');
const Post = require('../models/Post');
const auth = require('../middleware/athenticateUser');

// Add a comment to a post
app.post('/comment/:postId', async (req, res) => {
  const { postId } = req.params;
  const { comment } = req.body;
  const userId = req.session.userId; // Assuming the user is logged in

  try {
    const newComment = new Comment({
      postId: postId,
      userId: userId,
      comment: comment,
    });

    await newComment.save();

    // Fetch the user details to return with the response
    const user = await User.findById(userId);

    res.json({ comment: newComment, user: { firstname: user.firstname, lastname: user.lastname } });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

app.get('/comments/:postId', async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10

  try {
    // Fetch comments for the post with pagination
    const comments = await Comment.find({ postId: postId })
      .sort({ createdAt: -1 }) // Sort by latest comments first
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'firstname lastname'); // Populate user details

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

// Get a specific post with comments
app.get('/post/:postId', auth, async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId).populate('userId', 'firstname lastname email');
    const comments = await Comment.find({ postId: postId })
      .populate('userId', 'firstname lastname email')
      .sort({ createdAt: -1 });

    res.render('post', { post, comments,  name: req.session.firstname + " " + req.session.lastname });
  } catch (error) {
    console.error('Error fetching post or comments:', error);
    res.status(500).send('Error retrieving post and comments');
  }
});


module.exports = app;
