const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  customId: { type: String, unique: true }, 
  estimatedHarvestTime: { type: Date, required: true },
  plantingInstructions: { type: String, required: true },
  plantingDate: { type: Date, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true }, // Updated to reference Location model
  lastWatered: { type: Date },
  growthStage: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantCollectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlantCollection', required: true },
  instanceNumber: { type: Number }
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = Plant;
