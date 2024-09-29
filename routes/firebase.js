const express = require('express');

const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
// Initialize Firebase
const serviceAccount = require('../config/soil-moisture-monitoring-1d52c-firebase-adminsdk-416o3-c3a5ead8f0.json'); // Add your Firebase service account key file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://soil-moisture-monitoring-1d52c-default-rtdb.firebaseio.com'
});

const db = admin.database();
const ref = db.ref('CurrentValue'); // Reference to your CurrentValue

ref.on('value', (snapshot) => {
  const soilMoistureValue = snapshot.val();
  console.log('Soil Moisture Value:', soilMoistureValue);
});

app.get('/soil-moisture',async(req,res)=>{

  axios.get('https://soil-moisture-monitoring-1d52c-default-rtdb.firebaseio.com/CurrentValue.json')
  .then(response => {
    console.log('Soil Moisture Value:', response.data);
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });

})

module.exports = app;