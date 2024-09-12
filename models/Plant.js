const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  plantingInstructions: { type: String, required: true },
  wateringSchedule: { type: String, required: true },
  plantingDate: { type: Date, required: true },
  harvestDate: { type: String, required: true },
  lastWatered: { type: Date },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }  // Added userId field
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = Plant;
