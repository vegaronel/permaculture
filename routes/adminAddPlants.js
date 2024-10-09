// const express = require('express');
// const app = express();
// const PlantCollection = require('../models/plantCollections'); // Import the PlantCollection model

// // Route for adding a new plant collection
// app.post('/add-plant', async (req, res) => {
//   const { name, plantingInstructions, wateringSchedule, harvestTime } = req.body;

//   try {
//     const newPlant = new PlantCollection({
//       name,
//       plantingInstructions,
//       wateringSchedule,
//       harvestTime
//     });

//     await newPlant.save();
//     res.redirect('/admin');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error adding plant to collection");
//   }
// });

// module.exports = app;
