const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 8,
    uppercase: true,
    trim: true,
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 60 * 60 * 24 * 7 },
  },
});

module.exports = mongoose.model('Room', roomSchema);
