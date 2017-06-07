var jwt         = require('jsonwebtoken');
var config = require('config');
var StellarSdk = require('stellar-sdk');
var request = require('request-promise');
var Mail = require('../mail/mail.service');
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

  randomString: function(length) {

    if (length === 'undefined') {
      length = 6;
    }

    let text = "";

    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    console.log("random text: ",text);
    return text;
  },

	createToken: function(user) {
		console.log("generateToken user", user);
		var key = config.get('JWT.secret')+user.uuid;
    var token = jwt.sign(user, key);
    console.log("tk: \n", token);
		return token;
	},
  decodeToken: function (token, uuid) {

		var user = "";
		try{
			user = jwt.verify(token, config.get('JWT.secret')+uuid);
		}catch(error){
			return false;
		}

    console.log("decodeToken user: ", user);
		return user;
  },
  generateAsset: function(type,code,issuer) {
    if (type === 'undefined') {
      return false;
    }

    if (code === 'undefined') {
      code = "";
    }

    if (issuer === 'undefined') {
      issuer = "";
    }

    if (type == 0) {
      return StellarSdk.Asset.native();
    }else{
      var asset = "";
      try{
        asset =  new StellarSdk.Asset(code, issuer);
        return asset;
      }
      catch(error){
        return false;
      }

    }
  },
  getRates: function(req,res) {



    // var ratesObj = { USDXLM: 26.13627454,
    //           NGNXLM: 315.000344,
    //           EURXLM: 0.914704,
    //           CNYXLM: 6.897104,
    //           UGXXLM: 3630.000335,
    //           ZARXLM: 13.350804,
    //           BWPXLM: 10.444304,
    //           INRXLM: 64.23704,
    //           KESXLM: 102.949997,
    //           GHSXLM: 4.238504,
    //           TZSXLM: 2227.000335,
    //           RWFXLM: 819.25,
    //           timestamp: Date.now()
    //            };

    var ratesObj ={}
    var messages = [];

    // return res.status(200).send({status: true, content: {message: messages, data: ratesObj}});
        self.getXlmRate()
            .then(function(resp) {
              console.log(resp);
              ratesObj['USDXLM'] = resp.ticker.price;
              return self.getFiatRate();
            })
            .catch(function(error) {
              console.log(error);
              messages.push('no xlm value');
              throw new Error('noTicker');
            })
            .then(function(resp) {
              console.log(resp);

              for (var prop in resp.quotes) {
                // get the usd rate
                // console.log("prop", prop);
                // var fiatRate = resp.quotes[prop];
                // console.log("fiatRate: ", fiatRate);
                // // convert to xlm
                // var xlmFiatRate = fiatRate/ratesObj['USD_XLM'];
                // console.log("xlmFiatRate: ", xlmFiatRate);
                // console.log("=", fiatRate+"/"+ratesObj['USD_XLM']);
                var target = prop.substring(3)+'XLM';
                // store in rates obj
                // ratesObj[target] = xlmFiatRate;
                ratesObj[target] = resp.quotes[prop];
              }
              ratesObj['timestamp'] = Date.now();

              // set NGN rate
              ratesObj['NGNXLM'] = config.get('Lumania.ngnRate');

              console.log("ratesObj", ratesObj);
              messages.push('rates retrieved');
              var rtnObj = {status: true, content: {'message': messages, 'data': ratesObj}};
              return res.status(200).send(rtnObj);

            })
            .catch(function(error) {
              console.log(error);
              messages.push('no fiat value');
            })
            .catch(function(error) {
              console.log(error);
              return res.status(400).send({status: false, content: {message: messages, data: ratesObj}});

            });


  },

  getXlmRate: function() {
    var options = {
      uri: config.get('Rates.xlmTickerUrl'),
      headers: {
          'User-Agent': 'Lumania App'
      },
      json: true // Automatically parses the JSON string in the response
    };

    return request(options);
  },

  getFiatRate: function() {
    var options = {
      uri: config.get('Rates.fiatTickerUrl'),
      qs: {
          access_key: config.get('Rates.currencyLayerApi'),
          currencies: config.get('Rates.currencyList'),
          format: 1
      },
      headers: {
          'User-Agent': 'Lumania App'
      },
      json: true // Automatically parses the JSON string in the response
    };

    return request(options);

  },

  getBtcAddress: function(txref) {
    var options = {
      uri: config.get('Blockchain.apiUrl'),
      qs: {
          xpub: config.get('Blockchain.xPub'),
          callback: config.get('Blockchain.callbackUrl')+'&txref='+txref,
          key: config.get('Blockchain.apiKey')
      },
      headers: {
          'User-Agent': 'Lumania App'
      },
      json: true // Automatically parses the JSON string in the response
    };

    return request(options);

  },

  resendAuthCode: function(req, res) {
    var user = self.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // todo verify user is on ionic
      // send email
      Mail.onSignUp(req.body.firstname, req.body.email, req.body.auth_code);
      rtnObj = {
        status: true,
        content: {
          message: ['Please check your mail']

        }
      };

      return res.status(200).send(rtnObj);
    }

  },

  contactSupport: function(req, res) {
    var user = self.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // todo verify user is on ionic
      // send email
      Mail.onContactSupport(req.body.sender_name, req.body.sender_email, req.body.subject, req.body.content);
      rtnObj = {
        status: true,
        content: {
          message: ['Support team notified']

        }
      };

      return res.status(200).send(rtnObj);
    }

  },

  requestLumens: function(req, res) {
    var user = self.decodeToken(req.body.token, req.body.uuid);
    var messages = [];
    var rtnObj = {};
    var userObj = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{
      // todo verify user is on ionic
      // send email

      Mail.onRequestLumens(req.body);

      rtnObj = {
        status: true,
        content: {
          message: ['Request sent']
        }
      };

      return res.status(200).send(rtnObj);
    }

  },

  sendLumens: function(destAcct, xlmAmount) {
    var destAcctActive = 0;
    var asset = self.generateAsset(0);
    return server.loadAccount(destAcct)
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
                            destination: destAcct,
                            asset: asset,
                            amount: xlmAmount.toString()
                          }))
                          .addMemo(StellarSdk.Memo.text(req.body.memoText|| ""))
                          .build();
        }
        if (destAcctActive === 0) {
          transaction = new StellarSdk.TransactionBuilder(sender)
                            .addOperation(StellarSdk.Operation.createAccount({
                              destination: destAcct,
                              startingBalance: xlmAmount.toString()
                            }))
                            .addMemo(StellarSdk.Memo.text(req.body.memoText || ""))
                            .build();
        }

        // sign transaction
        transaction.sign(StellarSdk.Keypair.fromSecret(config.get('Lumania.skey')));

        return server.submitTransaction(transaction);
      }

    })

  },

  getBanks: function(req,res) {
    var user = self.decodeToken(req.body.token, req.body.uuid);
    var banksObj = {};
    var messages = [];
    var options = {
      uri: config.get('Moneywave.baseUrl')+'/banks',
      method: 'POST',
      json: true
    };

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}});
    } else{

      console.log("options", options);

      request(options)
        .then(function(resp) {
          console.log(resp);
          banksObj = resp.data;
          return res.status(200).send({status: true, content: {message: ['success'], data: banksObj}});
        })
        .catch(function(err) {
          console.log(err);
          return res.status(400).send({status: false, content: {message: ['failure'], data: banksObj}});
        });
    }

  },

  getMoneyWaveToken: function(token, uuid){
    var user = self.decodeToken(token, uuid);
    var verifyOpts = {
      uri: config.get('Moneywave.baseUrl')+'/v1/merchant/verify',
      method: 'POST',
      body: {
              "apiKey": config.get('Moneywave.apiKey'),
              "secret": config.get('Moneywave.secretKey')
              },
      json: true,
    };

    if (!user || user.uuid != uuid) {
      // return false
      return Promise.reject(new Error('fail'));
    } else{

      return request(verifyOpts);
    }
  },

  getMoneyWaveBalance: function(token){
    acctOpts = {
              uri: config.get('Moneywave.baseUrl')+'/v1/wallet',
              headers: {
                'Authorization': token
              },
              json: true,
            };

    return request(acctOpts);

  },

  MoneyWaveDisburse: function(token, amount, bank_code, account_number, currency, memo){
    
    var verifyOpts = {
      uri: config.get('Moneywave.baseUrl')+'/v1/disburse',
      method: 'POST',
      body: {
              "lock" : config.get('Moneywave.lock'),
              "amount": amount,
              "bankcode": bank_code,
              "accountNumber": account_number,
              "currency": currency,
              "senderName": "Lumania",
              "ref": memo
              },
      headers: {
        'Authorization': token
      },
      json: true,
    };

    return request(verifyOpts);
    
  },


  validateAccountNumber: function(req,res) {
    // get token
    // use token  to verify account number
    // return acct details or error
    var user = self.decodeToken(req.body.token, req.body.uuid);
    var acctObj = {};
    var messages = [];
    var token = "";
    var verifyOpts = {
      uri: config.get('Moneywave.baseUrl')+'/v1/merchant/verify',
      method: 'POST',
      body: {
              "apiKey": config.get('Moneywave.apiKey'),
              "secret": config.get('Moneywave.secretKey')
              },
      json: true,
    };

    var acctOpts = {};

    // verify uuid in token is same in body
    if (!user || user.uuid != req.body.uuid) {
      // return false
      messages.push('User not authorised.');
      res.status(401).send({status: false, content: {message: messages}  });
    } else{

      if (config.get('General.production')) {

        request(verifyOpts)
          .then(function(resp) {
            console.log(resp);
            token = resp.token;
            // verify account number
            acctOpts = {
              uri: config.get('Moneywave.baseUrl')+'/v1/resolve/account',
              method: 'POST',
              body: {
                      "account_number": req.body.account_number,
                      "bank_code": req.body.bank_code
                    },
              headers: {
                'Authorization': token
              },
              json: true,
            };
            return request(acctOpts);

          })
          .catch(function(err) {
            console.log(err);
            messages.push('Cant get account details');
            throw new Error('Token Error');
          })
          .then(function(resp) {
            console.log("acct details", resp);
            return res.status(200).send({status: true, content: {message: messages, data: resp.data }});
          })
          .catch(function(err) {
            console.log(err);
            messages.push('Unable to get account details');
            throw new Error('Authorization Error');
          })
          .catch(function(err) {
            console.log(err);
            return res.status(400).send({status: false, content: {message: messages, data: {} }});
          });

      } else{
        var resp = {
                      "status": "success",
                      "data": {
                        "account_name": "ADETOKUNBO DOSUNMU"
                      }
                    };
        return res.status(200).send({status: true, content: {message: messages, data: resp.data }});
      }



    }
  },

  getNews: function(req, res) {

    var feeds = [
      {
        "title": "Bloom Solutions: Providing unbanked Filipinos a better way to send and receive money",
        "intro": "Today we are shifting our focus to financial inclusion in the Philippines. Today’s interview features Bloom Solutions out of Makati City, Philippines. ",
        "image": "https://www.stellar.org/wp-content/uploads/2017/05/wwh-2.jpg",
        "url": "https://www.stellar.org/blog/financial-inclusion-philippines-bloom-solutions/"
      },

      {
        "title": "Introducing Lightyear.io",
        "intro": "Stellar Development Foundation (SDF) was created for two main purposes. ",
        "image": "https://www.stellar.org/wp-content/uploads/2017/05/Lightyear.io-header.jpg",
        "url": "https://www.stellar.org/blog/lightyear-announcement/"
      },

      {
        "title": "Cellulant – Banking the Unbanked Across Africa",
        "intro": "Today we are featuring Cellulant, a payments and digital commerce service company based in Africa, with offices in Kenya, Nigeria, Tanzania, Malawi, Uganda, Zambia, Ghana, Zimbabwe, Botswana and Mozambique.",
        "image": "https://www.stellar.org/wp-content/uploads/2017/05/Stellar-Interview-Image-768x553.jpg",
        "url": "https://www.stellar.org/blog/financial-inclusion-africa-cellulant/"
      },

      {
        "title": "Monthly Roundup – April",
        "intro": "Interested in seeing what we were up to last month? Below we have put together a roundup of the most exciting news and updates from April. To be the first to receive these updates, consider signing up for our newsletter",
        "image": "https://www.stellar.org/wp-content/uploads/2017/05/Stellar-Header-Image-768x235.Providing",
        "url": "https://www.stellar.org/blog/april-news-stellar"
      },
      {
        "title": "Dr. Olayinka David-West: How to Drive Financial Inclusion in Nigeria",
        "intro": "For our first post of Financial Inclusion month at Stellar.org, we are honored to feature Academic Director at both the Lagos Business School and Pan-Atlantic University, Dr. Olayinka David-West.",
        "image": "https://www.stellar.org/wp-content/uploads/2017/04/Yinka-David-West-3-200x300.jpg",
        "url": "https://www.stellar.org/blog/financial-inclusion-nigeria-lagos-business-school-david-west-olayinka/"
      },
            {
        "title": "Stellar Lumens Invade Top 10 CryptoCurrencies with 131 Percent Growth Rate",
        "intro": "Stellar Lumens started making waves over the weekend sending shivers down the spines of the elite cryptos on the top 10. Last week it made a strong statement and announced its presence when it made it to the upper areas below the 10th range displacing well-performing digital currencies like Decred, PIVX, Stratis, SingularDTV, Factcom and a few others.",
        "image": "https://cdn4.cryptocoinsnews.com/wp-content/uploads/2017/05/Screenshot_40.png",
        "url": "https://www.cryptocoinsnews.com/stellar-lumens-invade-top-10-with-131-percent-growth-rate/"
      },
            {
        "title": "Top 10 Reshuffles On CoinMarketCap: Ethereum vs. Ripple, Nem vs. Litecoin & More",
        "intro": "As Bitcoin continues to grow, some altcoins are not being left behind either. Last week there was an intense competition on the Top 10 of CoinMarketCap with some casualties being posted. It was so engrossing to see some old cryptocurrencies uprooted from their longstanding positions. This registered the fact that no entity has a monopoly over a particular position.",
        "image": "https://cointelegraph.com/images/725_Ly9jb2ludGVsZWdyYXBoLmNvbS9zdG9yYWdlL3VwbG9hZHMvdmlldy8wM2UwZWZhYzQ3M2M1MzdiZmI2M2E4ZDg2MTgxMTJmZi5qcGc=.jpg",
        "url": "https://cointelegraph.com/news/top-10-reshuffles-on-coinmarketcap-ethereum-vs-ripple-nem-vs-litecoin-more"
      },

    ];

    return res.status(200).send({status: true, content: {data: feeds}  });

  },

};

module.exports = self;
