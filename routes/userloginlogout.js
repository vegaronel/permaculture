const express = require("express");
const bcrypt = require("bcryptjs");
const isAuthenticated = require('../middleware/athenticateUser');
const User = require("../models/user");
const SoilData = require("../models/SoilData");
const Task = require('../models/Todo');
const Plant = require("../models/Plant"); 
const axios = require('axios');
const handleSoilMoistureUpdate = require('../index')
const admin = require('../config/firebase'); 

const soilMoistureRef = admin.database().ref('CurrentValue');

require("dotenv").config(); // Load environment variables


const app = express();

// Middleware for handling JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/complete-tutorial', isAuthenticated, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.session.userId, { doneTutorial: true });
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error completing the tutorial');
  }
});
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = {
      _id: req.session.userId,
      firstname: req.session.firstname,
      lastname: req.session.lastname,
      profilePicture: req.session.profilePicture,
      doneTutorial: req.session.doneTutorial
    };
    if (!user) {
      return res.status(404).send('User not found');
    }

    if (user.doneTutorial === "false") {
      return res.render('tutorial');
    }

    const lat = 14.163742603744133;
    const lon = 122.88500203498731; 
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API}&units=metric`;

    const filter = req.query.filter;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const plantQuery = {
      userId: req.session.userId,
      completed: { $nin: ['a'] } // Exclude harvested plants
    };

    if (filter) {
      plantQuery.type = filter;
    }

    // Fetch tasks where status is 'pending'
    const tasksQuery = {
      userId: req.session.userId,
      completed: 'false'
    };

    const [currentWeatherResponse, forecastResponse, plants, soilMoistureData, tasks] = await Promise.all([
      axios.get(currentWeatherUrl),
      axios.get(forecastUrl),
      Plant.find(plantQuery)
        .populate('location')
        .skip(skip)
        .limit(limit)
        .sort({ plantingDate: -1 }),
      SoilData.find({ userId: req.session.userId }).sort({ createdAt: -1 }).limit(10), // Fetch latest soil moisture data for the user
      Task.find(tasksQuery).sort({ dueDate: 1 }) // Fetch pending tasks for the user sorted by due date
    ]);

    const weatherData = currentWeatherResponse.data;
    
    const forecastData = forecastResponse.data.list;

    const moistureLocations = soilMoistureData.map(data => ({
      location: data.locationName,
      moisture: data.moistureValue,
      userId: data.userId
    }));

    const dailyForecasts = forecastData.filter((entry) => entry.dt_txt.includes("12:00:00"));

    const updatedPlants = plants.map(plant => {
      const currentDate = new Date();
      const lastWatered = new Date(plant.lastWatered || plant.plantingDate);
      const dayDiff = Math.floor((currentDate - lastWatered) / (1000 * 60 * 60 * 24));

      const needsWatering = (plant.wateringSchedule === 'Daily' && dayDiff >= 1) || 
                            (plant.wateringSchedule === 'Every 2 Days' && dayDiff >= 2) || 
                            (plant.wateringSchedule === 'Weekly' && dayDiff >= 7);

      return { 
        ...plant.toObject(), 
        growthStage: plant.growthStage && plant.growthStage.trim() !== '' ? plant.growthStage : plant.computedGrowthStage,
        needsWatering,
        location: plant.location ? plant.location.name : 'Unknown Location'
      };
    });

    const count = await Plant.countDocuments(plantQuery);
    const totalPages = Math.ceil(count / limit);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-PH', options);
    const [weekday, month, dayWithComma] = formattedDate.split(', ');
    const weatherIcon = weatherData.weather[0].icon; // Get the icon code

    res.render('index', {
      moistureLocations, // Pass the moisture data to the view
      weather: weatherData,
      weatherIcon,
      plants: updatedPlants,
      forecast: dailyForecasts,
      tasks, // Pass the tasks to the view
      page,
      totalPages,
      filter,
      name: `${req.session.firstname} ${req.session.lastname}`,
      firstname: user.firstname,
      day: weekday,
      dateToday: `${month}, ${dayWithComma}`,
      userId: req.session.userId, // Pass the userId to the view
      profilePicture: user.profilePicture // Add this line
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving dashboard data");
  }
});


app.get('/plants', isAuthenticated, async (req, res) => {
  try {
      const plants = await Plant.find({ userId: req.session.userId })
          .populate('location')
          .sort({ plantingDate: -1 });
      
      res.json({ success: true, plants });
  } catch (error) {
      console.error(error);
      res.json({ success: false, message: 'Error fetching plants' });
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user) {
      if (user.status === 'pending') {
        const pendingMessage = "Your account is still under verification.";
        return res.render("login.ejs", { wrongCridentials: pendingMessage });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.firstname = user.firstname;
        req.session.lastname = user.lastname;
        req.session.profilePicture = user.profilePicture;

        return user.doneTutorial ? res.redirect('/dashboard') : res.redirect('/tutorial');
      } else {
        const wrongInfo = "Wrong email or password";
        return res.render("login.ejs", { wrongCridentials: wrongInfo });
      }
    } else {
      const wrongInfo = "Wrong email or password";
      return res.render("login.ejs", { wrongCridentials: wrongInfo });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in user");
  }
});

app.get("/tutorial", (req, res) => {
  res.render('tutorial');
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});


module.exports = app;
