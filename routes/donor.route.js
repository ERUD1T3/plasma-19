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
  console.log(`locals ${res.locals.logged_donor}`);
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
        logged_donor: req.user
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
    !donor.firstname ||
    !donor.lastname ||
    !donor.email ||
    !donor.password1 ||
    !donor.password2 ||
    donor.bloodType == "Choose..." ||
    !donor.inputaddress ||
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
            firstname: donor.firstname,
            lastname: donor.lastname,
            email: donor.email,
            password: donor.password1,
            blood: `${donor.bloodType} ${donor.Rh}`, // type plus Rh so A+
            address: {
              line1: donor.inputaddress,
              line2: donor.inputaddress2,
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
                console.log(`${donor.firstname} successfully registered!`);
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

router.post("/login", (req, res, next) => {

  passport.authenticate("local", (err, user, info) => {
    var errors = []
    if (err) {
      console.log(err)
      // errors.push({msg: "Password incorrect"})
    }

    if (!user) {
      errors.push({
        msg: "Incorrect Password or Email"
      })
      return res.render('login', {
        errors
      })
    }

    console.log("successful login " + user.email);
    // console.log('locals app.js %j', res.locals)
    var errors = [];

    req.login(user, (error) => {
      if (error) {
        errors.push({
          msg: "Error login in"
        })
        res.render("login", {
          errors,
        })
        return next(error);
      }
      // res.locals.logged_donor = req.user
      res.redirect("/");
    });
  })(req, res, next);
});

router.get("/donors/:id", function (req, res) {
  // console.log(`Current donor ${req.locals.logged_donor.firstname}`);
  console.log(`Donor: ${req.params.id}`);
  var id = req.params.id;
  Donor.find({
    _id: id
  }, function (err, donor) {
    if (err || !donor) {
      var errors = [];
      errors.push({
        msg: "Error finding donor"
      });
      res.render("main", {
        errors,
      });
    }
    console.log(donor);
    res.render("contactdonor", {
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
    errors.push({
      msg: "Please fill in all fields"
    });
  }

  if (errors.length > 0) {
    Donor.find({
      _id: id
    }, function (err, donor) {
      console.log(errors);
      if (err || !donor) {
        var errors = [];
        errors.push({
          msg: "Error finding donor"
        });
        res.render("main", {
          errors,
        });
      }
      res.render("contactdonor", {
        donor: donor[0].firstname,
        errors: [{
          msg: "Please fill in all fields"
        }],
      });
    });
  } else {
    //Send email
    Donor.find({
      _id: id
    }, function (err, donor) {
      console.log(errors);
      if (err || !donor) {
        var errors = [];
        errors.push({
          msg: "Error finding donor"
        });
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


router.get('/donor/password-recovery', (req, res) => {
  // console.log('forgot password')
  res.render('pdrecovery')
})

router.post('/donor/password-recovery', (req, res) => {
  console.log('forgot password')

  var errors = []
  Donor.getDonorByEmail(req.body.email, (error, donor) => {
    if (error) {
      console.log(error)
    }

    if (!donor) {
      errors.push({
        msg: 'No Donor account with this email'
      })
      res.render('pdrecovery', {
        errors
      })
    } else {

      // generate temporary password
      var randomstring = Math.random().toString(36).slice(-8)
      const emailMsg = 'Recovery Password: ' + randomstring

      const hash = bcrypt.hash(randomstring, 10)

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
        to: `${donor.email}`,
        subject: `Password Recovery--Plasma-19`,
        html: `
        <br><br>
        <h3>Plasma-19 Support</h3>
        <br>
        <i> Use the password below to login and update your password</i>
        <b>${ emailMsg }</b>
        <p> Plasma-19 Team </p>
        `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
          req.flash(
            "success_msg",
            `Recovery password sent to ${donor.email}`
          );
          res.redirect("/");
        }
      });
    }
  })
})


router.get('/donor/edit', (req, res) => {
  console.log('edit my user ' + req.user.firstname)
  res.render('edit')
})

router.put("/donor/edit", multiparty, (req, res) => {
  var file = req.files.proofDocument;

  console.log("posting user data to db");
  var donor_edit = req.body;
  var errors = []
  if (
    !donor_edit.firstname ||
    !donor_edit.lastname ||
    !donor_edit.inputaddress ||
    !donor_edit.city ||
    !donor_edit.zip
  ) {
    errors.push({
      msg: "Please fill in all fields"
    });
  } else if (!donor_edit.Rh) {
    errors.push({
      msg: "Please select blood type Rh"
    });
  }

  if (errors.length > 0) {
    console.log(errors);
    return res.render("edit", {
      errors,
    });
  }

  try {

    let logged_email = res.locals.logged_donor.email
    Donor.getDonorByEmail(logged_email, (error, updatedDonor) => {

      if(error) {
        console.log('Error finding donor')
        errors.push({ msg: 'Error finding Donor '})
        return res.render("edit", {
          errors,
        });
      }

      // let donor = req.body
      updatedDonor.firstname = donor_edit.firstname
      updatedDonor.lastname = donor_edit.lastname
      updatedDonor.blood = `${donor_edit.bloodType} ${donor_edit.Rh}`
      updatedDonor.address = {
        line1: donor_edit.inputaddress,
        line2: donor_edit.inputaddress2,
        city: donor_edit.city,
        state: donor_edit.state,
        zip: donor_edit.zip
      }


      geoDriver.addDonorToMap(donor_edit, function (err, donorOnMap) {
        if (err || !donorOnMap.geometry.coordinates) {
          errors.push({
            msg: "Could find address on map"
          });
          res.render("edit", {
            errors
          });
        } else {
          console.log(`New user located at: ${donorOnMap.geometry.coordinates}`);

          updatedDonor.address.location.longitude = donorOnMap.geometry.coordinates[0]
          updatedDonor.address.location.latitude = donorOnMap.geometry.coordinates[1]

          // console.error('file: %j', file)
          if (file.size != 0) {
            fileStreamDriver.upload(file, function (uploadRes) {
              console.log(uploadRes)
              updatedDonor.document = uploadRes
              console.log(`Update user: ${updatedDonor}`)
              updatedDonor.save()
              req.flash(
                "success_msg",
                'Profile Updated'
              );
              res.redirect('/donor/edit')
            });
          } else {
            console.log(`Update user: ${updatedDonor}`)
              updatedDonor.save()
              req.flash(
                "success_msg",
                'Profile Updated'
              );
              res.redirect('/donor/edit')
          }
          
        }
      });

    })
  } catch (error) {
    console.log('error')
    errors.push({
      msg: 'Error updating your profile'
    })
    res.render("edit", {
      errors
    });
  }
});



router.get("/download/:file_id/:name", function (req, res) {
  let file_id = req.params.file_id;
  console.log(`file id: ${file_id}`);
  fileStreamDriver.download(file_id, res, function (downloadRes) {
    console.log(`Download res: ${downloadRes}`);
  });
  // res.redirect('/donor/edit')
});



module.exports = router;