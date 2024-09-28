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
        image:plant.image,
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
        // Fetch the selected plant collection
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

        // Calculate estimated harvest time
        const harvestTimeInDays = plantCollection.harvestTime;
        const estimatedHarvestTime = new Date(plantingDateObj);
        estimatedHarvestTime.setDate(plantingDateObj.getDate() + harvestTimeInDays);

        // Calculate the computed growth stage based on planting date
        const computedGrowthStage = calculateGrowthStage(plantingDateObj, estimatedHarvestTime); // Create this function

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
            computedGrowthStage, // Set computed growth stage
            location: selectedLocation, // Save the selected location ID
            image: plantCollection.image // Save the image path from PlantCollection
        });

        await newPlant.save();
        res.redirect('/dashboard'); // Redirect after adding
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