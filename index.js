const express = require("express");
const bodyParser = require("body-parser");
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const flash = require('connect-flash');
const session = require('express-session');
const mongoose = require('mongoose');
const middleWare = require("./middleware/middleware");
const MemoryStore = require('memorystore')(session);
const adminRoute = require("./routes/admin");
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
const User = require('./models/user');
const saveToken = require('./routes/saveToken');
const SoilData = require('./models/SoilData');
const Todo = require('./models/Todo');
const forgotPassword = require('./routes/requestForgotPassword');

const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const db = admin.database();
const ref = db.ref('Sensors');

const app = express();
const port = process.env.PORT || 4000;
const server = http.createServer(app);
const io = socketIo(server);



const lastNotificationStatus = {}; // This can also be stored in the database


// In your server-side code
async function cleanupInvalidTokens(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  for (const token of user.fcmTokens) {
    try {
      await admin.messaging().send({ token }, true);
    } catch (error) {
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        // Remove the invalid token
        user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      }
    }
  }
  await user.save();
}
async function handleSoilMoistureUpdate(sensorId, sensorData) {
  if (!sensorData) {
      console.log('Invalid soil moisture data for sensor:', sensorId);
      return;
  }

  try {
      const { locationName, moistureValue, userId, plantId } = sensorData;

      // Check if the userId in sensor data matches the authenticated user's ID
      const user = await User.findById(userId);
      if (!user || !user.email) {
          console.log('No valid user associated with this sensor data for sensor:', sensorId);
          return;
      }

      // Fetch the previous moisture value from the database
      const existingSoilData = await SoilData.findOne({ userId, locationName });

      // Only proceed if the moisture value has changed
      if (existingSoilData && existingSoilData.moistureValue === moistureValue) {
          console.log('No change in soil moisture value for sensor:', sensorId);
          return;
      }

      // Update soil data in the database
      await SoilData.findOneAndUpdate(
          { userId, locationName },
          { moistureValue },
          { new: true, upsert: true }
      );

      // Emit the updated data to clients, but only for the authenticated user
      io.emit('soilMoistureUpdate', {
          [sensorId]: { locationName, moistureValue, userId }
      });

      // Check if soil is dry and send a notification if needed
      if (moistureValue < 30) {
          // Check the last notification status
          if (lastNotificationStatus[locationName] !== 'dry') {
              const existingTask = await Todo.findOne({
                  userId: user._id,
                  plantId: plantId || null,
                  title: `Water your plant at ${locationName}`,
                  taskType: 'watering',
                  completed: false
              });

              if (!existingTask) {
                  const newTask = new Todo({
                      userId: user._id,
                      plantId: plantId || null,
                      title: `Water your plant at ${locationName}`,
                      description: `The soil at ${locationName} is dry. Please water your plant.`,
                      dueDate: new Date(),
                      taskType: 'watering',
                      priority: 'high'
                  });

                  await newTask.save();
                  console.log(`Task added to the To-Do list for user ${user.email}.`);
              }

              if (user.fcmTokens && user.fcmTokens.length > 0) {
                  const message = {
                      notification: {
                          title: 'Soil Moisture Alert',
                          body: `The soil at ${locationName} is dry. Please water your plant.`,
                      },
                      android: {
                          notification: {
                              icon: 'stock_ticker_update',
                              color: '#7e55c3'
                          }
                      },
                      tokens: user.fcmTokens
                  };

                  try {
                      const response = await admin.messaging().sendEachForMulticast(message);
                      console.log('Successfully sent message:', response);
                      await cleanupInvalidTokens(user._id);
                  } catch (error) {
                      console.log('Error sending message:', error);
                  }
              }

              lastNotificationStatus[locationName] = 'dry'; // Update the last notification status
              console.log(`Notification sent to ${user.email} for dry soil at ${locationName}.`);
          }
      } else {
          lastNotificationStatus[locationName] = 'not-dry'; // Update status if soil is not dry
      }
  } catch (error) {
      console.error('Error updating soil moisture data in MongoDB:', error);
  }
}

// Set up the Firebase listener
ref.on('child_changed', (snapshot) => {
  const sensorId = snapshot.key;
  const sensorData = snapshot.val();
  console.log('Received soil moisture data for sensor:', sensorId, sensorData);
  handleSoilMoistureUpdate(sensorId, sensorData);
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
    saveUninitialized: true,
    secret: 'keyboard cat'
  }));
  app.use(flash());

  // Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(middleWare);
app.use(plantIdentification);
app.use(comments);
app.use(adminRoute);
app.use(userLogin);
app.use(userDashboard);
app.use(registration);
app.use(dashboardPlants);
app.use(commentsRoutes);
app.use(saveToken);
app.use(postRoutes);
app.use(forgotPassword);

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