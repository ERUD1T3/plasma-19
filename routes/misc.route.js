// route for miscellaneous request
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






module.exports = router;