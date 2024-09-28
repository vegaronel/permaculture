const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  customId: { type: String, unique: true }, 
  estimatedHarvestTime: { type: Date, required: true },
  plantingInstructions: { type: String, required: true },
  plantingDate: { type: Date, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true }, // Updated to reference Location model
  lastWatered: { type: Date },
  growthStage: { 
    type: String, 
    default: "", 
    enum: ["", "sprout", "seedling", "vegetating", "budding", "flowering", "ripening", "harvesting"], // Include empty string
    required: false // Optional, based on your needs
},
  computedGrowthStage: { type: String, required: true }, // Computed growth stage
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantCollectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlantCollection', required: true },
  instanceNumber: { type: Number },
  image:{type:String}
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = Plant;
