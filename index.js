// var StellarSDK = require('stellar-sdk');
var config = require('config');
var express = require('express');
var fileUpload = require('express-fileupload');
// var session = require('express-session');
var bodyparser = require('body-parser');
var passport = require('passport');
var routes = require('./routes');
var fs = require('fs');
var https = require('https');
var util = require('util');
var knexClient = require('knex/lib/client');
var origQuery = knexClient.prototype.query;
knexClient.prototype.query = function (connection, obj) {
  console.log(`SQL: ${obj.sql}  --  ${util.inspect(this.prepBindings(obj.bindings))}`);
  return origQuery.apply(this, arguments);
};

// var notifications = require('./mail/notification.service');

var server = "";



var privateKey  = fs.readFileSync('/etc/letsencrypt/live/lumania.tech/privkey.pem', 'ascii');
var certificate = fs.readFileSync('/etc/letsencrypt/live/lumania.tech/fullchain.pem', 'ascii');
var credentials = { key: privateKey, cert: certificate };



var app = express();



// app.use(session({ secret: 'sazawalletng411',resave: true, saveUninitialized: true }));
require('./config/passport')(passport); // pass passport for configuration

app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Origin", "*");
  // res.header("Access-Control-Allow-Headers", "X-Requested-With, Authorization");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");

  next();
});

// app.engine('html', require('ejs').renderFile);
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');


app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());
app.use(passport.initialize());
app.use(fileUpload());


// configure app routes
routes.configure(app,passport);


// Start server
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8888,  function() {
	console.log('Server started on '+httpsServer.address().port);
});
// var server = app.listen(8888, function() {
//   console.log('Server listening on port ' + server.address().port);
// });
