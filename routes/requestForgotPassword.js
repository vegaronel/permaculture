const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const User = require('../models/user'); // Adjust the path based on your project structure
require("dotenv").config();

// GET - Forgot Password Page
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password'); // Renders the forgot password EJS file
});

// POST - Handle Password Reset Request
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user with the email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', { error: 'Email not found', message: null });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 24 * 3600000; // Valid for 24 hours

        // Update user with reset token and expiry
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();
        console.log(`Token saved for user ${user.email}: ${resetToken}, expires: ${new Date(resetTokenExpiry)}`);

        // Create a reset URL
        const resetURL = `http://${req.headers.host}/reset-password/${resetToken}`;

        // Set up nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.USER_PASS,
            },
        });

        // Send reset email
        await transporter.sendMail({
            from: `"JELLYACE" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset',
            html: `<p>You requested a password reset</p>
                   <p>Click this <a href="${resetURL}">link</a> to set a new password.</p>`
        });

        res.render('forgot-password', { message: 'Password reset email sent', error: null });
    } catch (error) {
        console.error(error);
        res.render('forgot-password', { error: 'An error occurred. Please try again later.', message: null });
    }
});

app.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    console.log(`Received token: ${token}`);

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            console.log("Token is invalid or expired.");
            console.log(`Current time: ${new Date()}`);
            console.log(`User: ${JSON.stringify(user)}`);
            return res.send('Invalid or expired token.');
        }

        console.log("Valid token found for user:", user.email);
        res.render('reset-password', { token, error: null });
    } catch (error) {
        console.error("Error in reset-password route:", error);
        res.send('An error occurred. Please try again later.');
    }
});


// POST - Handle Password Update
app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('reset-password', { token, error: 'Passwords do not match' });
    }

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.send('Invalid or expired token.');
        }

        // Update user password and clear reset token
        user.password = await bcrypt.hash(password, 10); // Hash the password before saving it
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.send('Password reset successful. You can now log in with your new password.');
    } catch (error) {
        console.error(error);
        res.render('reset-password', { token, error: 'An error occurred. Please try again later.' });
    }
});



module.exports = app;
