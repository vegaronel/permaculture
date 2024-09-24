const express = require("express");
const bcrypt = require("bcryptjs");
const isAuthenticated = require('../middleware/athenticateUser');
const User = require("../models/user");
const axios = require('axios');
const Plant = require("../models/Plant");
const getCurrentGrowthStage = require('../public/js/growthStage'); 
const app = express();

require("dotenv").config();
app.get('/dashboard', isAuthenticated, async (req, res) => {
  const lat = 14.163742603744133;  // Latitude for the barangay
  const lon = 122.88500203498731;  // Longitude for the barangay
  const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API}&units=metric`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API}&units=metric`;

  const filter = req.query.filter;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let query = { userId: req.session.userId };

  if (filter) {
    query.type = filter; // Filter plants by type
  }

  try {
    // Fetch current weather data
    const currentWeatherResponse = await axios.get(currentWeatherUrl);
    const weatherData = currentWeatherResponse.data;

    // Fetch 5-day weather forecast
    const forecastResponse = await axios.get(forecastUrl);
    const forecastData = forecastResponse.data.list;

    // Extract daily forecasts (filter data for every 24 hours)
    const dailyForecasts = forecastData.filter((entry) => {
      return entry.dt_txt.includes("12:00:00");  // Pick the weather data for 12:00 PM each day
    });

    // Fetch plant data from the database
    const plants = await Plant.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ plantingDate: -1 });

    const currentDate = new Date();
    const growthStages = [
      { stage: "Sprout", days: 7 },
      { stage: "Seedling", days: 14 },
      { stage: "Vegetating", days: 30 },
      { stage: "Budding", days: 45 },
      { stage: "Flowering", days: 60 },
      { stage: "Ripening", days: 75 },
      { stage: "Harvesting", days: 90 }
    ];

    const updatedPlants = plants.map(plant => {
      const plantingDate = new Date(plant.plantingDate);
      const daysSincePlanting = Math.floor((currentDate - plantingDate) / (1000 * 60 * 60 * 24));

      let currentStage = "Not yet started";
      for (const stage of growthStages) {
        if (daysSincePlanting <= stage.days) {
          currentStage = stage.stage;
          break;
        }
      }

      // Handle case where lastWatered is not set
      const lastWatered = new Date(plant.lastWatered || plantingDate); // Use plantingDate if lastWatered is undefined
      const wateringSchedule = plant.wateringSchedule;
      let needsWatering = false;

      if (wateringSchedule === 'Daily') {
        const dayDiff = Math.floor((currentDate - lastWatered) / (1000 * 60 * 60 * 24));
        needsWatering = dayDiff >= 1;
      } else if (wateringSchedule === 'Every 2 Days') {
        const dayDiff = Math.floor((currentDate - lastWatered) / (1000 * 60 * 60 * 24));
        needsWatering = dayDiff >= 2;
      } else if (wateringSchedule === 'Weekly') {
        const dayDiff = Math.floor((currentDate - lastWatered) / (1000 * 60 * 60 * 24));
        needsWatering = dayDiff >= 7;
      }

      return { ...plant.toObject(), growthStage: currentStage, needsWatering, s: req.session.profilePictures };
    });

    const count = await Plant.countDocuments(query);
    const totalPages = Math.ceil(count / limit);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-PH', options);

    const [weekday, month, dayWithComma, year] = formattedDate.split(', ');
    const [day] = dayWithComma.split(' '); // Extract the day without the comma

    // Render the dashboard with current weather, forecast, and plant data
    res.render('index', {
      weather: weatherData,
      plants: updatedPlants,
      forecast: dailyForecasts, // 5-day forecast
      page,
      totalPages,
      filter,
      name: req.session.firstname + " " + req.session.lastname,
      day: weekday,
      dateToday:  " "+ month + " " + day
 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving plants");
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

        return res.redirect('/dashboard'); // Redirect to dashboard after login
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
 
app.get("/logout", (req, res) => {
     req.session.destroy((err) => {
          if (err) {
               return res.status(500).send("Error logging out");
          }
          res.redirect("/");
     });
});

module.exports = app;
