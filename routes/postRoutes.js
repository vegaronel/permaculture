const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/comment');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/athenticateUser');
const app = express();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();



cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: 'uploads/' }); // Temporary storage


// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Create a new post
// Route to create a new post with an image
app.post('/create', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;

  try {
      // Upload the image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);

      // Create a new post with the image URL from Cloudinary
      const newPost = new Post({
          userId: req.session.userId,
          title,
          content,
          image: result.secure_url // Store the secure URL
      });

      await newPost.save();

      // Remove the temporary file after upload
      fs.unlinkSync(req.file.path);

      res.redirect('/posts'); // Redirect to the dashboard or the newly created post
  } catch (error) {
      console.error('Error uploading image:', error);
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
