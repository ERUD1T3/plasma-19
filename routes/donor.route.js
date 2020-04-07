// route for user request
const router = require("express").Router();
const Donor = require("../model/donor");
// const bcrypt = require('bcrypt')
var multiparty = require("connect-multiparty")();
const geoDriver = require("../drivers/geoDriver");
const fileStreamDriver = require("../drivers/fileStreamDriver");
const passport = require("passport");
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
      errors.push({
        msg: "Could not find donors"
      });
      res.render("main", {
        errors
      });
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
    !donor.zip
  ) {
    errors.push({
      msg: "Please fill in all fields"
    });
  } else if (!donor.Rh) {
    errors.push({
      msg: "Please select blood type Rh"
    });
  } else if (donor.password1 != donor.password2) {
    errors.push({
      msg: "Passwords must match"
    });
  } else if (file.originalFilename == "") {
    errors.push({
      msg: "The COVID-19 recovery document is required"
    });
  }

  if (errors.length > 0) {
    console.log(errors);
    res.render("signup", {
      errors,
    });
  } else {
    geoDriver.addDonorToMap(donor, function (err, donorOnMap) {
      if (err || !donorOnMap.geometry.coordinates) {
        errors.push({
          msg: "Could find address on map"
        });
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
                msg: "This email already exists. Please sign in if you're already registered",
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
  console.log(`Donor: ${req.params.id}`);
  var id = req.params.id;
  res.render("contactDonor", {
    id,
  });
});

router.delete("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});

router.get('/donor/edit', (req, res) => {
  console.log('edit my user ' + req.user.firstname)
  res.render('edit')
})

// TODO: handle password change and forgotten password
router.get('/donor/changepassword', (req, res) => {
  console.log('forgot password')
  // res.render('')
})


router.put("/donor/edit", multiparty, async (req, res) => {


  var file = req.files.proofDocument;
 
  console.log("posting user data to db");
  donor = req.body;

  let updatedDonor = res.locals.donor

  updatedDonor.firstname = donor.firstname
  updatedDonor.lastname = donor.lastname
  updatedDonor.Blood = `${donor.bloodType} ${donor.Rh}`
  updatedDonor.Address = {
    line1: donor.inputAddress,
    line2: donor.inputAddress2,
    city: donor.city,
    state: donor.state,
    zip: donor.zip
  }
  
  
  geoDriver.addDonorToMap(donor, function (err, donorOnMap) {
    if (err || !donorOnMap.geometry.coordinates) {
      errors.push({
        msg: "Could find address on map"
      });
      res.render("edit", {
        errors,
      });
    } else {
      console.log(`New user located at: ${donorOnMap.geometry.coordinates}`);

      updatedDonor.Address.location.longitude = donorOnMap.geometry.coordinates[0]
      updatedDonor.Address.location.latitude = donorOnMap.geometry.coordinates[1]

      if (file) {
        fileStreamDriver.upload(file, function (uploadRes) {
          console.log(uploadRes)
          updatedDonor.document = uploadRes
          
        });
      }
    }
  });

  updatedDonor.save()
  res.redirect('/login')
});



module.exports = router;