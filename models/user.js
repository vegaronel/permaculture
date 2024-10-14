const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String, required: false },
    otpExpires: { type: Date, required: false },
    status: {type: String, default: 'pending'},
    profilePicture: { 
        type: String, 
        default: 'https://res.cloudinary.com/db1vjlfkm/image/upload/v1728924414/ganxd9tduj3ihdvaxydf.jpg' // Replace with your Cloudinary URL
    },
    doneTutorial: { type: Boolean, default: false },
    fcmTokens: [String],
    resetToken: String,
    resetTokenExpiry: Date
});

const User = mongoose.model('User', userSchema);

module.exports = User;
