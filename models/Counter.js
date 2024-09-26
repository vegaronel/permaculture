const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: String,  // This could represent the collection name, e.g., 'plant'
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
