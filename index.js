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
const changeProfile = require("./routes/changeProfile");
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

// Create a transport for sending emails
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.USER_PASS
  }
});

function sendNotificationEmail(toEmail, locationName, title, body) {
  console.log('Sending email to:', toEmail); // Log email recipient
  return new Promise((resolve, reject) => {
      const mailOptions = {
          from: `"JELLYACE" <${process.env.EMAIL_USER}>`,
          to: toEmail,
          subject: title,
          text: body
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error sending email:', error);
              reject(error);
          } else {
              console.log('Email sent:', info.response);
              resolve(info);
          }
      });
  });
}

// Object to store the last known status for each sensor
const lastKnownStatus = {};

function getMoistureStatus(moistureValue) {
  if (moistureValue <= 250) return 'waterlogged';
  if (moistureValue >= 800 && moistureValue <= 1023) return 'dry';
  if (moistureValue > 1023) return 'lifted';
  return 'normal';
}

async function handleSoilMoistureUpdate(sensorId, sensorData) {
  console.log('handleSoilMoistureUpdate called for sensor:', sensorId); // Log the sensor being updated

  if (!sensorData) {
      console.log('Invalid soil moisture data for sensor:', sensorId);
      return;
  }

  try {
      const { locationName, moistureValue, userId, plantId } = sensorData;
      const user = await User.findById(userId);
      
      if (!user || !user.email) {
          console.log('No valid user associated with this sensor data for sensor:', sensorId);
          return;
      }

      const currentStatus = getMoistureStatus(moistureValue);
      const previousStatus = lastKnownStatus[sensorId];

      console.log('Current Status:', currentStatus); // Log current status
      console.log('Previous Status:', previousStatus); // Log previous status

      // Update the last known status
      lastKnownStatus[sensorId] = currentStatus;

      // Only proceed with notification if the status has changed
      if (currentStatus !== previousStatus && currentStatus !== 'normal') {
          let notificationTitle = '';
          let notificationBody = '';
          let taskTitle = '';
          let taskDescription = '';
          let taskType = 'custom';

          switch (currentStatus) {
              case 'waterlogged':
                  notificationTitle = 'Waterlogged Soil Alert';
                  notificationBody = `The soil at ${locationName} has become waterlogged. Improve drainage and stop watering to prevent plant damage.`;
                  taskTitle = `Improve drainage at ${locationName}`;
                  taskDescription = `The soil at ${locationName} is waterlogged. Improve drainage and stop watering to prevent plant damage.`;
                  break;
              case 'dry':
                  notificationTitle = 'Dry Soil Alert';
                  notificationBody = `The soil at ${locationName} has become dry. Water the plants to prevent stress and dehydration.`;
                  taskTitle = `Water plants at ${locationName}`;
                  taskDescription = `The soil at ${locationName} is dry. Water the plants to prevent stress and dehydration.`;
                  taskType = 'watering';
                  break;
              case 'lifted':
                  notificationTitle = 'Sensor Lifted Alert';
                  notificationBody = `Sensor at ${locationName} has been lifted from the soil. Reinsert the sensor to get accurate moisture readings.`;
                  taskTitle = `Check sensor at ${locationName}`;
                  taskDescription = `Sensor at ${locationName} is not in soil. Reinsert the sensor to get accurate moisture readings.`;
                  break;
          }

          // Create a new task
          const existingTask = await Todo.findOne({
              userId: user._id,
              plantId: plantId || null,
              title: taskTitle,
              completed: false
          });

          if (!existingTask) {
              const newTask = new Todo({
                  userId: user._id,
                  plantId: plantId || null,
                  title: taskTitle,
                  description: taskDescription,
                  dueDate: new Date(),
                  taskType: taskType,
                  priority: 'high'
              });

              await newTask.save();
              console.log(`Task added to the To-Do list for user ${user.email}.`);
          }

          // Send email notification
          try {
              await sendNotificationEmail(user.email, locationName, notificationTitle, notificationBody);
              console.log(`Email sent successfully to ${user.email} for ${notificationTitle}.`);
          } catch (error) {
              console.error(`Failed to send email for ${notificationTitle}:`, error);
          }
      }

      // Update soil moisture data in database
      await SoilData.findOneAndUpdate(
          { userId, locationName },
          { moistureValue },
          { new: true, upsert: true }
      );

      // Emit updated data to connected clients
      io.emit('soilMoistureUpdate', {
          [sensorId]: { locationName, moistureValue, userId }
      });

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
app.use('/user', changeProfile);

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