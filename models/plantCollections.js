    const mongoose = require('mongoose');

    const plantCollectionSchema = new mongoose.Schema({
        name: { type: String, required: true },
        plantingInstructions: { type: String, required: true },
        overview:{type: String, required: true},
        benefits:{type: String, required: true},
        usedFor:{type: String, required: true},
        harvestTime: { type: Number, required: true },
        image: { type: String },
        plantingMonth: { type: [String], required: true }
    });

    const PlantCollection = mongoose.model('PlantCollection', plantCollectionSchema);

    module.exports = PlantCollection;
