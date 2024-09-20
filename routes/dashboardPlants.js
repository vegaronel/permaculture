const Plant = require('../models/Plant');
const express = require("express");
const getCurrentGrowthStage = require('../public/js/growthStage');
const isAuthenticated = require('../middleware/athenticateUser')
const app = express();


app.get('/plants/:id', async (req, res) => {
  const userId = req.user._id; // Assuming `req.user` contains the authenticated user's information

  try {
    const plant = await Plant.findOne({ _id: req.params.id, user: userId }); // Ensure the plant belongs to the user
    if (plant) {
      plant.currentStage = getCurrentGrowthStage(plant);
      await plant.save();
      res.render('plantDetails', { plant });
    } else {
      res.status(404).send('Plant not found or not owned by you');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving plant details");
  }
});


app.get('/add-plant', (req, res) => {

  res.render('addPlant.ejs', {name:req.session.username});
});
app.post('/add-plant', async (req, res) => {
  const { name, plantingInstructions, wateringSchedule, plantingDate } = req.body;

  try {
    const harvestTimes = {
      "Kamote": 120,
      "Palay": 150,
      "Kalabasa": 90,
      "Pakwan": 100,
      "Sitaw": 80,
      "Mongo": 110
    };

    const harvestTime = harvestTimes[name];
    const plantingDateObj = new Date(plantingDate);
    const harvestDate = new Date(plantingDateObj);
    harvestDate.setDate(plantingDateObj.getDate() + harvestTime);
    
    // Format harvestDate as "MM/DD/YYYY"
    const formattedHarvestDate = `${harvestDate.getMonth() + 1}/${harvestDate.getDate()}/${harvestDate.getFullYear()}`;

    const newPlant = new Plant({
      name,
      plantingInstructions,
      wateringSchedule,
      plantingDate: plantingDateObj,
      harvestDate: formattedHarvestDate,
      userId: req.session.userId // Set the current user's ID
    });

    await newPlant.save();
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding plant");
  }
});
app.post('/water-plant/:id', isAuthenticated, async (req, res) => {
  const plantId = req.params.id;

  try {
    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).send("Plant not found");
    }

    // Update lastWatered to current date
    plant.lastWatered = new Date();
    await plant.save();

    // Redirect back to dashboard or send a success response
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating plant watering");
  }
});


app.get('/plant/:id', isAuthenticated, async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).send('Plant not found');
    }

    res.render('plantDetails', { plant });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving plant details');
  }
});




module.exports = app;