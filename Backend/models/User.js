const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensures no two users can register with the same email
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true }); // Automatically adds 'createdAt' and 'updatedAt' fields

// This line compiles the schema into a model and exports it
module.exports = mongoose.model('User', UserSchema);