// route for user request
const router = require("express").Router();
const Donor = require("../model/donor");
// const bcrypt = require('bcrypt')
const passport = require('passport')
const {
  initialize, 
  checkAuthenticated,
  checkNotAuthenticated
} = require('../configs/passport.config')
initialize(passport)


router.get("/", (req, res) => {
  console.log("Root page");
  //res.send("hello world")

  // Donor.find({}, function(err, ))
  
  console.log(`locals ${req.user}`)
  res.render("main", {
    donor: req.user
  });
});

router.get("/signup", (req, res) => {
  console.log("signup page");
  res.render("signup");
});

router.post("/signup", async (req, res) => {
  console.log("posting user data to db");
  donor = req.body;
  console.log(donor);
  console.log(donor.longitude, donor.latitude)

  let errors = [];
  if (
    !donor.firstName ||
    !donor.lastName ||
    !donor.email ||
    !donor.password1 ||
    !donor.password2 ||
    donor.bloodType == "Choose..." ||
    !donor.inputAddress ||
    !donor.inputAddress2 ||
    !donor.city ||
    donor.state == "Choose..." ||
    !donor.city
  ) {
    errors.push({ msg: "Please fill in all fields" });
  } else if (!donor.Rh) {
    errors.push({ msg: "Please select blood type Rh" });
  } else if (donor.password1 != donor.password2) {
    errors.push({ msg: "Passwords must match" });
  } 
  else if (
    !donor.longitude ||
    !donor.latitude
  ) {
    errors.push({msg: "error extracting GPS coordinates"});
  }

  if (errors.length > 0) {
    console.log(errors);
    res.render("signup", {
      errors,
    });
  } else {
    
    //Register donor
    var newDonor = new Donor({
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
          longitude: donor.longitude,
          latitude: donor.latitude
        },
      },
    });

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
  }
});

router.get("/login", (req, res) => {
  console.log("login page");
  res.render("login");
});


router.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Incorrect Password! Try again'
}), (req, res) => {
  console.log('successful login ' + req.user.email)
  // console.log('locals app.js %j', res.locals)

  req.login(req.user, (error) => {
      if (error) return next(error)
      // res.locals.donor = req.user
      res.redirect('/')
  })
});



router.delete('/logout', (req, res) => {
  req.logout()
  res.redirect('/login')
})

module.exports = router;
