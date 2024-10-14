importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyCxmfWGdh_1oIuIZ-OFJ3hQI4jn5FiE_JM",
  authDomain: "soil-moisture-monitoring-1d52c.firebaseapp.com",
  projectId: "soil-moisture-monitoring-1d52c",
  storageBucket: "soil-moisture-monitoring-1d52c.appspot.com",
  messagingSenderId: "425533189140",
  appId: "1:425533189140:web:09ad7931def112b1740b01",
  measurementId: "G-86ZGP33GW0"
});

// const messaging = firebase.messaging();

// messaging.onBackgroundMessage((payload) => {
//   console.log('[firebase-messaging-sw.js] Received background message ', payload);
//   // Customize notification here
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: './images/logo copy.svg'
//   };

//   self.registration.showNotification(notificationTitle, notificationOptions);
// });