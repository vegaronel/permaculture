const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('../config/firebase');
const app = express();
const port = process.env.PORT || 3000;

const db = admin.database();
const ref = db.ref('Sensors');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
  res.render('dashboard');
});

app.post('/api/save-fcm-token', (req, res) => {
  const { token } = req.body;
  // Save the token to your database
  console.log('Received FCM token:', token);
  res.json({ success: true });
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