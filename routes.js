// var Brick = require('./bricks/brick.model');
// var brickService = require('./bricks/brick.service');
// var account = require('./accounts/account.service');
var Utility = require('./config/utility');
// var Mail = require('./mail/mail.service');
var StellarSdk = require('stellar-sdk');
// var DB = require('./config/database.model');

var user = require('./users/user.service');
var config = require('config');
var server = "";

if ( config.get('General.production')) {
  StellarSdk.Network.usePublicNetwork();
  server = new StellarSdk.Server(config.get('Stellar.liveNetwork'));

}

if ( !config.get('General.production')) {
  StellarSdk.Network.useTestNetwork();
  server = new StellarSdk.Server(config.get('Stellar.testNetwork'));

}

module.exports = {
  configure: function(app,passport) {

   app.get('/ld', function(req, res) {
    server.loadAccount(config.get('Lumania.accountId'))
    .then(function(account) {
      console.log(account);
    });
   });

    
    app.get('/logout', function(req, res) {
        req.logout();
        return res.send({ success : true, message : 'user logged out' });
        // res.redirect('/login');
    });

    app.get('/genkey', function(req, res) {
        var keypair = StellarSdk.Keypair.random();
        console.log("acct id:", keypair.publicKey());
        console.log("\nseed:", keypair.secret());
        
        return res.send({ success : true, message : 'user logged out' });
        // res.redirect('/login');
    });

    app.post('/tanker/',  function(req, res) {
      
      return res.send({ success : true, message : ['success'], data: {account_id: config.get('Lumania.accountId')} });

    });

    app.post('/signup/',  function(req, res) {
      user.signUp(req,res);

    });

    app.post('/save/profile/',  function(req, res) {
      user.saveProfile(req,res);

    });


    app.post('/upload/image/',  function(req, res) {
      user.imageUpload(req,res);

    });

    app.post('/transaction/save/',  function(req, res) {
      user.saveTx(req,res);

    });

    app.post('/transaction/save_email/',  function(req, res) {
      user.saveEmailTx(req,res);

    });


    app.post('/transaction/save_btc/',  function(req, res) {
      user.saveBtcTx(req,res);

    });


    app.post('/transaction/save_sell/',  function(req, res) {
      user.saveSellTx(req,res);

    });

    app.post('/transaction/wave/save/',  function(req, res) {
      user.saveWaveTx(req,res);

    });


    app.post('/user/changepassword/',  function(req, res) {
      user.changePassword(req,res);

    });

    app.post('/user/changepin/',  function(req, res) {
      user.changePin(req,res);

    });

    app.post('/user/setpin/',  function(req, res) {
      user.setPin(req,res);

    });


    app.post('/account/save/',  function(req, res) {
      user.saveAccount(req,res);

    });

    app.post('/account/recover/',  function(req, res) {
      user.recoverAccount(req,res);

    });


    app.post('/lumens/credit/',  function(req, res) {
      user.creditLumens(req,res);

    });


    app.post('/lumens/claim/',  function(req, res) {
      user.claimLumens(req,res);

    });


    app.post('/lumens/sell/',  function(req, res) {
      user.sellLumens(req,res);

    });


    app.post('/lumens/request/',  function(req, res) {
      Utility.requestLumens(req,res);

    });

    app.post('/mail/authcode',  function(req, res) {
      Utility.resendAuthCode(req,res);

    });

    app.post('/mail/support',  function(req, res) {
      Utility.contactSupport(req,res);

    });

    // verify rave payment
    app.post('/verifyrave/',  function(req, res) {
      user.verifyRave(req,res);

    });
    // verify pin
    app.post('/verify/pin/',  function(req, res) {
      user.verifyPin(req,res);

    });

    app.post('/banks/',  function(req, res) {
      Utility.getBanks(req,res);

    });


    app.post('/news/',  function(req, res) {
      Utility.getNews(req,res);

    });

    app.post('/verify/bank/',  function(req, res) {
      Utility.validateAccountNumber(req,res);

    });

    app.get('/ngn_usd', function(req, res) {
        return res.send({ success : true,  content: { data : config.get('Lumania.ngnRate') }});
        // res.redirect('/login');
    });

    app.get('/rates', function(req, res) {
      Utility.getRates(req,res);
        // return res.send({ success : true,  content: { data : config.get('Lumania.ngnRate') }});
        // res.redirect('/login');
    });

    app.get('/receive/btc', function(req, res) {
      user.receiveBtc(req,res);

    });

    app.get('/data/profile/:name', function(req, res) {

      var options = {
        root: __dirname + '/data/profile',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
      };

      var fileName = req.params.name;
      res.sendFile(fileName, options);

    });
    app.get('/data/passport/:name', function(req, res) {

      var options = {
        root: __dirname + '/data/passport',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
      };

      var fileName = req.params.name;
      res.sendFile(fileName, options);

    });
    app.get('/data/holder/:name', function(req, res) {

      var options = {
        root: __dirname + '/data/holder',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
      };

      var fileName = req.params.name;
      res.sendFile(fileName, options);

    });


    // create new stellar account
    app.post('/createaccount/', [passport.authenticate('jwt-login', { session: false})], function(req, res) {

      account.createAccount(req,res);
    });

    app.post('/sendpayment/', [passport.authenticate('jwt-login', { session: false}), hasAccount], function(req, res) {
      account.sendPayment(req, res);

    });



  }
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    return res.send({ success : true, message : 'user not logged in' });
    // if they aren't redirect them to the home page
    // res.redirect('/login');
}


function checkLogin(passport){
 return function (req, res, next) {

    var authStatus = passport.authenticate('jwt', { session: false});

    if (authStatus) {
      // console.log("JWT WORKS", authStatus);
      return next();
    }

    return res.send({ success : true, message : 'user not logged in' });
    // if they aren't redirect them to the home page
    // res.redirect('/login');
};
}
//route middleware to make sure the user has an account
function hasAccount(req, res, next) {
  var token = "";
  if (req.body.token){
    token = req.body.token;
  } else{
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).send({ success : false, content:{message : ['Unable to verify account. Token not found']} });
  }

  var user = Utility.decodeToken(token);

  if (user.accounts.length < 1) {
    return res.status(400).send({ success : false, content:{message : ['User has no accounts. Create account']} });
  }

  return next();


}


//route middleware to make sure the user does not have an account
//Deprecated no longer used
function noAccount(req, res, next) {
  var token = "";
  if (req.body.token){
    token = req.body.token;
  } else{
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).send({ success : false, content:{message : ['Session expired']} });
  }

  var user = Utility.decodeToken(token);

  if (user.account_id) {
    return res.status(400).send({ success : false, content:{message : ['User already has account']} });
  }

  return next();


}