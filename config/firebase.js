// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('../config/soil-moisture-monitoring-1d52c-firebase-adminsdk-416o3-c3a5ead8f0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://soil-moisture-monitoring-1d52c-default-rtdb.firebaseio.com'
});

module.exports = admin;
