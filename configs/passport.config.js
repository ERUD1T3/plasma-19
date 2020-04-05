const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const Donor = require('../model/donor')

function initialize(passport) {
    const authenticateDonor = async (email, password, done) => {
        try {
            await Donor.getDonorByEmail(email, async (error, donor) => {
                if (error) throw error;
                if (!donor) {
                    console.log('donor not found')
                    return done(null, false, {
                        message: 'Donor not found'
                    })
                }
                console.log('test of Donor retrieval');
                console.log(`email: ${donor.email}`)

                await bcrypt.compare(password, donor.password, (error, isMatch) => {
                    if (isMatch) {

                        console.log(`login password: ${password} \n stored password: ${donor.password}`)
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

    passport.use(new LocalStrategy({ 
        usernameField: 'email'
    }, authenticateDonor))

    passport.serializeUser((user, done) => {
        done(null, user.id)
    })

    passport.deserializeUser((id, done) => {
        Donor.getDonorById(id, (error, user) => {
            done(error, user)
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