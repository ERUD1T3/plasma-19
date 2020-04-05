// route for user request
const router = require('express').Router()

router.get('/', (req, res) => {
    console.log('Root page')
    res.send("hello world")
    // res.render('main')
})




module.exports = router;