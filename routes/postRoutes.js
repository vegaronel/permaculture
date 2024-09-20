const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/comment');
const auth = require('../middleware/athenticateUser');
const app = express();


const multer = require('multer');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Create a new post
app.post('/create', async (req, res) => {
  const { content } = req.body;
  const userId = req.session.userId; // Assuming you're storing the user in the session

  try {
    const newPost = new Post({
      userId: userId,  // Get the userId from session
      content: content, // Post content
    });

    await newPost.save();
    res.redirect('/posts'); // Redirect to posts list
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post');
  }
});

// Get all posts
app.get('/posts',auth, async (req, res) => {
  try {
    const posts = await Post.find().populate('userId', 'firstname lastname email').sort({ createdAt: -1 });
    res.render('posts', { posts });
  } catch (error) {
    console.error('Error retrieving posts:', error);
    res.status(500).send('Error retrieving posts');
  }
});

// Get a specific post with comments
app.get('/post/:postId',auth, async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId).populate('userId', 'firstname lastname email');
    const comments = await Comment.find({ postId: postId })
      .populate('userId', 'firstname lastname email')
      .sort({ createdAt: -1 });

    res.render('post', { post, comments });
  } catch (error) {
    console.error('Error fetching post or comments:', error);
    res.status(500).send('Error retrieving post and comments');
  }
});


module.exports = app;
