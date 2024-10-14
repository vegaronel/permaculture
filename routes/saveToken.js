const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('../config/firebase');
const isAuthenticated = require('../middleware/athenticateUser');
const app = express();
const port = process.env.PORT || 3000;
const User = require('../models/user');

const db = admin.database();
const ref = db.ref('Sensors');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');


app.post('/api/save-fcm-token', isAuthenticated, async (req, res) => {
    const { token } = req.body;
    const userId = req.session.userId;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (!user.fcmTokens.includes(token)) {
        user.fcmTokens.push(token);
        await user.save();
      }
      console.log('FCM token saved for user:', userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving FCM token:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


// Example route to send a push notification
app.post('/api/send-notification', async (req, res) => {
  const { token, title, body } = req.body;
  try {
    await admin.messaging().send({
      token: token,
      notification: {
        title: title,
        body: body,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;