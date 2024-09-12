// models/email.js

const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  dateSent: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  profilePicture: { type: String, required: false } // Add this line
});

const Email = mongoose.model('email', emailSchema);

module.exports = Email;
