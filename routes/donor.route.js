// route for user request
const router = require("express").Router();
const Donor = require("../model/donor");
const bcrypt = require("bcrypt");
var multiparty = require("connect-multiparty")();
const geoDriver = require("../drivers/geoDriver");
const fileStreamDriver = require("../drivers/fileStreamDriver");
const passport = require("passport");
const nodemailer = require("nodemailer");
const getCompatibleBlood = require("../utils/compatibleBlood");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const EARTH_RADIUS_MILES = 3963.2;
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
  Donor.find({}, function (err, raw_donors) {
    if (err) throw err;
    if (!raw_donors) {
      errors.push({
        msg: "Could not find donors",
      });
      res.render("main", {
        errors,
      });
    } else {
      console.log(raw_donors);
      let sdonors = [];
      for (let rdonor of raw_donors) {
        sdonors.push({
          _id: rdonor._id,
          firstname: rdonor.firstname,
          lastname: rdonor.lastname,
          blood: rdonor.blood,
          coordinates: rdonor.address.location.coordinates,
          verified: rdonor.verified,
        });
      }

      res.render("main", {
        donors: sdonors,
        logged_donor: req.user,
        lastQuery: {},
      });
    }
  });
});

router.get("/signup", (req, res) => {
  console.log("signup page");
  res.render("signup");
});

router.post("/signup", multiparty, async (req, res) => {
  //check for uploaded file, if yes ok, if not generate pdf based on form
  var file;
  var donor = req.body;
  if (donor.doc_avail == "positive") {
    file = req.files.proofDocument;
  } else {
    // gen pdf to uplad
    try {
      console.log("Trying generation for test proof...");
      //console.log(newDonor);
      doc = new PDFDocument();
      var pdfFile = `${donor.firstname}_${donor.lastname}_COVID-19_test.pdf`;
      var pdfStream = fs.createWriteStream(pdfFile);
      doc.font("Times-Italic").fontSize(10);
      doc.text(donor.firstname + " " + donor.lastname, 70, 600);
      doc.text(donor.test_location, 275, 600);
      doc.text(donor.test_date, 440, 600); //date
      doc.pipe(pdfStream);
      doc.end();
    } catch (err) {
      console.error("COVID-19 Pdf generation error: " + err.message);
      errors.push({
        msg: "Could not generate COVID-19 document",
      });
      res.render("signup", {
        errors,
      });
    }
    pdfStream.on("finish", function () {
      var pdfStats = fs.statSync(pdfFile);
      file = {
        name: `${donor.firstname}_${donor.lastname}_COVID-19_test.pdf`,
        path: pdfFile,
        size: pdfStats.size,
      };
    });
  }
  // console.log(file);
  // if (file.originalFilename == "") console.log("No file selected");
  console.log("posting user data to db");
  console.log("/////////////////////////////////////");
  console.log(donor.hipaa_signature);
  console.log("/////////////////////////////////////");
  console.log(`doc avail: ${donor.doc_avail}`);
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
      msg: "Please fill in all fields",
    });
  } else if (!donor.hipaa_signature) {
    errors.push({
      msg: "HIPAA release signature is required",
    });
  } else if (!donor.Rh) {
    errors.push({
      msg: "Please select blood type Rh",
    });
  } else if (donor.password1 != donor.password2) {
    errors.push({
      msg: "Passwords must match",
    });
  } else if (donor.doc_avail == "positive" && file.originalFilename == "") {
    errors.push({
      msg: "The COVID-19 recovery document is required",
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
          msg: "Could find address on map",
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
                type: "Point",
                coordinates: donorOnMap.geometry.coordinates,
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
              // Generate and upload HIPAA form
              try {
                console.log("Trying generation...");
                //console.log(newDonor);
                doc = new PDFDocument();
                var pdfFile = `${__dirname}/HIPAA/${newDonor.firstname}_${newDonor.lastname}_P19_HIPAA.pdf`;
                var pdfStream = fs.createWriteStream(pdfFile);
                doc.image(__dirname + "/HIPAA/PLASMA19_HIPAA.png", 0, 0, {
                  width: 612,
                });
                doc.font("Times-Italic").fontSize(10);
                doc.text(newDonor.firstname + " " + newDonor.lastname, 70, 600);
                doc.text(
                  newDonor.firstname[0] + "." + newDonor.lastname[0],
                  275,
                  600
                );
                doc.text(Date().split("(")[0], 440, 600); //date
                doc.pipe(pdfStream);
                doc.end();
              } catch (err) {
                console.log(newDonor);
                console.error("Pdf generation error: " + err.message);
                errors.push({
                  msg: "Could not generate HIPAA document",
                });
                res.render("signup", {
                  errors,
                });
              }

              pdfStream.on("finish", function () {
                var pdfStats = fs.statSync(pdfFile);
                var hippa_file = {
                  name: `${newDonor.firstname}_${newDonor.lastname}_P19_HIPAA.pdf`,
                  path: pdfFile,
                  size: pdfStats.size,
                };
                console.log(hippa_file);
                fileStreamDriver.upload(hippa_file, function (uploadRes) {
                  console.log(uploadRes);
                  newDonor.HIPAA_file = uploadRes;
                  //Push new user to DB
                  Donor.createDonor(newDonor, function (err, donor) {
                    if (err) throw err;
                    console.log(`${donor.firstname} successfully registered!`);
                    req.flash(
                      "success_msg",
                      "Welcome new donor! You have successfully registered. You may now login"
                    );
                    res.redirect("/login");
                  });
                });
              });
              //pdfStream.on('error', function())
            }
          });
        });
      }
    });
  }
});
router.get("/view/PDF", function (req, res) {
  // PDF stuff testing
  // Generate and upload HIPAA form
  try {
    doc = new PDFDocument();
    var pdfFile = __dirname + "/plasma-19_HIPAA.pdf";
    var pdfStream = fs.createWriteStream(pdfFile);
    // doc.pipe(fs.createWriteStream("plasma-19_HIPAA.pdf"));
    doc.image(__dirname + "/PLASMA19_HIPAA.png", 0, 0, {
      width: 612,
    });
    doc.font("Times-Italic").fontSize(10);
    // doc.text(donor.firstname + " " + donor.lastname, 23, 230);
    // doc.text(donor.firstname[0] + "." + donor.lastname[0], 95, 230);
    doc.text("Pascal Dao", 70, 600);
    doc.text("P.D", 275, 600);
    doc.text(Date().split("(")[0], 440, 600); //date
    doc.pipe(pdfStream);
    doc.end();
  } catch (err) {
    console.error("Pdf generation error: " + err.message);
  }

  pdfStream.on("finish", function () {
    res.download(pdfFile);
  });
  console.log("View PDF");
  res.render("downloadPDF");
});

