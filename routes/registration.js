const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const flash = require('connect-flash');
const nodemailer = require("nodemailer");
const User = require("../models/user");
require("dotenv").config();

const app = express();
app.use(flash());
// Ensure the uploads directory exists
const uploadsDir = path.join("./uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({ storage });

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.USER_PASS,
    },
});

// Helper function to send verification code
function sendVerificationCode(email, code) {
    const mailOptions = {
        from: `"JELLYACE" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Email Verification Code",
        text: `Your verification code is ${code}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
        } else {
            console.log("Email sent:", info.response);
        }
    });
}

// Check if email is already taken
app.post("/check-email", async (req, res) => {
    const { email } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        const message = existingUser ? "Email is already taken." : "Email is available.";
        return res.json({ success: !existingUser, message });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// Send verification code
app.post("/send-verification-code", async (req, res) => {
    const { email } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "Email is already taken." });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        req.session.verificationCode = verificationCode;
        req.session.email = email;
        req.session.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        sendVerificationCode(email, verificationCode);
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
app.post("/register", upload.single("profilePicture"), async (req, res) => {
    const { firstname, lastname, email, password, verificationCode } = req.body;

    // Check if OTP is valid
    if (!req.session.verificationCode ||
        req.session.verificationCode !== parseInt(verificationCode) ||
        req.session.otpExpires < Date.now()) {
        return res.json({ success: false, message: "Invalid or expired verification code." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Use the uploaded profile picture if available, otherwise use the default
        const profilePicture = req.file ? `/uploads/${req.file.filename}` : '/uploads/profile-default.jpg';

        const newUser = new User({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            profilePicture
        });

        await newUser.save();

        // Clear OTP session data
        req.session.verificationCode = null;
        req.session.email = null;
        req.session.otpExpires = null;
        req.session.registrationSuccess = true;

        res.json({ success: true, message: "Registration successful" });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "An error occurred during registration." });
    }
});

app.get('/register-success', (req, res) => {
    // Check if the user has just registered
    if (!req.session.registrationSuccess) {
        return res.redirect('/register'); // Redirect to register if not authorized
    }
    
    // Clear the session flag after showing success
    req.session.registrationSuccess = false; 

    res.render('register-success'); // Render success page
});



module.exports = app;
