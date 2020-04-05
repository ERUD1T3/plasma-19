// main file for the app
'use strict'
require('dotenv').config();

const express = require('express')
const mongoose = require('mongoose')
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



async function DBconnectMangoose() {
    // connecting to database with env variable
    try {
        console.log('MongoDB connection with retry')
        await mongoose.connect(process.env.MONGODB_URI, {
            autoIndex: false, // Don't build indexes
            // reconnectTries: 30, // Retry up to 30 times
            // reconnectInterval: 500, // Reconnect every 500ms
            poolSize: 10, // Maintain up to 10 socket connections
            // If not connected, return errors immediately rather than waiting for reconnect
            bufferMaxEntries: 0,
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        })
        console.log('MongoDB is connected');

    } catch (error) {
        console.error(error)
        console.log('MongoDB connection unsuccessful, retry after 5 seconds.')
        setTimeout(connectWithRetry, 5000)
    }
}


DBconnectMangoose()
server.listen(process.env.PORT, (error) => {
    console.log((error) ? error : `***Plasma-19***\nServer up on ${process.env.PORT}`)
})