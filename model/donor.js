// file for the mongoose model for the app

const mongoose = require("mongoose");
var bcrypt = require("bcryptjs"); //to encrypt password

const donorSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: String,
  password: String,
  Blood: String, // type plus Rh so A+
  Address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    zip: String,
    location: {
      longitude: Number,
      latitude: Number,
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
  document: {},
});

const Donor = (module.exports = mongoose.model("Donor", donorSchema));

module.exports.getDonorById = (id, callback) => {
  Donor.findById(id, callback);
};

module.exports.getDonorByEmail = (email, callback) => {
  let query = {
    email: email,
  };
  Donor.findOne(query, callback);
};

module.exports.comparePassword = function (candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
    callback(null, isMatch);
  });
  // User.findOne(query, callback);
};

module.exports.createDonor = async function (newDonor, callback) {
  // bcrypt.genSalt(10, function (err, salt) {
  //   bcrypt.hash(newDonor.password, salt, function (err, hash) {
  //     newDonor.password = hash; //encrypt password using hash
  //     await newDonor.save(callback);
  //   });
  // });

  try {
    var hash = await bcrypt.hash(newDonor.password, 10);
    newDonor.password = hash; //encrypt password using hash
    await newDonor.save(callback);
  } catch (error) {
    console.log(error);
  }
};