router.get("/download/PDF/:_id/:name", function (req, res) {
  let file_id = req.params._id;
  console.log(`file id: ${file_id}`);
  fileStreamDriver.download(file_id, res, function (downloadRes) {
    console.log(`Download res: ${downloadRes}`);
  });
});

router.get("/login", (req, res) => {
  console.log("login page");
  res.render("login");
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    var errors = [];
    if (err) {
      console.log(err);
      // errors.push({msg: "Password incorrect"})
    }

    if (!user) {
      errors.push({
        msg: "Incorrect Password or Email",
      });
      return res.render("login", {
        errors,
      });
    }

    console.log("successful login " + user.email);
    // console.log('locals app.js %j', res.locals)
    var errors = [];

    req.login(user, (error) => {
      if (error) {
        errors.push({
          msg: "Error login in",
        });
        res.render("login", {
          errors,
        });
        return next(error);
      }
      // res.locals.logged_donor = req.user
      res.redirect("/");
    });
  })(req, res, next);
});

router.get("/donors/:id/:dst", function (req, res) {
  // console.log(`Current donor ${req.locals.logged_donor.firstname}`);
  console.log(`Donor: ${req.params.id}`);
  var id = req.params.id;
  Donor.find(
    {
      _id: id,
    },
    function (err, donor) {
      if (err || !donor) {
        var errors = [];
        errors.push({
          msg: "Error finding donor",
        });
        res.render("main", {
          errors,
          lastQuery: {},
        });
      }
      donor[0].dst = parseFloat(req.params.dst).toPrecision(3);
      console.log(donor);
      res.render("contactdonor", {
        donor: donor[0],
      });
    }
  );
});

