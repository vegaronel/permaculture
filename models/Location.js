  const mongoose = require('mongoose');

  const locationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
    moistureSensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SoilData' }, // Reference to SoilData (Moisture Sensor)
  });

  const Location = mongoose.model('Location', locationSchema);
  module.exports = Location;
