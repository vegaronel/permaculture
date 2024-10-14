// routes/user.js
const express = require('express');
const app = express();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const User = require('../models/user');
const Post = require('../models/Post');

require('dotenv').config();


// Multer storage configuration to upload directly to Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'profile',
        allowed_formats: ['jpg', 'png'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    },
});

const upload = multer({ storage: storage });


// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

app.post('/change-profile', upload.single('profilePicture'), async (req, res) => {
    try {
        const { firstname, lastname } = req.body;
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let profileUpdated = false;
        let nameUpdated = false;

        if (req.file) {
            user.profilePicture = req.file.path;
            profileUpdated = true;
        }

        if (firstname && firstname !== user.firstname) {
            user.firstname = firstname;
            nameUpdated = true;
        }
        if (lastname && lastname !== user.lastname) {
            user.lastname = lastname;
            nameUpdated = true;
        }

        await user.save();

        // Update session data
        req.session.firstname = user.firstname;
        req.session.lastname = user.lastname;
        req.session.profilePicture = user.profilePicture;

        // If profile picture or name was updated, refresh the user's posts
        if (profileUpdated || nameUpdated) {
            await Post.updateMany(
                { userId: userId },
                { $set: { 
                    "profile": user.profilePicture,
                    "firstname": user.firstname,
                    "lastname": user.lastname
                } }
            );
        }

        res.json({ 
            message: 'Profile updated successfully', 
            profilePicture: user.profilePicture, 
            firstname: user.firstname, 
            lastname: user.lastname 
        });
    } catch (error) {
        console.error('Error in change-profile route:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});


module.exports = app;