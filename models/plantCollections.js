const mongoose = require('mongoose');

const plantCollectionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    plantingInstructions: { type: String, required: true },
    harvestTime: { type: Number, required: true },
    image: { type: String }
});

const PlantCollection = mongoose.model('PlantCollection', plantCollectionSchema);

module.exports = PlantCollection;