router.post("/donors/:id/:dst", function (req, res) {
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
      msg: "Please fill in all fields",
    });
  }

  if (errors.length > 0) {
    Donor.find(
      {
        _id: id,
      },
      function (err, donor) {
        console.log(errors);
        if (err || !donor) {
          var errors = [];
          errors.push({
            msg: "Error finding donor",
          });
          res.render("main", {
            errors,
            lastQuery: {},
          });
        }
        donor[0].dst = parseFloat(req.params.dst).toPrecision(3);
        res.render("contactdonor", {
          donor: donor[0],
          errors: [
            {
              msg: "Please fill in all fields",
            },
          ],
        });
      }
    );
  } else {
    //Send email
    Donor.find(
      {
        _id: id,
      },
      function (err, donor) {
        console.log(errors);
        if (err || !donor) {
          var errors = [];
          errors.push({
            msg: "Error finding donor",
          });
          res.render("main", {
            errors,
            lastQuery: {},
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
      }
    );
  }
});

router.delete("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});

router.get("/donor/update-password", checkAuthenticated, (req, res) => {
  console.log("update password");
  res.render("updatepassword");
});

router.put("/donor/update-password", (req, res) => {
  // var file = req.files.proofDocument;
  // console.log(file);
  // if (file.originalFilename == "") console.log("No file selected");
  console.log("posting user data to db");
  donor = req.body;

  let errors = [];
  if (!donor.password1 || !donor.password2) {
    errors.push({
      msg: "Please fill in all fields",
    });
  } else if (donor.password1 != donor.password2) {
    errors.push({
      msg: "Passwords must match",
    });
  }

  if (errors.length > 0) {
    console.log(errors);
    res.render("updatepassword", {
      errors,
    });
  } else {
    try {
      let logged_email = res.locals.logged_donor.email;
      Donor.getDonorByEmail(logged_email, async (error, updatedDonor) => {
        if (error) {
          console.log("Error finding donor");
          errors.push({
            msg: "Error finding Donor ",
          });
          return res.render("updatepassword", {
            errors,
          });
        }

        try {
          //check old password
          // console.log(`login password: ${donor.oldpassword} \n stored password: ${updateDonor.password}`)

          await bcrypt.compare(
            donor.oldpassword,
            updatedDonor.password,
            async (error, isMatch) => {
              if (isMatch) {
                // return done(null, donor)
                console.log(`Updated password: ${donor.password1}`);
                let hash = await bcrypt.hash(donor.password1, 10);
                console.log(`hash: ${hash}`);
                updatedDonor.password = hash;

                console.log(`Update user: ${updatedDonor}`);
                await updatedDonor.save();
                req.flash("success_msg", "Password Updated");
                res.redirect("/");
              } else {
                console.log("Password incorrect!");
                errors.push({
                  msg: "Password Incorrect",
                });
                res.render("updatepassword", {
                  errors,
                });
              }
            }
          );
        } catch (error) {}
      });
    } catch (error) {
      console.log("error");
      errors.push({
        msg: "Error updating your profile",
      });
      res.render("updatepassword", {
        errors,
      });
    }
  }
});

router.get("/donor/password-recovery", (req, res) => {
  // console.log('forgot password')
  res.render("pdrecovery");
});

router.get("/donor/password-recovery/:_id", (req, res) => {
  // console.log('forgot password')
  res.render("updatepdwid", {
    donor_id: req.params._id,
  });
});

router.post("/donor/password-recovery/:_id", (req, res) => {
  // console.log('forgot password')

  Donor.findById(
    {
      _id: req.params._id,
    },
    async (err, recDonor) => {
      let donor = req.body;
      let errors = [];
      if (err || !recDonor) {
        errors.push({
          msg: "Error finding donor for recovery",
        });
        return res.render("updatepdwid", {
          errors,
        });
      }

      if (!donor.password1 || !donor.password2) {
        errors.push({
          msg: "Please fill in all fields",
        });
      } else if (donor.password1 != donor.password2) {
        errors.push({
          msg: "Passwords must match",
        });
      }

      if (errors.length > 0) {
        console.log(errors);
        res.render("updatepdwid", {
          errors,
          donor_id: req.params._id,
        });
      } else {
        try {
          //check old password
          // console.log(`login password: ${donor.oldpassword} \n stored password: ${updateDonor.password}`)

          await bcrypt.compare(
            donor.oldpassword,
            recDonor.password,
            async (error, isMatch) => {
              if (isMatch) {
                // return done(null, donor)
                console.log(`Updated password: ${donor.password1}`);
                let hash = await bcrypt.hash(donor.password1, 10);
                console.log(`hash: ${hash}`);
                recDonor.password = hash;

                console.log(`Update user: ${recDonor}`);
                await recDonor.save();
                req.flash("success_msg", "Password Updated");
                res.redirect("/login");
              } else {
                console.log("Password incorrect!");
                errors.push({
                  msg: "Password Incorrect",
                });
                res.render("updatepdwid", {
                  donor_id: req.params._id,
                  errors,
                });
              }
            }
          );
        } catch (error) {}
      }
    }
  );
});

router.post("/donor/password-recovery", (req, res) => {
  console.log("forgot password");

  console.log(`recovery email: ${req.body.email}`);
  var errors = [];
  Donor.getDonorByEmail(req.body.email, async (error, updatedDonor) => {
    if (error) {
      console.log(error);
    }

    if (!updatedDonor) {
      errors.push({
        msg: "No Donor account with this email",
      });
      res.render("pdrecovery", {
        errors,
      });
    } else {
      // generate temporary password
      var randomstring = Math.random().toString(36).slice(-8);
      let emailMsg = "Recovery Password: " + randomstring;

      let hash = await bcrypt.hash(randomstring, 10);
      console.log(`hash: ${hash}`);
      updatedDonor.password = hash.toString();
      await updatedDonor.save();

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "recovery.plasma19@gmail.com",
          pass: "PSvita12!",
        },
      });
      var user = {
        email: updatedDonor.email,
        name: `${updatedDonor.firstname} ${updatedDonor.lastname}`,
        // message: req.body.message,
      };
      console.log(`from: ${user.email}`);
      var mailOptions = {
        from: user.email,
        to: `${updatedDonor.email}`,
        subject: `Password Recovery--Plasma-19`,
        html: `
        <br><br>
        <h3>Plasma-19 Support</h3>
        <br>
        <i> Follow the link below and use the recovery password to update your password</i>
        <br>
        <b>${emailMsg}</b>
        <br>
        <a href='https://plasma-19.com/donor/password-recovery/${updatedDonor._id}'>
          Upate my password
        </a>
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
            `Recovery password sent to ${updatedDonor.email}`
          );
          res.redirect("/");
        }
      });
    }
  });
});

router.get("/donor/edit", (req, res) => {
  console.log("edit my user " + req.user.firstname);
  res.render("edit");
});

router.put("/donor/edit", multiparty, (req, res) => {
  var file = req.files.proofDocument;

  console.log("posting user data to db");
  var donor_edit = req.body;
  var errors = [];
  if (
    !donor_edit.firstname ||
    !donor_edit.lastname ||
    !donor_edit.inputaddress ||
    !donor_edit.city ||
    !donor_edit.zip
  ) {
    errors.push({
      msg: "Please fill in all fields",
    });
  } else if (!donor_edit.Rh) {
    errors.push({
      msg: "Please select blood type Rh",
    });
  }

  if (errors.length > 0) {
    console.log(errors);
    return res.render("edit", {
      errors,
    });
  }

  try {
    let logged_email = res.locals.logged_donor.email;
    Donor.getDonorByEmail(logged_email, (error, updatedDonor) => {
      if (error) {
        console.log("Error finding donor");
        errors.push({
          msg: "Error finding Donor ",
        });
        return res.render("edit", {
          errors,
        });
      }

      // let donor = req.body
      updatedDonor.firstname = donor_edit.firstname;
      updatedDonor.lastname = donor_edit.lastname;
      updatedDonor.blood = `${donor_edit.bloodType} ${donor_edit.Rh}`;
      updatedDonor.address.line1 = donor_edit.inputaddress;
      updatedDonor.address.line2 = donor_edit.inputaddress2;
      updatedDonor.address.city = donor_edit.city;
      updatedDonor.address.state = donor_edit.state;
      updatedDonor.address.zip = donor_edit.zip;

      geoDriver.addDonorToMap(donor_edit, function (err, donorOnMap) {
        if (err || !donorOnMap.geometry.coordinates) {
          errors.push({
            msg: "Could find address on map",
          });
          res.render("edit", {
            errors,
          });
        } else {
          console.log(
            `New user located at: ${donorOnMap.geometry.coordinates}`
          );
          console.log(updatedDonor);
          updatedDonor.address.location.coordinates[0] =
            donorOnMap.geometry.coordinates[0];
          updatedDonor.address.location.coordinates[1] =
            donorOnMap.geometry.coordinates[1];

          // console.error('file: %j', file)
          if (file.size != 0) {
            fileStreamDriver.upload(file, function (uploadRes) {
              console.log(uploadRes);
              updatedDonor.document = uploadRes;
              console.log(`Update user: ${updatedDonor}`);
              updatedDonor.save();
              req.flash("success_msg", "Profile Updated");
              res.redirect("/donor/edit");
            });
          } else {
            console.log(`Update user: ${updatedDonor}`);
            updatedDonor.save();
            req.flash("success_msg", "Profile Updated");
            res.redirect("/donor/edit");
          }
        }
      });
    });
  } catch (error) {
    console.log("error");
    errors.push({
      msg: "Error updating your profile",
    });
    res.render("edit", {
      errors,
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

router.post("/", function (req, res) {
  var errors = [];
  console.log("Finding...");
  var coordinates = [];
  var coordStr = req.body.position.split(",");
  coordinates[0] = parseFloat(coordStr[0]);
  coordinates[1] = parseFloat(coordStr[1]);
  console.log(`Coordinates: ${coordinates}`);
  let rxrange = parseFloat(req.body.queryRange);

  if (isNaN(rxrange)) {
    rxrange = 100000000; // big radius
  }

  var query = {
    bloodType: req.body.bloodType,
    Rh: req.body.Rh,
    blood: `${req.body.bloodType} ${req.body.Rh}`,
    range: rxrange,
    userPos: coordinates,
  };

  if (isNaN(coordStr[0]) || isNaN(coordStr[1])) {
    errors.push({
      msg: "Could not find your GPS location, Please allow GPS location",
    });
    return res.render("main", {
      errors,
      donors: [],
      lastQuery: {
        bloodType: query.bloodType,
        Rh: query.Rh,
        range: query.range,
      },
    });
  }

  // console.log(`query.blood = ${query.blood}`)
  if (
    query.blood.split(" ")[0] == "Choose..." ||
    query.blood.split(" ")[1] == "undefined"
  ) {
    errors.push({
      msg: "Invalid filter. Add a Blood Type and an Rh",
    });
    res.render("main", {
      errors,
      donors: [],
      lastQuery: {
        bloodType: query.bloodType,
        Rh: query.Rh,
        range: query.range,
      },
    });
  } else {
    console.log(query);
    if (req.body.isSpecSearch == "true") {
      Donor.aggregate(
        [
          {
            $match: {
              "address.location.coordinates": {
                $geoWithin: {
                  $centerSphere: [
                    [query.userPos[0], query.userPos[1]],
                    query.range / EARTH_RADIUS_MILES,
                  ],
                },
              },
            },
          },
          {
            $match: {
              blood: query.blood,
            },
          },
        ],
        function (err, raw_donors) {
          if (err || !raw_donors) {
            console.log(err);
            var errors = [];
            errors.push({
              msg: "Error finding donors",
            });
            res.render("main", {
              errors,
              lastQuery: {},
            });
          }
          if (raw_donors.length == 0) {
            var errors = [];
            errors.push({
              msg: "No Donors match your filter",
            });
            res.render("main", {
              raw_donors,
              errors,
              lastQuery: {
                bloodType: query.bloodType,
                Rh: query.Rh,
                range: query.range,
              },
            });
          } else {
            console.log("Found donors!");
            console.log(raw_donors);
            console.log(`Found: ${raw_donors.length}`);

            let sdonors = [];
            for (let rdonor of raw_donors) {
              sdonors.push({
                _id: rdonor._id,
                firstname: rdonor.firstname,
                lastname: rdonor.lastname,
                blood: rdonor.blood,
                coordinates: rdonor.address.location.coordinates,
                verified: rdonor.verified,
              });
            }

            res.render("main", {
              donors: sdonors,
              lastQuery: {
                bloodType: query.bloodType,
                Rh: query.Rh,
                range: query.range,
              },
            });
          }
        }
      );
    } else {
      // it is a compatibility search
      let compBloods = getCompatibleBlood(query.blood);
      console.log(`Compatible bloods ${compBloods}`);
      Donor.aggregate(
        [
          {
            $match: {
              "address.location.coordinates": {
                $geoWithin: {
                  $centerSphere: [
                    [query.userPos[0], query.userPos[1]],
                    query.range / EARTH_RADIUS_MILES,
                  ],
                },
              },
            },
          },
          {
            $match: {
              blood: {
                $in: compBloods,
              },
            },
          },
        ],
        function (err, raw_donors) {
          if (err || !raw_donors) {
            console.log(err);
            var errors = [];
            errors.push({
              msg: "Error finding donors",
            });
            res.render("main", {
              errors,
              lastQuery: {},
            });
          }
          if (raw_donors.length == 0) {
            var errors = [];
            errors.push({
              msg: "No Donors match your filter",
            });
            res.render("main", {
              raw_donors,
              errors,
              lastQuery: {
                bloodType: query.bloodType,
                Rh: query.Rh,
                range: query.range,
              },
            });
          } else {
            console.log("Found donors!");
            console.log(raw_donors);
            console.log(`Found: ${raw_donors.length}`);

            let sdonors = [];
            for (let rdonor of raw_donors) {
              sdonors.push({
                _id: rdonor._id,
                firstname: rdonor.firstname,
                lastname: rdonor.lastname,
                blood: rdonor.blood,
                coordinates: rdonor.address.location.coordinates,
                verified: rdonor.verified,
              });
            }

            res.render("main", {
              donors: sdonors,
              lastQuery: {
                bloodType: query.bloodType,
                Rh: query.Rh,
                range: query.range,
              },
            });
          }
        }
      );
    }
  }
});

module.exports = router;
