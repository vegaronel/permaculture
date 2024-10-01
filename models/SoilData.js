const { v4: uuidv4 } = require('uuid');  // Import the UUID library
const mongoose = require('mongoose');

const SoilDataSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,  // Ensure locationName is required
  },
  moistureValue: {
    type: Number,
    required: true,  // Ensure moistureValue is required
  },
  uniqueId: {
    type: String,
    default: uuidv4,  // Automatically assign a UUID as the unique ID
    unique: true,     // Ensure the unique ID is unique in the database
  },
  timestamp: {
    type: Date,
    default: Date.now,  // Automatically set the timestamp to the current date
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customId: String,  // Add this field to store the custom ID
  
});

// Create the model from the schema
const SoilData = mongoose.model('SoilData', SoilDataSchema);

// Export the model
module.exports = SoilData;
