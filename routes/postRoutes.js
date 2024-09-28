const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/comment');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/athenticateUser');
const app = express();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

require('dotenv').config();


// Multer storage configuration to upload directly to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posts', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png'], // Allowed image formats
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: Resize images
  },
});

const upload = multer({ storage: storage }); // Use Cloudinary storage


// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Route to create a new post with an image
app.post('/create', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;

  try {
      // Create a new post with the image URL from Cloudinary
      const newPost = new Post({
          userId: req.session.userId,
          title,
          content,
          image: req.file ? req.file.path : null // Use null if no image is uploaded
      });

      await newPost.save();

      res.redirect('/posts');
  } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).send('Error creating post');
  }
});

// Get all posts
app.get('/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find().populate('userId', 'firstname lastname email').sort({ createdAt: -1 });
    res.render('posts', { posts, name: req.session.firstname +" " + req.session.lastname });
  } catch (error) {
    console.error('Error retrieving posts:', error);
    res.status(500).send('Error retrieving posts');
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

    res.render('post', { post, comments });
  } catch (error) {
    console.error('Error fetching post or comments:', error);
    res.status(500).send('Error retrieving post and comments');
  }
});


module.exports = app;
