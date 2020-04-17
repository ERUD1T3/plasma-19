// route for miscellaneous request
const Donor = require('../model/donor')
const fileStreamDriver = require("../drivers/fileStreamDriver");
const router = require('express').Router()

// add login page for admin


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

router.get("/ssadmin", (req, res) => {
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
        } else
        if (!unv_donors) {
            console.log('No unverified donors found')
            req.flash(
                "success_msg",
                "All Donors have been verified. No unverified donors!"
            )
            res.redirect('/')
        } else {
            console.log('rendiring list of unverified donors on front end')
            res.render('admin', {
                donors: unv_donors,
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