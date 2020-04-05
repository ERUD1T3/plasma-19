// route for user request
const router = require("express").Router();

router.get("/", (req, res) => {
  console.log("Root page");
  //res.send("hello world")
  res.render("main");
});


router.get("/signup", (req,res) => {
  console.log('signup page')
  res.render('signup')
})


router.post("/signup", async (req, res) => {
  console.log('posting user data to db')
  res.redirect('login')
})


router.get("/login", (req, res) => {
  console.log('login page')
  res.render('login')
})


router.post("/login", (req, res) => {
  console.log('Posting log in data to db ')
})

module.exports = router;
