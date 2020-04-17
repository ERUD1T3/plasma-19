// route for miscellaneous request
const Donor = require('../model/donor')
const fileStreamDriver = require("../drivers/fileStreamDriver");
const router = require('express').Router()


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
    Donor.aggregate([
        {
            $match: {
                verified: false,
            },
        }
    ], (error, unv_donors) => {
        if(error) {
            console.log(error);
            errors.push({
                msg: 'Error finding unverified donors'
            })
            res.render('admin', {
                errors
            })
        } else
        if(!unv_donors) {
            console.log('No unverified donors found')
            req.flash(
                "success_msg",
                "All Donors have been verified. No unverified donors!"
            )
            res.redirect('/')
        }
        else {
            console.log('rendiring list of unverified donors on front end')
            res.render('admin', {
                donors: unv_donors,
            })
        }
        
    })

    
})





module.exports = router;