// route for miscellaneous request
const Donor = require('../model/donor')
const fileStreamDriver = require("../drivers/fileStreamDriver");
const router = require('express').Router()
const bcrypt = require("bcrypt");

// add login page for admin

var ADMIN_PASSWORD

(async function setAdminPassword() {
    try {
       ADMIN_PASSWORD = await bcrypt.hash('realNerda', 10)
    } catch (error) {
        console.error(error);
    }
})();

// const ADMIN_PASSWORD = 'realNerda'
var allowed = false


router.get("/", (req, res) => {
    console.log("Covid 19 info page");
    //res.send("hello world")
    res.render("info");
});

router.get("/team", (req, res) => {
    console.log("contact about team behind the app");
    //res.send("hello world")
    res.render("contactus");
});

router.get("/ssadmin/login", (req, res) => {
    console.log('bitch, do you even have access?')
    res.render("adminlogin")
})

router.post("/ssadmin/login", async (req, res) => {
    let password = req.body.password
    var errors = [];
    console.log('password ' +password)
    // console.log(ADMIN_PASSWORD)
    try {
        await bcrypt.compare(
            password, 
            ADMIN_PASSWORD, 
            (err, isMatch) => {
                if(isMatch) {
                // if(password === ADMIN_PASSWORD) {
                    console.log('Ok nerda, you in!')
                    allowed = true
                    // req.flash("success_msg", "Ok nerda, you in!");
                    res.redirect("/info/ssadmin");

                } else {
                    errors.push({
                        msg: 'B*tch, thats what I tought, Now begone!'
                    })
                    res.render('adminlogin', {
                        errors
                    })
                }
            }
        )
    } catch(error) {
        console.log(error)
        errors.push({
            msg: 'B*tch, thats what I tought, Now begone!'
        })
        res.render('adminlogin', {
            errors
        })
    }
})

router.get("/ssadmin", (req, res, next)=>{
    if(allowed) {
        allowed = false
        return next()
    }
    res.redirect('/info/ssadmin/login');
},(req, res) => {
    console.log("found admin page")
    var errors = [];
    // getting list of donors 
    Donor.aggregate([{
        $match: {
            verified: false,
        },
    }], (error, unv_donors) => {
        if (error) {
            console.log(error);
            errors.push({
                msg: 'Error finding unverified donors'
            })
            res.render('admin', {
                errors
            })
        } else {
            Donor.find((error, alldonors) => {
                if(error || !alldonors) {
                    console.log('Error finding donors')
                    errors.push({
                        msg: 'Error finding donors'
                    })
                    res.render('admin', {
                        errors
                    })
                } else 
                if (!unv_donors) {
                    console.log('No unverified donors found')
                    req.flash(
                        "success_msg",
                        "All Donors have been verified. No unverified donors!"
                    )
                    res.render('admin', {
                        donors: null,
                        alldonors: alldonors
                    })
                } else {
                    console.log('rendiring list of unverified donors on front end')
        
                    res.render('admin', {
                        donors: unv_donors,
                        alldonors: alldonors
                    })
                }
            })
        }
        
    })
})

router.post("/ssadmin", (req, res) => {
    console.log('updating donors verified status')
    var errors = [];
    let emails = req.body.vchecks

    if (typeof emails === 'string') {
        emails = [emails]
    }


    // update the users to be verified
    console.log('List of emails');
    console.log(emails)

    for (let email of emails) {
        Donor.getDonorByEmail(email, (error, donor) => {
            if (error) {
                console.log(error);
                errors.push({
                    msg: 'Error finding to Update status'
                })
                return res.render('admin', {
                    errors
                })
            }

            if (!donor) {
                console.log('Could not find donor' + email);
                errors.push({
                    msg: 'Could not find donor' + email
                })
                return res.render('admin', {
                    errors
                })
            }

            donor.verified = true;
            donor.save()
            console.log(`Donor ${donor.firstname} ${donor.lastname} Verified`)


        })
    }
    req.flash("success_msg", "Donor(s) Verified");
    res.redirect('/info/ssadmin')
})


router.get("/download/:file_id/:name", function (req, res) {
    let file_id = req.params.file_id;
    console.log(`file id: ${file_id}`);
    fileStreamDriver.download(file_id, res, function (downloadRes) {
        console.log(`Download res: ${downloadRes}`);
    });
    // res.redirect('/donor/edit')
});



module.exports = router;