const express = require("express");
const bcrypt = require("bcryptjs");
const isAuthenticated = require('../middleware/athenticateUser');
const User = require("../models/user");
const Plant = require("../models/Plant");
const getCurrentGrowthStage = require('../public/js/growthStage'); 
const app = express();



app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Fetch plants for the current user
    const plants = await Plant.find({ userId: req.session.userId }); 

    // Calculate the current stage for each plant
    plants.forEach(plant => {
      plant.currentStage = getCurrentGrowthStage(plant); 
    });

    // Pass the plants array to the EJS view
    res.render('index', { plants }); 
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
