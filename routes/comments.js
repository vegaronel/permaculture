const express = require('express');
const router = express.Router();
const isAuthenticated = require("../middleware/athenticateUser")
const Comment = require('../models/comment');

// Route to get all comments
router.get('/comments', isAuthenticated, async (req, res) => {
    try {
        const comments = await Comment.find().sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to create a new comment
router.post('/comments', async (req, res) => {
    console.log('Received body:', req.body);
    const comment = new Comment
        ({
            username: req.body.username,
            content: req.body.content,
            profilePicture: req.body.profilePicture
        });

    try 
        {
            const newComment = await comment.save();
            console.log('Saved comment:', newComment);
            res.status(201).json(newComment);
        } 
    catch (err) 
        {
            console.error(err);
            res.status(400).json({ message: err.message });
        }
});

module.exports = router;
