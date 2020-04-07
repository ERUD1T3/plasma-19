// route for user request
const router = require("express").Router();
const Donor = require("../model/donor");
// const bcrypt = require('bcrypt')
var multiparty = require("connect-multiparty")();
const geoDriver = require("../drivers/geoDriver");
const fileStreamDriver = require("../drivers/fileStreamDriver");
const passport = require("passport");
const nodemailer = require("nodemailer");
const {
  initialize,
  checkAuthenticated,
  checkNotAuthenticated,
} = require("../configs/passport.config");
initialize(passport);

router.get("/", (req, res) => {
  console.log("Root page");
  //res.send("hello world")
  var errors = [];
  console.log(`locals ${res.locals.donor}`);
  Donor.find({}, function (err, donors) {
    if (err) throw err;
    if (!donors) {
      errors.push({ msg: "Could not find donors" });
      res.render("main", { errors });
    } else {
      console.log(donors);
      res.render("main", {
        donors,
      });
    }
  });
});

router.get("/signup", (req, res) => {
  console.log("signup page");
  res.render("signup");
});

router.post("/signup", multiparty, async (req, res) => {
  var file = req.files.proofDocument;
  // console.log(file);
  // if (file.originalFilename == "") console.log("No file selected");
  console.log("posting user data to db");
  donor = req.body;

  let errors = [];
  if (
    !donor.firstName ||
    !donor.lastName ||
    !donor.email ||
    !donor.password1 ||
    !donor.password2 ||
    donor.bloodType == "Choose..." ||
    !donor.inputAddress ||
    !donor.city ||
    donor.state == "Choose..." ||
    !donor.city
  ) {
    errors.push({ msg: "Please fill in all fields" });
  } else if (!donor.Rh) {
    errors.push({ msg: "Please select blood type Rh" });
  } else if (donor.password1 != donor.password2) {
    errors.push({ msg: "Passwords must match" });
  } else if (file.originalFilename == "") {
    errors.push({ msg: "The COVID-19 recovery document is required" });
  }

  if (errors.length > 0) {
    console.log(errors);
    res.render("signup", {
      errors,
    });
  } else {
    geoDriver.addDonorToMap(donor, function (err, donorOnMap) {
      if (err || !donorOnMap.geometry.coordinates) {
        errors.push({ msg: "Could find address on map" });
        res.render("signup", {
          errors,
        });
      } else {
        console.log(`New user located at: ${donorOnMap.geometry.coordinates}`);

        fileStreamDriver.upload(file, function (uploadRes) {
          console.log(uploadRes);
          var newDonor = new Donor({
            _id: donorOnMap._id,
            firstname: donor.firstName,
            lastname: donor.lastName,
            email: donor.email,
            password: donor.password1,
            Blood: `${donor.bloodType} ${donor.Rh}`, // type plus Rh so A+
            Address: {
              line1: donor.inputAddress,
              line2: donor.inputAddress2,
              city: donor.city,
              state: donor.state,
              zip: donor.zip,
              location: {
                longitude: donorOnMap.geometry.coordinates[0],
                latitude: donorOnMap.geometry.coordinates[1],
              },
            },
            document: uploadRes,
          });
          //Register donor to database

          Donor.getDonorByEmail(newDonor.email, function (err, donor) {
            console.log("Checking for existing user");
            if (err) throw err; //throw error in case there is one
            if (donor) {
              //return done(null, false, {message: 'User already exists'});
              console.log("Found email");
              errors.push({
                msg:
                  "This email already exists. Please sign in if you're already registered",
              });
              res.render("signup", {
                errors,
              });
              //TODO: 2 flash message. One for  registering in database, one for sent email
            } else {
              Donor.createDonor(newDonor, function (err, donor) {
                if (err) throw err;
                console.log(`${donor.firstName} successfully registered!`);
                req.flash(
                  "success_msg",
                  "Welcome new donor! You have successfully registered. You may now login"
                );
                res.redirect("/login");
              });
            }
          });
        });
      }
    });
  }
});

router.get("/login", (req, res) => {
  console.log("login page");
  res.render("login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: "Incorrect Password! Try again",
  }),
  (req, res) => {
    console.log("successful login " + req.user.email);
    // console.log('locals app.js %j', res.locals)

    req.login(req.user, (error) => {
      if (error) return next(error);
      // res.locals.donor = req.user
      res.redirect("/");
    });
  }
);

router.get("/donors/:id", function (req, res) {
  // console.log(`Current donor ${req.locals.donor.firstname}`);
  console.log(`Donor: ${req.params.id}`);
  var id = req.params.id;
  Donor.find({ _id: id }, function (err, donor) {
    if (err || !donor) {
      var errors = [];
      errors.push({ msg: "Error finding donor" });
      res.render("main", {
        errors,
      });
    }
    console.log(donor);
    res.render("contactDonor", {
      donor: donor[0].firstname,
    });
  });
});

router.post("/donors/:id", function (req, res) {
  console.log(`Donor: ${req.params.id}`);
  var id = req.params.id;

  var user = {
    email: req.body.email,
    name: req.body.name,
    message: req.body.message,
  };

  var errors = new Array();
  if (!user.email || !user.name || !user.message) {
    errors.push({ msg: "Please fill in all fields" });
  }

  if (errors.length > 0) {
    Donor.find({ _id: id }, function (err, donor) {
      console.log(errors);
      if (err || !donor) {
        var errors = [];
        errors.push({ msg: "Error finding donor" });
        res.render("main", {
          errors,
        });
      }
      res.render("contactDonor", {
        donor: donor[0].firstname,
        errors: [{ msg: "Please fill in all fields" }],
      });
    });
  } else {
    //Send email
    Donor.find({ _id: id }, function (err, donor) {
      console.log(errors);
      if (err || !donor) {
        var errors = [];
        errors.push({ msg: "Error finding donor" });
        res.render("main", {
          errors,
        });
      }
      console.log(donor);
      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "recovery.plasma19@gmail.com",
          pass: "PSvita12!",
        },
      });
      console.log(`from: ${user.email}`);
      var mailOptions = {
        from: user.email,
        to: `${donor[0].email}, ${user.email}`,
        subject: `Plasma inquiry from ${user.name}`,
        html: `${user.message}<br><h4>Reply to ${user.name} at ${user.email}</h4>`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
          req.flash(
            "success_msg",
            "Donor contacted, they will respond over email"
          );
          res.redirect("/");
        }
      });
    });
  }
});

router.delete("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});

module.exports = router;
