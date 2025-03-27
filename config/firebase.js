// firebase.js
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://soil-moisture-monitoring-1d52c-default-rtdb.firebaseio.com",
});

module.exports = admin;
