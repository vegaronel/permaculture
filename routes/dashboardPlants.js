const Plant = require('../models/Plant');
const express = require("express");
const getCurrentGrowthStage = require('../public/js/growthStage');
const PlantCollection = require('../models/plantCollections');
const isAuthenticated = require('../middleware/athenticateUser')
const Counter = require('../models/Counter');
const Location = require('../models/Location');
const app = express();

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
  );
  return counter.seq;
}

app.post('/add-custom-location', isAuthenticated, async (req, res) => {
  try {
      const { name } = req.body;
      const newLocation = new Location({
          name,
          userId: req.session.userId // Associate the location with the logged-in user
      });

      await newLocation.save();
      
      // Return the new location in the response
      res.json({ success: true, location: newLocation });
  } catch (error) {
      console.error('Error adding custom location:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.get('/plant-details/:id', isAuthenticated, async (req, res) => {
  try {
    const plantId = req.params.id;

    // Fetch plant details from PlantCollection
    const plant = await PlantCollection.findById(plantId);

    if (!plant) {
      return res.json({ success: false, message: 'Plant not found' });
    }

    // Return plant details as JSON
    res.json({
      success: true,
      plant: {
        name: plant.name,
        plantingInstructions: plant.plantingInstructions,
        harvestTime: plant.harvestTime,
      },
    });
  } catch (error) {
    console.error('Error fetching plant details:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.get('/add-new-plant', isAuthenticated, async (req, res) => {
  try {
    const locations = await Location.find({ userId: req.session.userId });
      const plantCollections = await PlantCollection.find(); // Fetch all plant collections from the database
      const userId = req.session.userId; // Assuming you're storing userId in the session

      res.render('addPlant.ejs', { name: req.session.username, plantCollections, userId, locations  }); // Pass userId to the view
  } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching plant collections");
  }
});

app.post('/add-new-plant', isAuthenticated, async (req, res) => {
  const { plantCollectionId, plantingDate, userId, location, customLocation } = req.body;

  try {
    // Fetch the selected plant
    const plantCollection = await PlantCollection.findById(plantCollectionId);
    if (!plantCollection) {
      return res.status(400).send('Invalid plant selected.');
    }

    // Check if the user added a custom location
    let selectedLocation;
    if (location === 'custom') {
      // Create and save the custom location
      const newLocation = new Location({
        name: customLocation,
        userId: userId, // Associate the location with the user
      });
      await newLocation.save();
      selectedLocation = newLocation._id; // Use the ID of the new location
    } else {
      selectedLocation = location; // Use the existing location ID
    }

    // Convert the plantingDate string to a Date object
    const plantingDateObj = new Date(plantingDate);

    const customId = await getNextSequence('plant');

    // Calculate estimated harvest time
    const harvestTimeInDays = plantCollection.harvestTime;
    const estimatedHarvestTime = new Date(plantingDateObj);
    estimatedHarvestTime.setDate(plantingDateObj.getDate() + harvestTimeInDays);

    // Create a new plant instance
    const newPlant = new Plant({
      name: plantCollection.name,
      customId: customId.toString().padStart(5, '0'),
      plantingInstructions: plantCollection.plantingInstructions,
      wateringSchedule: plantCollection.wateringSchedule,
      plantingDate: plantingDateObj,
      estimatedHarvestTime,
      userId,
      plantCollectionId,
      lastWatered: new Date(),
      growthStage: 'Seedling',
      location: selectedLocation // Save the selected location ID
    });

    await newPlant.save();
    res.redirect('/dashboard'); // Redirect after adding
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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