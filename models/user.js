const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String, required: false },
    otpExpires: { type: Date, required: false },
    status: {type:String, default:'pending'},
    profilePicture: { type: String, default: '/uploads/profile-default.jpg' }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
