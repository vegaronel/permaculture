const { v4: uuidv4 } = require('uuid');  // Import the UUID library
const mongoose = require('mongoose');

const SoilDataSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    default: uuidv4,  // Automatically assign a UUID as the unique ID
    unique: true,     // Ensure the unique ID is unique in the database
  },
  moistureValue: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const SoilData = mongoose.model('SoilData', SoilDataSchema);

module.exports = SoilData;
