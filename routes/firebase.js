// Import the functions you need from the SDKs you need
const initializeApp = require('firebase/app')
const getAnalytics = require('firebase/analytics')
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCVQ_8JjaxmtCulAagbPV7AinjlCe4BCd4",
  authDomain: "permaculture-jellyace.firebaseapp.com",
  projectId: "permaculture-jellyace",
  storageBucket: "permaculture-jellyace.appspot.com",
  messagingSenderId: "473104477817",
  appId: "1:473104477817:web:36a28af15dbab87c3eeea8",
  measurementId: "G-T9PHDTFR8G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);