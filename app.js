// main file for the app
'use strict'
require('dotenv').config();

const express = require('express')

const layouts = require('express-ejs-layouts')
const bodyParser = require('body-parser')
const app = express()
const server = require('http').Server(app)

// settings
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views/')
app.set('layout', 'root/layout') // not a file path; does a lookpu

app.use(layouts)
app.use(express.static(__dirname + '/public')) // serving frontend file; index.html is starting point
app.use(express.json()) // middleware to read json
app.use(bodyParser.urlencoded({
    limit: '5mb',
    extended: false
}))

const donor_route = require('./routes/donor.route')
const misc_route = require('./routes/misc.route')
app.use('/', donor_route)
app.use('/info', misc_route)

server.listen(process.env.PORT, (error) => {
    console.log((error) ? error : `***Plasma-19***\nServer up on ${process.env.PORT}`)
})