const express = require("express");
const bodyParser = require("body-parser");
const cron = require('node-cron');
const mongoose = require('mongoose');
const session = require('express-session');
const middleWare = require("./middleware/middleware");
const MemoryStore = require('memorystore')(session);
const email = require("./routes/emails");
const comments = require("./routes/commentsRoutes");
const userLogin = require("./routes/userloginlogout");
const isAuthenticated = require('./middleware/athenticateUser');
const userDashboard = require("./routes/userDashboard");
const registration = require("./routes/registration");
const plantIdentification = require("./routes/plantDetection");
const dashboardPlants = require("./routes/dashboardPlants");
const commentsRoutes = require("./routes/commentsRoutes");
const postRoutes = require("./routes/postRoutes");
const admin = require('./config/firebase');
const SoilData = require('./models/SoilData');  // Import the SoilData model

const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const db = admin.database();
const ref = db.ref('Sensors');

const app = express();
const port = process.env.PORT || 4000;
const server = http.createServer(app);
const io = socketIo(server);
// This function will be called when new soil moisture data is received
async function handleSoilMoistureUpdate(soilMoistureData) {
  if (soilMoistureData) {
    try {
      for (const sensorId of Object.keys(soilMoistureData)) {
        const sensorData = soilMoistureData[sensorId];
        const { locationName, moistureValue, userId } = sensorData;

        console.log(`Sensor ID: ${sensorId}, Sensor Data:`, sensorData); 

        if (userId) {
          const updatedSoilData = await SoilData.findOneAndUpdate(
            { userId, locationName },
            { moistureValue },
            { new: true, upsert: true }
          );

          console.log('Soil moisture data updated in MongoDB:', updatedSoilData);

          // Emit the updated data to all clients
          io.emit('soilMoistureUpdate', {
            [sensorId]: {
              locationName,
              moistureValue,
              userId
            }
          });
        } else {
          console.log('No userId associated with this sensor data for sensor:', sensorId);
        }
      }
    } catch (error) {
      console.error('Error updating soil moisture data in MongoDB:', error);
    }
  } else {
    console.log('Invalid soil moisture data, not saving to database');
  }
}



// Set up the Firebase listener
ref.on('value', (snapshot) => {
  const soilMoistureData = snapshot.val();
  console.log('Received soil moisture data:', soilMoistureData); // Log the data
  handleSoilMoistureUpdate(soilMoistureData);
});

module.exports = { handleSoilMoistureUpdate };

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database Connected");
  })
  .catch(() => {
    console.log("Connection Failed");
  });

app.use(session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  secret: 'keyboard cat'
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(middleWare);
app.use(plantIdentification);
app.use(comments);
app.use(email);
app.use(userLogin);
app.use(userDashboard);
app.use(registration);
app.use(dashboardPlants);
app.use(commentsRoutes);
app.use(postRoutes);

app.get("/", (req, res) => {
  res.render("homepage.ejs");
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
  const snapshot = await ref.once('value');
  const soilMoistureValue = snapshot.val();
  res.render("index.ejs", { soilMoistureValue });
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/community", isAuthenticated, (req, res) => {
  const name = req.session.firstname + " " + req.session.lastname;
  res.render("community.ejs", { username: name });
});

app.use((req, res, next) => {
  res.status(404).render("404.ejs");
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});