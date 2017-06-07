
var JwtStrategy   = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var config = require('config');
// var Brick = require('../bricks/brick.model');
// var bcrypt = require('bcrypt-nodejs');
// var DB = require('../config/database.model');

module.exports = function (passport) {

		

    passport.use('jwt-login', new JwtStrategy({
        jwtFromRequest : ExtractJwt.fromAuthHeader(),
        passReqToCallback : true,
        secretOrKey : config.get('JWT.secret')
      },
      function (req, jwt_payload, done) {
        process.nextTick(function () {
          // To do
          // Remove skey from query
          DB.brick.forge({id: jwt_payload.id}).fetch({columns: ['id', 'email', 'password', 'need_password']}).then(function(model) {
            if (!model) {
              console.log('User not found');
              return done(null, false, 'user not found');
            }

            // if (!model.validatePassword(password)) {
            //   console.log('password invalid');
            //   return done(null, false, 'password invalid');
            // }
            var userObj = model.toJSON();
                userObj.password = ""; //remove password from session object
                userObj.exp = config.get('JWT.expiresIn');
            return done(null, userObj);

          }).catch(function(err) {
            console.log(err);
          });
        });
      }

      )

    );//End jwt login


  };
