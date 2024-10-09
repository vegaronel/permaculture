// firebase-messaging-sw.js

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-messaging.js');

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyCxmfWGdh_1oIuIZ-OFJ3hQI4jn5FiE_JM",
    authDomain: "soil-moisture-monitoring-1d52c.firebaseapp.com",
    databaseURL: "https://soil-moisture-monitoring-1d52c-default-rtdb.firebaseio.com",
    projectId: "soil-moisture-monitoring-1d52c",
    storageBucket: "soil-moisture-monitoring-1d52c.appspot.com",
    messagingSenderId: "425533189140",
    appId: "1:425533189140:web:09ad7931def112b1740b01",
    measurementId: "G-86ZGP33GW0"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
