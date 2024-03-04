// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNum: { type: String, required: true, match: [/^\d{10}$/, 'Phone number must be 10 digits'] },
    location: { type: String, required: true, match: [/^\d{5}$/, 'Location must be a 5 digit zip code'] }
});

userSchema.pre('save', async function(next) {
    // Hash the password before saving the user model
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Add a method to the user schema to check password validity
userSchema.methods.isValidPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

