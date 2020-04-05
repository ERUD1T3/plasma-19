const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const Donor = require('../model/donor')

function initialize(passport, Donor) {
    const authenticateDonor = async (email, password, done) => {
        try {
            await Donor.getDonorByEmail(email, (error, donor) => {
                if (error) throw error;
                if (!donor) {
                    return done(null, false, {
                        message: 'Donor not found'
                    })
                }
                // console.log('test of Donor retrieval');
                // console.log(`email: ${Donor.email}`)

                bcrypt.compare(password, donor.password, (error, isMatch) => {
                    if (isMatch) {

                        // console.log(`login password: ${password} \n stored password: ${Donor.password}`)
                        return done(null, donor)
                    } else {
                        console.log('Password incorrect!')
                        return done(null, false, {
                            message: 'Password Incorrect'
                        })
                    }

                })

            })
        } catch (error) {
            return done(error)
        }
    }

    passport.use(new LocalStrategy(
    //     {
    //     emailField: 'email',
    //     passwordField: 'password'
    // },
    authenticateDonor))

    passport.serializeUser((donor, done) => {
        done(null, donor.id)
    })

    passport.deserializeUser((id, done) => {
        Donor.getDonorById(id, (error, Donor) => {
            done(error, donor)
        })
    })
}

const checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

const checkNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}


module.exports = {
    initialize,
    checkAuthenticated,
    checkNotAuthenticated
};