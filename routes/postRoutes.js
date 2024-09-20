const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/comment');
const path = require('path');
const auth = require('../middleware/athenticateUser');
const app = express();


const multer = require('multer');
// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Directory to store images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename the file with a timestamp
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Create a new post
app.post('/create', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const userId = req.session.userId; // Assuming you're storing the user ID in the session

  try {
    const newPost = new Post({
      userId: userId,  // Get the userId from session
      title: title,    // Post title
      content: content, // Post description
      image: req.file ? req.file.path : null, // Store the image file path if uploaded
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
    res.render('posts', { posts, name: req.session.firstname +" " + req.session.lastname });
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
