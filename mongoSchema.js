const mongoose = require('mongoose')

const exerciseSchema = mongoose.Schema({description: String, duration: Number, date: Date})
const userSchema = mongoose.Schema({username: String, count: {type: Number, default: 0}, log: [exerciseSchema]})

const User = mongoose.model("User", userSchema)

module.exports = User