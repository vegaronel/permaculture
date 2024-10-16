const Plant = require('../models/Plant');
const express = require("express");
const getCurrentGrowthStage = require('../public/js/growthStage');
const PlantCollection = require('../models/plantCollections');
const isAuthenticated = require('../middleware/athenticateUser')
const Counter = require('../models/Counter');
const Location = require('../models/Location');
const SoilData = require('../models/SoilData');
const Task = require('../models/Todo');
const fs = require('fs');
const path = require('path');

const admin = require('../config/firebase');

const db = admin.database();

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
    // Get the next custom ID (formatted with leading zeros)
    const customId = await getNextSequenceValue('sensorId');
    // Create a new SoilData instance with the required locationName
    const newSoilData = new SoilData({
      moistureValue: 0,
      locationName: name,
      customId: customId,  // Save the custom ID (e.g., 00001)
      userId: req.session.userId
    });
    await newSoilData.save();

    // Create a new location and associate it with the current user and the new moisture sensor
    const newLocation = new Location({
      name,
      userId: req.session.userId,
      moistureSensorId: newSoilData._id
    });

    await newLocation.save();

    // After saving the location, add a new sensor entry in Firebase
    const sensorRef = db.ref(`Sensors/${customId}`);
    await sensorRef.set({
      moistureValue: 0,
      locationName: name,
      userId: req.session.userId,
    });

    console.log(`New sensor added in Firebase for location: ${newLocation._id}`);

    res.json({ success: true, location: newLocation });
  } catch (error) {
    console.error('Error adding custom location:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.get('/plant/:customId', async (req, res) => {
  try {
      const plant = await Plant.findOne({ customId: req.params.customId }).populate('location').populate('userId').populate('plantCollectionId');
      if (plant) {
          res.json({ success: true, plant });
      } else {
          res.json({ success: false, message: 'Plant not found' });
      }
  } catch (err) {
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Route for harvesting a plant
app.post('/plant/harvest/:customId', async (req, res) => {
  try {
      const { customId } = req.params;
      const { harvestStatus } = req.body;

      // Find and update the plant based on customId
      const plant = await Plant.findOneAndUpdate(
          { customId },
          { harvestStatus, status: 'Harvested' },
          { new: true }
      );

      if (plant) {
          res.json({ success: true, plant });
      } else {
          res.json({ success: false, message: 'Plant not found' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Route for marking a plant as dead
app.post('/plant/died/:customId', async (req, res) => {
  try {
      const { customId } = req.params;
      const { plantDied } = req.body;

      // Find and update the plant based on customId
      const plant = await Plant.findOneAndUpdate(
          { customId },
          { plantDied, status: 'Died' },
          { new: true }
      );

      if (plant) {
          res.json({ success: true, plant });
      } else {
          res.json({ success: false, message: 'Plant not found' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
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
        plantId:plant._id,
        image:plant.image,
        harvestTime: plant.harvestTime,
        overview: plant.overview,
        benefits: plant.benefits,
        usedFor:plant.usedFor
      },
    });
  } catch (error) {
    console.error('Error fetching plant details:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/get-plant-info/:id', async (req, res) => {
  try {
      const plant = await PlantCollection.findById(req.params.id);
      if (!plant) {
          return res.status(404).send("Plant not found");
      }
      res.json({
          name: plant.name,
          harvestTime: plant.harvestTime,
          plantingInstructions: plant.plantingInstructions,
          image: plant.image
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching plant information");
  }
});


app.get('/plants/:plantId', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.plantId).populate('location');
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }

    // Fetch soil data for the plant's location
    const soilData = await SoilData.findById(plant.location.moistureSensorId);
    
    res.render('plantDetails', {
      plant,
      soilMoisture: soilData ? soilData.moistureValue : 'No data'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch plant data' });
  }
});
app.get('/add-new-plant', isAuthenticated, async (req, res) => {
  try {
    const locations = await Location.find({ userId: req.session.userId });
    const plantCollections = await PlantCollection.find();
    const userId = req.session.userId;

    // Get the current month
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    // Find plants that are best to plant in the current month
    const monthlyPlants = await PlantCollection.find({ plantingMonth: currentMonth });

    // Render the view with additional data
    res.render('addPlant.ejs', { name: req.session.username, plantCollections, userId, locations, monthlyPlants, currentMonth });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching plant collections");
  }
});
app.post('/add-new-plant', isAuthenticated, async (req, res) => {
  const { plantCollectionId, plantingDate, userId, location, customLocation, methodOfPlanting } = req.body;

  try {
      // Fetch the selected plant collection
      const plantCollection = await PlantCollection.findById(plantCollectionId);

      if (!plantCollection) {
          return res.status(400).send('Invalid plant selected.');
      }

      // Check if the user added a custom location
      let selectedLocation;
      if (location === 'custom') {
          const newLocation = new Location({
              name: customLocation,
              userId: userId,
          });
          await newLocation.save();
          selectedLocation = newLocation._id;
      } else {
          selectedLocation = location;
      }

      // Convert the plantingDate string to a Date object
      const plantingDateObj = new Date(plantingDate);

      // Calculate estimated harvest time
      const harvestTimeInDays = plantCollection.harvestTime;
      const estimatedHarvestTime = new Date(plantingDateObj);
      estimatedHarvestTime.setDate(plantingDateObj.getDate() + harvestTimeInDays);

      // Calculate the computed growth stage based on planting date
      const computedGrowthStage = calculateGrowthStage(plantingDateObj, estimatedHarvestTime);

      // Create a new plant instance
      const newPlant = new Plant({
          name: plantCollection.name,
          customId: await getNextSequence('plant'),
          plantingInstructions: plantCollection.plantingInstructions,
          plantingDate: plantingDateObj,
          estimatedHarvestTime,
          userId,
          plantCollectionId,
          lastWatered: new Date(),
          methodOfPlanting,
          computedGrowthStage,
          location: selectedLocation,
          image: plantCollection.image,
      });

      await newPlant.save();

      // If the method of planting is transplanting and transplantSeedling has a value, add a task
      if (methodOfPlanting === 'Transplanting Seedlings' && plantCollection.transplantSeedling) {

        const transplantDays = Number(plantCollection.transplantSeedling); // Get transplant days

        // Calculate the transplant due date
        const transplantDueDate = new Date(plantingDateObj);

        transplantDueDate.setDate(transplantDueDate.getDate() + transplantDays); // Add transplantDays to the planting date
  

          // Create a new task for transplanting seedlings
          const newTask = new Task({
              userId: req.session.userId,
              plantId: newPlant._id,
              title: `Transplant ${newPlant.name}`,
              description: `Transplant the seedlings of ${newPlant.name} after ${plantCollection.transplantSeedling} days.`,
              dueDate: transplantDueDate,
              status: 'pending',
              taskType: 'transplanting',
              priority: 'high',
          });

          await newTask.save();
      }

      res.json({ success: true, message: 'Plant added successfully', plant: newPlant });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});



app.post('/update-growth-stage/:id', async (req, res) => {
  const { userGrowthStage } = req.body;

  try {
      // Find the plant by its ID
      const plant = await Plant.findById(req.params.id);

      if (!plant) {
          return res.status(404).send('Plant not found');
      }

      // Update the plant's growth stage with user input
      plant.growthStage = userGrowthStage;

      // Optionally, you can clear the computed growth stage if you have it
      // plant.computedGrowthStage = null; // if you want to reset it

      await plant.save();

      res.redirect('/dashboard'); // Redirect back to the dashboard or any desired page
  } catch (error) {
      console.error(error);
      res.status(500).send('Error updating growth stage');
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


// Function to get the next sequence value and format it with leading zeros
async function getNextSequenceValue(sequenceName) {
  const counter = await Counter.findByIdAndUpdate(
      { _id: sequenceName },       // Use the sequenceName to identify the counter (e.g., 'sensorId')
      { $inc: { seq: 1 } },        // Increment the sequence value by 1
      { new: true, upsert: true }  // Create a new counter if it doesn't exist
  );

  // Format the sequence number with leading zeros (e.g., 00001)
  const formattedId = String(counter.seq).padStart(5, '0');
  return formattedId;
}


// Function to calculate the growth stage based on the planting date and estimated harvest time
function calculateGrowthStage(plantingDate, estimatedHarvestTime) {
  const today = new Date();
  const growthDuration = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24)); // Calculate the number of days since planting
  const totalDuration = Math.floor((estimatedHarvestTime - plantingDate) / (1000 * 60 * 60 * 24)); // Total days until harvest

  // Determine the growth stage based on the duration
  if (growthDuration <= 1) return 'Not yet planted';
  if (growthDuration < 10) return 'Seedling';
  if (growthDuration < totalDuration * 0.25) return 'Vegetating';
  if (growthDuration < totalDuration * 0.5) return 'Budding';
  if (growthDuration < totalDuration * 0.75) return 'Flowering';
  return 'Harvesting';
}

module.exports = app;