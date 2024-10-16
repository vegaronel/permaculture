const express = require('express');
const Post = require('../models/Post');
const User = require('../models/user');
const Comment = require('../models/comment');
const auth = require('../middleware/athenticateUser');
const path = require('path');
const app = express();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const { formatDistanceToNow } = require('date-fns'); // Import date-fns

require('dotenv').config();

app.use(express.static(path.join(__dirname, 'public')));

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
  const { content, category } = req.body;

  try {
    const user = await User.findById(req.session.userId).select('profilePicture');
    
    console.log("User found:", user); // Check user data
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Log the profile picture
    console.log("User's profile picture:", user.profilePicture);

    const newPost = new Post({
      userId: user._id,
      category,
      content,
      image: req.file ? req.file.path : null,
      profile: user.profilePicture || null // Save the user's profile picture
    });

    console.log("New post data:", newPost); // Log the post data

    await newPost.save();

    res.redirect('/posts');
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post');
  }
});


app.post('/like/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const userLikedIndex = post.likedBy.indexOf(userId);

    if (userLikedIndex === -1) {
      // User hasn't liked the post yet, so add the like
      post.likedBy.push(userId);
      post.likes += 1;
    } else {
      // User has already liked the post, so remove the like
      post.likedBy.splice(userLikedIndex, 1);
      post.likes -= 1;
    }

    await post.save();

    res.json({ success: true, likes: post.likes, liked: userLikedIndex === -1 });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ success: false, message: 'Error liking post' });
  }
});
app.get('/posts', auth, async (req, res) => {
  const limit = 10; // Number of posts per page
  const page = parseInt(req.query.page) || 1; // Current page number (default to 1)

  try {
    const totalPosts = await Post.countDocuments(); // Total number of posts
    const posts = await Post.find()
      .populate('userId', 'firstname lastname email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit) // Skip posts for previous pages
      .limit(limit); // Limit to 10 posts

    // Initialize counts for each category
    let healthCount = 0;
    let plantsCount = 0;
    let recipesCount = 0;

    // Count posts for each category
    posts.forEach(post => {
      switch (post.category) {
          case 'Health':
              healthCount++;
              break;
          case 'Plants':
              plantsCount++;
              break;
          case 'Recipes':
              recipesCount++;
              break;
          default:
              break;
      }
    });

    const postsWithDetails = await Promise.all(posts.map(async post => {
      const commentsCount = await Comment.countDocuments({ postId: post._id });
      const isLiked = post.likedBy.includes(req.session.userId);
      return {
        ...post.toObject(),
        commentsCount,
        timeAgo: formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }),
        isLiked
      };
    }));

    // Calculate total number of pages
    const totalPages = Math.ceil(totalPosts / limit);

    res.render('posts', { 
      posts: postsWithDetails, 
      totalPosts, // Pass the total number of posts
      totalPages, // Pass total pages for pagination
      currentPage: page, // Pass current page
      name: req.session.firstname + " " + req.session.lastname, 
      profile: req.session.profilePicture,
      healthCount, 
      plantsCount, 
      recipesCount, 
    });
  } catch (error) {
    console.error('Error retrieving posts:', error);
    res.status(500).send('Error retrieving posts');
  }
});




module.exports = app;