var DB = require('../config/database.model');
var Mail = require('../mail/mail.service');
var Utility = require('../config/utility');
var StellarSdk = require('stellar-sdk');

var config = require('config');
var request = require('request-promise');
var bcrypt = require('bcrypt-nodejs');
var server = "";

if ( config.get('General.production')) {
  StellarSdk.Network.usePublicNetwork();
  server = new StellarSdk.Server(config.get('Stellar.liveNetwork'));

}

if ( !config.get('General.production')) {
  StellarSdk.Network.useTestNetwork();
  server = new StellarSdk.Server(config.get('Stellar.testNetwork'));

}

var self = {
	signUp: function(req, res) {
		// validate that user is in ionic auth service,
		// create jwt token
		// create user store jwt token,
		// send mail
		// return jwt token
		console.log("bb", req.body);
		var rtnObj = {};
		var userObj = {};
		var messages = [];

		var options = {
		    uri: config.get('Ionic.baseUrl')+'users/'+req.body.id,
		    headers: {
		        'Authorization': 'Bearer ' + config.get('Ionic.token')
		    },
		    json: true // Automatically parses the JSON string in the response
		};

		console.log("options: \n",options);

		request(options)
    .then(function (response) {
        // user found - create token
        if (response.data.uuid)
        {
        	console.log("uuid found: \n");
        	userObj.uuid = response.data.uuid;
        	var token = Utility.createToken(userObj);
        	userObj.token = token;
        	var newUser  = new DB.user({
                                    uuid: response.data.uuid,
                                    token: token,
                                    firstname: req.body.firstname,
                                    surname: req.body.surname,
                                    email: req.body.email,
                                    phone: req.body.phone,
                                    country: req.body.country,
                                    password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null)
                                    });

              return newUser.save();
        }else{
        	console.log("uuid not found: \n");
        	throw new Error('NotFound');
        }

    })
    .catch(function (err) {
    		console.log("error :",err.message);
    		messages.push('sign up unsuccessful');
    		throw new Error('NotFound');

    })
    .then(function (model) {
      // user created -send mail
     	Mail.onSignUp(req.body.firstname, req.body.email, req.body.auth_code);
     	// return token
    	rtnObj = {
              status: true,
              content: {
                message: ['sign up successful'],
                data: userObj
              }
            };

			return res.status(200).send(rtnObj);
    })
    .catch(DB.user.NoRowsUpdatedError, function (err) {
			console.log("db error\n", err);
			messages.push('User not created');
			throw new Error('NotFound');

    })
    .catch(function (err) {
			console.log(err.message);
			return res.status(400).send({status: false, content: {message: messages}});

    });

	},

  saveProfile: function(req, res) {
    // validate tokens
    // save details
    // send mail
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{

      DB.user.forge({uuid: req.body.uuid}).fetch({require:true})
        .then(function(model) {



          return model.save({firstname: req.body.firstname, 
            surname: req.body.surname, email: req.body.email});

        })
        .catch(DB.user.NotFoundError, function (err) {
          console.log("db error\n", err);
          messages.push('User not found');
          throw new Error('NotFound');

        })
        .then(function(model) {

          userObj = model.toJSON();
          rtnObj = {
              status: true,
              content: {
                message: ['Profile updated'],
                data: userObj
              }
            };

            return res.status(200).send(rtnObj);

        })
        .catch(DB.user.NoRowsUpdatedError, function(err) {
            console.log(err);
            messages.push('Error: unable to update profile');
            throw new Error('Unable to change password!');
        })

        .catch(function(err) {
          return res.status(400).send({status: false, content: {message: messages}});
        });

    }


  },


  changePassword: function(req, res) {
    // validate tokens
    // validate old password
    // store new password
    // update ionic auth service
    // send mail
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{

      DB.user.forge({uuid: req.body.uuid}).fetch({require:true})
        .then(function(model) {
          if (!model.validatePassword(req.body.old_password)) {
              console.log('password invalid');
              messages.push('Invalid password');
              throw new Error('Invalid user password!');


            }else{
              // old password
              // old_password = model.get('password');
              //hash password
              hash_password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);

              return model.save({password: hash_password});
            }
        })
        .catch(DB.user.NotFoundError, function (err) {
          console.log("db error\n", err);
          messages.push('User not found');
          throw new Error('NotFound');

        })
        .then(function(model) {
          // update ionic auth
          userObj = model.toJSON();
          var options = {
              uri: config.get('Ionic.baseUrl')+'users/'+req.body.id,
              headers: {
                  'Authorization': 'Bearer ' + config.get('Ionic.token')
              },
              body: {password: req.body.password },
              json: true // Automatically parses the JSON string in the response
          };

          console.log("options: \n",options);

          request.patch(options);

        })
        .catch(DB.user.NoRowsUpdatedError, function(err) {
            console.log(err);
            messages.push('Error: unable to change password');
            throw new Error('Unable to change password!');
        })
        .then(function(resp) {
          rtnObj = {
              status: true,
              content: {
                message: ['password change successful'],
                data: userObj
              }
            };
            // mail on password change
            Mail.onChangePassword(userObj.firstname, userObj.email);
            return res.status(200).send(rtnObj);

        })
        .catch(function(err) {
          console.log(err);
            messages.push('Unable to connect to server');
            throw new Error('Unable to change password!');
        })
        .catch(function(err) {
          return res.status(400).send({status: false, content: {message: messages}});
        });

    }


  },

  changePin: function(req, res) {
    // validate tokens
    // validate old pin
    // store new pin
    // send mail
    // return success/failure
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{

      DB.user.forge({uuid: req.body.uuid}).fetch({require:true})
        .then(function(model) {
          if (!model.validatePin(req.body.old_pin)) {
              console.log('pin invalid');
              messages.push('Invalid PIN');
              throw new Error('Invalid user pin!');


            }else{

              hash_pin = bcrypt.hashSync(req.body.pin, bcrypt.genSaltSync(8), null);

              return model.save({pin: hash_pin});
            }
        })
        .catch(DB.user.NotFoundError, function (err) {
          console.log("db error\n", err);
          messages.push('User not found');
          throw new Error('NotFound');

        })
        .then(function(model) {
          userObj = model.toJSON();
          rtnObj = {
              status: true,
              content: {
                message: ['PIN change successful'],
                data: userObj
              }
            };
            // mail on password change
            Mail.onChangePin(userObj.firstname, userObj.email);
            return res.status(200).send(rtnObj);

        })
        .catch(DB.user.NoRowsUpdatedError, function(err) {
            console.log(err);
            messages.push('Error: unable to change PIN');
            throw new Error('Unable to change password!');
        })
        .catch(function(err) {
          console.log(err);
          return res.status(400).send({status: false, content: {message: messages}});
        });

    }


  },

  setPin: function(req, res) {
    // validate tokens
    // store new pin
    // send mail
    // return success/failure
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{

      DB.user.forge({uuid: req.body.uuid}).fetch({require:true})
        .then(function(model) {

              hash_pin = bcrypt.hashSync(req.body.pin, bcrypt.genSaltSync(8), null);

              return model.save({pin: hash_pin});

        })
        .catch(DB.user.NotFoundError, function (err) {
          console.log("db error\n", err);
          messages.push('User not found');
          throw new Error('NotFound');

        })
        .then(function(model) {
          userObj = model.toJSON();
          rtnObj = {
              status: true,
              content: {
                message: ['PIN set successful'],
                data: userObj
              }
            };
            // mail on password change
            Mail.onChangePin(userObj.firstname, userObj.email);
            return res.status(200).send(rtnObj);

        })
        .catch(DB.user.NoRowsUpdatedError, function(err) {
            console.log(err);
            messages.push('Error: unable to change PIN');
            throw new Error('Unable to change password!');
        })
        .catch(function(err) {
          console.log(err);
          return res.status(400).send({status: false, content: {message: messages}});
        });

    }


  },

  verifyPin: function(req, res) {
    // validate tokens
    // validate old pin
    // store new pin
    // send mail
    // return success/failure
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{

      DB.user.forge({uuid: req.body.uuid}).fetch({require:true})
        .then(function(model) {
          if (!model.validatePin(req.body.pin)) {
              console.log('pin invalid');
              messages.push('Invalid PIN');
              throw new Error('Invalid user pin!');


            }else{
              userObj = model.toJSON();
              rtnObj = {
                  status: true,
                  content: {
                    message: ['PIN verified.'],
                    data: userObj
                  }
                };

                return res.status(200).send(rtnObj);
            }
        })
        .catch(DB.user.NotFoundError, function (err) {
          console.log("db error\n", err);
          messages.push('User not found');
          throw new Error('NotFound');

        })
        .catch(function(err) {
          console.log("Error:: ",err);
          return res.status(400).send({status: false, content: {message: messages}});
        });

    }


  },

  verifyRave: function(flw_ref) {

    var bodyObj = {
      "flw_ref": flw_ref,
      "SECKEY": config.get('Ravepay.secretKey')
    };

    var options = {
      method: 'POST',
      uri: config.get('Ravepay.baseUrl')+'verify',
      body: bodyObj,
      json: true
    };

    console.log("options: \n",options);

    return request(options);
  },

  recieveBtc: function(req, res) {
    // get params
    // check confirmation
    // get tx with txref
    // mark paid if conf >= 6
    // send lumens to address
    // send email
    console.log("rcv btc", req.params);
    var txObj = {};
    var amount_paid = req.params.value/100000000;
    DB.transaction.forge({txref: req.params.txref, btc_address: req.params.address}).fetch({require: true})
    .then(function(model) {
      txObj = model.toJSON();
      return model.save({status: 1});


    })
    .catch(DB.transaction.NotFoundError,function(error) {
      messages.push('User not authorised. Contact support ');
      throw new Error("Unauthorised");
    })
    .then(function(model) {
      if (req.params.confirmations >= 6 && amount_paid >= txObj.amount) {
        return Utility.sendLumens(txObj.rcvr, txObj.lumens_amount);
      } else{
        throw new Error("NotConfirmed");
      }
    })
    .catch(DB.transaction.NoRowsUpdatedError, function(error) {
      messages.push('User not authorised. Contact support ');
      throw new Error("Unauthorised");
    })
    .then(function(response) {
      // send email
      // send *ok*
     return res.format({
        'text/plain': function(){
          res.send('*ok*');
        }
      });
    })
    .catch(function(error) {
      messages.push('User not authorised. Contact support ');
      throw new Error("Unauthorised");
    });

  },

  saveTx: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else if(req.body.lumens_amount < config.get('Lumania.minLimit')){
      messages.push('Minimum transaction limit is'+config.get('Lumania.minLimit')+'XLM.');
      res.status(400).send({status: false, content: {message: messages}  });
    } else{
      // get user with uuid
      DB.user.forge({uuid: user.uuid}).fetch({require: true})
        .then(function(model) {

          if (!model.validatePin(req.body.pin)) {
              console.log('pin invalid');
              messages.push('Invalid PIN');
              throw new Error('Invalid user pin!');


            }else{


            // create new tx for user

            var newTx  = new DB.transaction({
                          "txref": req.body.txRef,
                          "amount": req.body.amount,
                          "currency": req.body.currency,
                          "rcvr": req.body.rcvr,
                          "lumens_amount": req.body.lumens_amount,
                          "user_id": model.get("id"),
                          "tx_type": req.body.txType
                        });

            return newTx.save();
          }

        })
        .catch(DB.user.NotFoundError,function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .then(function(model) {
          // return true
          return res.status(200).send({status: true, content: {message: ['Transaction saved']}});
        })
        .catch(DB.transaction.NoRowsUpdatedError, function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .catch(function(error) {
          console.log(error.message);
          return res.status(400).send({status: false, content: {message: messages}});

        })

    };

  },

  saveBtcTx: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var userObj = {};
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else if(req.body.lumens_amount < config.get('Lumania.minLimit')){
        messages.push('Minimum transaction limit is'+config.get('Lumania.minLimit')+'XLM.');
        res.status(400).send({status: false, content: {message: messages}  });
    } else{
      console.log("req", req.body);
      // get user with uuid
      DB.user.forge({uuid: user.uuid}).fetch({require: true})
        .then(function(model) {
          userObj = model.toJSON();
          if (!model.validatePin(req.body.pin)) {
              console.log('pin invalid');
              messages.push('Invalid PIN');
              throw new Error('Invalid user pin!');


            }else{

            // get btc address
            return Utility.getBtcAddress(req.body.txRef);
            // return {address: 'WSDFCVXCMHUIEWIWEM33443'};

          }

        })
        .catch(DB.user.NotFoundError,function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .then(function(response) {
            // create new tx for user
            console.log("blockchain response", response);
            var newTx  = new DB.transaction({
                          "txref": req.body.txRef,
                          "amount": req.body.amount,
                          "currency": req.body.currency,
                          "rcvr": req.body.rcvr,
                          "lumens_amount": req.body.lumens_amount,
                          "user_id": userObj.id,
                          "tx_type": req.body.txType,
                          "btc_address": response.address
                        });

            return newTx.save();
        })
        .catch(function(error) {
          console.log(error);
          messages.push('Unable to get BTC address');
          throw new Error("BTCError");
        })
        .then(function(model) {
          // return true
          var rtnObj = {"btc_address": model.toJSON().btc_address};
          Mail.onPayWithBtc(userObj.firstname, userObj.email, rtnObj.btc_address, req.body.amount, req.body.lumens_amount);
          return res.status(200).send({status: true, content: {message: ['Transaction saved'], data: rtnObj }});
        })
        .catch(DB.transaction.NoRowsUpdatedError, function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .catch(function(error) {
          console.log(error.message);
          return res.status(400).send({status: false, content: {message: messages}});

        });

    };

  },


  saveEmailTx: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var userObj = {};
    var messages = [];
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // get user with uuid
      DB.user.forge({uuid: user.uuid}).fetch({require: true})
        .then(function(model) {

          userObj = model.toJSON();

          if (!model.validatePin(req.body.pin)) {
              console.log('pin invalid');
              messages.push('Invalid PIN');
              throw new Error('Invalid user pin!');


            }else{


            // create new tx for user

            var newTx  = new DB.transaction({
                          "memo": req.body.memo,
                          "amount": req.body.amount,
                          "lumens_amount": req.body.amount,
                          "user_id": model.get("id"),
                          "tx_type": 4,
                          "rcvr": req.body.rcvr,
                          "sender": userObj.email
                        });

            return newTx.save();
          }

        })
        .catch(DB.user.NotFoundError,function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .then(function(model) {
          // return true
          // send mail
          Mail.onEmailTx(req.body.rcvr, req.body.amount, userObj.email, req.body.memo);
          return res.status(200).send({status: true, content: {message: ['Transaction saved']}});
        })
        .catch(DB.transaction.NoRowsUpdatedError, function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .catch(function(error) {
          console.log(error.message);
          return res.status(400).send({status: false, content: {message: messages}});

        });

    }

  },


  saveSellTx: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var userObj = {};
    var messages = [];
    var supportedCurrency = [];
    supportedCurrency = config.get('Rates.withdrawList').split(',');
    var memoText =  Utility.randomString(6);



    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    }else if( !supportedCurrency.includes(req.body.currency)){

      messages.push('Currency not supported.');
      res.status(400).send({status: false, content: {message: messages}  });

    }else if(req.body.lumens_amount < config.get('Lumania.minLimit')){
      messages.push('Minimum transaction limit is'+config.get('Lumania.minLimit')+'XLM.');
      res.status(400).send({status: false, content: {message: messages}  });
    } else{


      // get user with uuid
      DB.user.forge({uuid: user.uuid}).fetch({require: true})
        .then(function(model) {

          userObj = model.toJSON();

          if (!model.validatePin(req.body.pin)) {
              console.log('pin invalid');
              messages.push('Invalid PIN');
              throw new Error('Invalid user pin!');


            }else{


            // create new tx for user

            var newTx  = new DB.transaction({
                          "memo": memoText,
                          "amount": req.body.fiatAmount,
                          "lumens_amount": req.body.xlmAmount,
                          "user_id": model.get("id"),
                          "tx_type": 3,
                          "rcvr": config.get('Lumania.accountId'),
                          "sender":req.body.accountId
                        });

            return newTx.save();
          }

        })
        .catch(DB.user.NotFoundError,function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .then(function(model) {
          // return true
          // send mail
          var rtnData = {
            "memo_text": memoText,
            "lumania_account": config.get('Lumania.accountId'),
            "tx_id": model.get("id")
          };
          return res.status(200).send({status: true, content: {message: ['Transaction saved'], data: rtnData }});
        })
        .catch(DB.transaction.NoRowsUpdatedError, function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .catch(function(error) {
          console.log(error.message);
          return res.status(400).send({status: false, content: {message: messages}});

        });

    }

  },


  saveAccount: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // get user with uuid
      DB.user.forge({uuid: user.uuid}).fetch({require: true})
        .then(function(model) {
          // create new tx for user

          var newAcct  = new DB.account({
                        "account_id": req.body.account_id,
                        "seed_text": req.body.seed_obj.text,
                        "seed_salt": req.body.seed_obj.salt,
                        "seed_iv": req.body.seed_obj.iv,
                        "user_id": model.get("id"),
                        "fed_name": model.get('email')+'*'+config.get('Stellar.homeDomain')
                      });

          return newAcct.save();

        })
        .catch(DB.user.NotFoundError,function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .then(function(model) {
          // Send notification mail
          Mail.onNewAccount(req.body.name, req.body.email, req.body.recovery_code);

          // return true
          return res.status(200).send({status: true, content: {message: ['Account saved']}});
        })
        .catch(DB.account.NoRowsUpdatedError, function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .catch(function(error) {
          console.log(error.message);
          return res.status(400).send({status: false, content: {message: messages}});

        });

    };

  },

  recoverAccount: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // get user with uuid
      DB.user.forge({uuid: user.uuid}).fetch({require: true, withRelated: ['accounts']})
        .then(function(model) {
         var userObj = model.toJSON();
          var accounts = Array.from(model.related('accounts').toJSON());
          console.log(accounts);
          return res.status(200).send({status: true, content: {message: ['Account saved'], data: accounts }});
        })
        .catch(DB.user.NotFoundError,function(error) {
          messages.push('User not authorised. Contact support ');
          throw new Error("Unauthorised");
        })
        .catch(function(error) {
          console.log(error.message);
          return res.status(400).send({status: false, content: {message: messages}});

        });

    };

  },

  creditLumens: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var txObj = {};
    var destAcctActive = 0;
    var asset = Utility.generateAsset(0);
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // verify rave payment
      self.verifyRave(req.body.flwRef)
          .then(function(response) {
            // get transaction from tx
            console.log("finding tx. verify true\n",response );
            console.log("rqb",req.body);
            return DB.transaction.forge({txref: req.body.txRef}).fetch({require: true});
          })
          .catch(function(error) {
            console.log(error);
            messages.push("Payment not found. Contact support");
            throw new Error("invalid payment");
          })
          .then(function(model) {
            txObj = model.toJSON();
            // check if account id is created on stellar
            return server.loadAccount(req.body.accountId);
          })
          .catch(DB.transaction.NotFoundError, function(error) {
            console.log(error);
            messages.push("transaction not found. Contact support");
            throw new Error("invalid payment");
          })
          .catch(StellarSdk.NotFoundError, function(error) {

            // unable to load dest account
            // messages.push(' Account not active');
            console.error('Destination Account not active');
            destAcctActive = 0;

          })
          .then(function(receiver) {
            console.log("receiver: ", receiver);
            if (receiver) {
              console.log("its active oo");
              destAcctActive = 1;

            }
            // load source acct
            return server.loadAccount(config.get('Lumania.accountId'));
          })
          .catch(StellarSdk.NotFoundError, function(error) {

            // unable to load source account
            messages.push('Source Account not active');
            console.error('Something went wrong! The source account does not exist!');
            throw new Error('The source account does not exist!');

          })
          .then(function(sender) {
            // check if balance is sufficient
            console.log("sender: ", sender);
            var balances = sender.balances;
            var currentBalance = 0.00;

            for (var i = 0; i < balances.length; i++) {
              if (balances[i].asset_type === 'native') {
                currentBalance = balances[i].balance;
              }
            };

            if (parseFloat(currentBalance) <= (parseFloat(txObj.lumens_amount) + 20) ) {
              // insufficient Balance
              messages.push('Transaction in progress');
              console.error('Something went wrong! insufficient balance');
              Mail.onInsufficientBalnce(currentBalance, txObj.lumens_amount, txObj);

              throw new Error('insufficient balance');
            } else{




              // build a transaction based on if dest was found or not
              var transaction = "";
              if (destAcctActive == 1) {
              transaction = new StellarSdk.TransactionBuilder(sender)
                                .addOperation(StellarSdk.Operation.payment({
                                  destination: req.body.accountId,
                                  asset: asset,
                                  amount: txObj.lumens_amount.toString()
                                }))
                                .addMemo(StellarSdk.Memo.text(req.body.memoText|| ""))
                                .build();
              }
              if (destAcctActive === 0) {
                transaction = new StellarSdk.TransactionBuilder(sender)
                                  .addOperation(StellarSdk.Operation.createAccount({
                                    destination: req.body.accountId,
                                    startingBalance: txObj.lumens_amount.toString()
                                  }))
                                  .addMemo(StellarSdk.Memo.text(req.body.memoText || ""))
                                  .build();
              }

              // sign transaction
              transaction.sign(StellarSdk.Keypair.fromSecret(config.get('Lumania.skey')));

              return server.submitTransaction(transaction);
            }

          })
          .then(function(result) {
            console.log('Success! Results:', result);
            messages.push('Transaction successful');
            // notify user by email
            return DB.transaction.forge({id: txObj.id}).save({status: 1});

          })
          .then(function(model) {
            Mail.onCreditLumensSuccess(req.body.email, txObj);
            res.status(200).send({status: true, content: {message: messages} });
          })
          .catch(DB.transaction.NoRowsUpdatedError, function(error) {
            messages.push('Transaction not saved. Contact support');
            // notify support via email?
            
            // res.status(400).send({status: false, content: {message: messages} });
          })
          .catch(function(error) {
            console.error('Something went wrong at the end\n', error);
            messages.push('Transaction not complete');
            Mail.onCreditLumensFailure(req.body.email, req.body.amount, req.body.txRef);
            res.status(400).send({status: false, content: {message: messages} });
            // save transaction and send email
          });

    }


  },


  claimLumens: function(req, res) {
    // verify jwt token
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var txObj = {};
    var destAcctActive = 0;
    var asset = Utility.generateAsset(0);
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // verify rave payment
      DB.transaction.forge({memo: req.body.claim_code, rcvr: req.body.email}).fetch({require: true})
          .then(function(model) {
            txObj = model.toJSON();
            if (txObj.status == 1) {
              messages.push("Lumens already Claimed");
              throw new Error("LumensClaimed");
            } else{
              // check if account id is created on stellar
              return server.loadAccount(req.body.account_id);
            }

          })
          .catch(DB.transaction.NotFoundError, function(error) {
            console.log(error);
            messages.push("Transaction not found. Contact support");
            throw new Error("InvalidPayment");
          })
          .catch(StellarSdk.NotFoundError, function(error) {

            // unable to load dest account
            // messages.push(' Account not active');
            console.error('Destination Account not active');
            destAcctActive = 0;

          })
          .then(function(receiver) {
            console.log("receiver: ", receiver);
            if (receiver) {
              console.log("its active oo");
              destAcctActive = 1;

            }
            // load source acct
            return server.loadAccount(config.get('Lumania.accountId'));
          })
          .catch(StellarSdk.NotFoundError, function(error) {

            // unable to load source account
            messages.push('Source Account not active');
            console.error('Something went wrong! The source account does not exist!');
            throw new Error('SourceInactive');

          })
          .then(function(sender) {
            // check if balance is sufficient
            console.log("sender: ", sender);
            var balances = sender.balances;
            var currentBalance = 0.00;

            for (var i = 0; i < balances.length; i++) {
              if (balances[i].asset_type === 'native') {
                currentBalance = balances[i].balance;
              }
            }

            if (parseFloat(currentBalance) <= (parseFloat(txObj.lumens_amount) + 20) ) {
              // insufficient Balance
              messages.push('Transaction in progress');
              console.error('Something went wrong! insufficient balance');
              Mail.onInsufficientBalnce(currentBalance, txObj.lumens_amount, txObj);

              throw new Error('InsufficientBalance');
            } else{




              // build a transaction based on if dest was found or not
              var transaction = "";
              if (destAcctActive == 1) {
              transaction = new StellarSdk.TransactionBuilder(sender)
                                .addOperation(StellarSdk.Operation.payment({
                                  destination: req.body.account_id,
                                  asset: asset,
                                  amount: txObj.lumens_amount.toString()
                                }))
                                .addMemo(StellarSdk.Memo.text(req.body.memoText|| ""))
                                .build();
              }
              if (destAcctActive === 0) {
                transaction = new StellarSdk.TransactionBuilder(sender)
                                  .addOperation(StellarSdk.Operation.createAccount({
                                    destination: req.body.accountId,
                                    startingBalance: txObj.lumens_amount.toString()
                                  }))
                                  .addMemo(StellarSdk.Memo.text(req.body.memoText || ""))
                                  .build();
              }

              // sign transaction
              transaction.sign(StellarSdk.Keypair.fromSecret(config.get('Lumania.skey')));

              return server.submitTransaction(transaction);
            }

          })
          .then(function(result) {
            console.log('Success! Results:', result);
            messages.push('Transaction successful');
            // notify user by email
            return DB.transaction.forge({id: txObj.id}).save({status: 1});

          })
          .then(function(model) {
            Mail.onCreditLumensSuccess(req.body.email, txObj);
            res.status(200).send({status: true, content: {message: messages} });
          })
          .catch(DB.transaction.NoRowsUpdatedError, function(error) {
            messages.push('Transaction not saved. Contact support');
            // notify support via email?

            // res.status(400).send({status: false, content: {message: messages} });
          })
          .catch(function(error) {
            console.error('Something went wrong at the end\n', error);
            messages.push('Transaction not complete');
            if (error.message !== 'LumensClaimed') {
              Mail.onCreditLumensFailure(req.body.email, txObj);
            }

            res.status(400).send({status: false, content: {message: messages} });
            // save transaction and send email
          });

    }


  },

  sellLumens: function(req, res) {
    // verify user tokens
    // verify transaction hash
    // load transaction verify amounts
    // connect to flutterwave to disburse funds / send notification to admin
    // update transaction object
    // send notification mail.
    // return success

    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var txObj = {};
    var mwToken = "";
    var destAcctActive = 0;
    var foundPayment = 0;
    var asset = Utility.generateAsset(0);
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      console.log("req.body", req.body);

      // load transaction from db
      DB.transaction.forge({id: req.body.tx_id}).fetch({require: true})
      .then(function(model) {

        txObj = model.toJSON();

        // verify transaction hash
        return server.transactions().transaction(req.body.tx_hash).call();
      
      })
      .catch(DB.transaction.NotFoundError, function(error) {
            console.log(error);
            messages.push("transaction not found. Contact support");
            throw new Error("invalid payment");
      })
      .then(function (txResult) {
        console.log(txResult);
        // get and check memo
        if (txResult.memo && txResult.memo_text === txObj.memo) {
          return server.payments().forTransaction(req.body.tx_hash).call();
        } else{

        }
      })
      .catch(function (err) {
        // get transaction err
        console.log(err);
      })
      .then(function (paymentResult) {
        console.log(paymentResult.records);
        paymentResult.records.forEach(function(record) {
          if (record.source_account == txObj.sender && record.amount == txObj.lumens_amount) {
            foundPayment = 1;
          }
        });
        if (foundPayment) {
          // connect to flutterwave
          return Utility.getMoneyWaveToken(req.body.token, req.body.uuid);
        } else{
          // throw error
          messages.push("Payment not found. Contact support");
          throw new Error("invalid payment");
        }

      })
      .catch(function (err) {
        // get payments err
        console.log(err);
      })
      .then(function (TokenObj) {
        console.log(TokenObj);
        mwToken = TokenObj.token;
        // get wallet balance
        return Utility.getMoneyWaveBalance();
      })
      .catch(function (err) {
        // moneywave token error
        console.log(err);
      })
      .then(function (walletObj) {
        console.log(walletObj);
        // mwToken = TokenObj.token;
        // disburse funds
        return Utility.moneyWaveDisburse(mwToken, txObj.amount, req.body.bank_code, 
                req.body.account_number, txObj.currency, txObj.memo);
      })
      .catch(function (err) {
        // moneywave balance error
        console.log(err);
      })
      .then(function (disburseObj) {
        console.log(disburseObj);
        // disburse success
        // send mail return success
        return DB.transaction.forge({id: txObj.id}).save({status: 1});
      })
      .catch(function (err) {
        // moneywave disburse error
        // sendmail. return error
        console.log(err);

      })
      .then(function(model) {

        Mail.onSellLumens(req.body.name, req.body.email, req.body.fiatAmount, req.body.xlmAmount, req.body.currency);
        res.status(200).send({status: true, content: {message: 'Lumens sold'} });

      })
      .catch(DB.transaction.NoRowsUpdatedError, function(error) {
        messages.push('Transaction not saved. Contact support');
        // notify support via email?
        // Mail.onCreditLumensSuccess(req.body.email, txObj);
      })
      .catch(function (err) {
        // general promise error
        console.log(err);
        res.status(400).send({status: false, content: {message: messages} });
      });


    }

  },

  federation: function(req, res) {
    var params = req.query;
    var rtnObj = {};

    switch(params.type){
      case 'id':
        DB.account.forge({account_id: params.q}).fetch({require: true, columns: ['fed_name', 'account_id']})
        .then(function(model) {
          if(!model){
            throw new DB.account.NotFoundError();
          }

          rtnObj = {
                stellar_address: model.get('fed_name'),
                account_id: model.get('account_id')
               };
          res.status(200).send(rtnObj);
        })
        .catch(DB.account.NotFoundError, function(error) {
           res.status(404).send({detail: "No record Found"});
        });
        break;

      case 'name':
        DB.account.forge({fed_name: params.q}).fetch({require: true, columns: ['fed_name', 'account_id']})
        .then(function(model) {
          if(!model){
            throw new DB.account.NotFoundError();
          }
          rtnObj = {
                stellar_address: model.get('fed_name'),
                account_id: model.get('account_id')
               };
          res.status(200).send(rtnObj);
        })
        .catch(DB.account.NotFoundError, function(error) {
           res.status(404).send({detail: "No record Found"});
        });

        break;
      case 'txid':
         res.status(400).send({detail: "Type not supported by this server"});

      default:
         res.status(400).send({detail: "Invalid Details Provided"});


    }

  },

  imageUpload: function(req, res) {
    var user = Utility.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var location = "";
    var returnUrl = "";
    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else if (!req.files){
      return res.status(400).send('No files were uploaded.');
    }
    else{
      // verify upload type
      // save in directory 
      // save link in db
      // return link or error
      // console.log("req", req);
      console.log("req.body", req.body);
      console.log("req.files", req.files);

      switch (req.body.uploadType) {
          case '1':
            returnUrl = config.get('Lumania.apiUrl')+'data/profile/'+req.body.fileName;
            location = __dirname +'/../data/profile/'+req.body.fileName;
            break;
          case '2':
            returnUrl = config.get('Lumania.apiUrl')+'data/passport/'+req.body.fileName;
            location = __dirname +'/../data/passport/'+req.body.fileName;
            break;
          case '3':
            returnUrl = config.get('Lumania.apiUrl')+'data/holder/'+req.body.fileName;
            location = __dirname +'/../data/holder/'+req.body.fileName;
            break;
          default:
            throw new Error("InvalidUploadType");
            break;
        }


      // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
      // var sampleFile = req.files.sampleFile;

      // Use the mv() method to place the file somewhere on your server
      req.files.file.mv(location, function(err) {
        if (err){
          console.log(err);
          return res.status(500).send({status: false, content: {message: ['File upload error']}  });
        }

          DB.user.forge({uuid: req.body.uuid}).fetch({require:true})
          .then(function(model) {

                // hash_pin = bcrypt.hashSync(req.body.pin, bcrypt.genSaltSync(8), null);
                if (req.body.uploadType == '1') {return model.save({profile_image: returnUrl });}
                if (req.body.uploadType == '2') {return model.save({passport_image: returnUrl, passport_no: req.body.passport_no, address: req.body.address });}
                if (req.body.uploadType == '3') {return model.save({passport_holder_image: returnUrl, passport_no: req.body.passport_no, address: req.body.address });}


          })
          .catch(DB.user.NotFoundError, function (err) {
            console.log("db error\n", err);
            messages.push('User not found');
            throw new Error('NotFound');

          })
          .then(function(model) {
            userObj = model.toJSON();
            rtnObj = {
                status: true,
                content: {
                  message: ['Image Upload Successful'],
                  data: userObj
                }
              };

              return res.status(200).send(rtnObj);

          })
          .catch(DB.user.NoRowsUpdatedError, function(err) {
              console.log(err);
              messages.push('Error: saving image');
              throw new Error('ErrorSavingImage');
          })
          .catch(function(err) {
            console.log(err);
            return res.status(400).send({status: false, content: {message: messages}});
          });

      });



    }
  },



};

module.exports = self;