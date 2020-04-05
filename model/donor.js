// file for the mongoose model for the app

const mongoose = require('mongoose')

const donorSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String, 
    password: String,
    Blood: String, // type plus Rh so A+
    Address: {
        literal: String,
        location: {
           longitude: Number,
           latitute: Number
        }
    },
    date: {
        type:Date,
        default: Date.now
    }
})


const Donor = module.exports = mongoose.model('Donor', donorSchema)

module.exports.getDonorById = (id, callback) => {
    Donor.findById(id, callback);
}

module.exports.getDonorByEmail = (email, callback) => {
    let query = {
        email: email
    };
    Donor.findOne(query, callback);
}
