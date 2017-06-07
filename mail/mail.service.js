var config = require('config');
var Mailgun = require('mailgun-js')({apiKey: config.get('Mail.apiKey'), domain: config.get('Mail.domain')});
var from = config.get('Mail.fromName')+' <'+config.get('Mail.fromAddress')+'>';

module.exports = {
  onSignUp: function(rcptName, rcptEmail, auth_code) {

    var data = {
    //Specify email data
      from: from,
    //The email to contact
      to: rcptEmail,
    //Subject and text data  
      subject: 'Welcome to Lumania: verify email address',
      html: 'Hello '+rcptName+', <br> Thank you for signing up on Lumania. <br>Please verify your email address be entering this code: <strong>'+auth_code+'</strong>'+config.get('Mail.signature')
    };

    return this.sendEmail(data);

  },
  onChangePassword: function(firstname,email) {
    var body = `Hello ${firstname}, <br> Your Lumania account password has been changed. 
      If this was not initiated by you, kindly contact us immediately.
      ${config.get('Mail.signature')}
    `;

    var data = {
      from: from,
      to: email,
      subject: 'Password Changed',
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },
  onChangePin: function(firstname,email) {
    var body = `Hello ${firstname}, <br> Your Lumania account pin has been changed. 
      If this was not initiated by you, kindly contact us immediately.
      ${config.get('Mail.signature')}
    `;

    var data = {
      from: from,
      to: email,
      subject: 'Pin Changed',
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onPayWithBtc: function(name, email, address, amount, xlmAmount) {
    var body = `Hello ${name}, <br> 
    Please pay ${amount} BTC to <b>${address}</b> to purchase ${xlmAmount}XLM.
    <br>
    Your order will be automatically processed after 6 confirmations.
    <br>
      ${config.get('Mail.signature')}
    `;

    var data = {
      from: from,
      to: email,
      subject: 'BTC address',
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onInsufficientBalance: function(currentBal, xlmAmount, txObj) {
    var body = `Hello, <br> Insufficient balance to process sale. 
      <p>Current Balance: ${currentBal}</p>
      <p>Amount to send: ${xlmAmount}</p>
      <p>Transaction ID: ${txObj.id}</p>
      ${config.get('Mail.signature')}
    `;

    var data = {
      from: from,
      subject: 'Insufficient Balance: Top up required',
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onContactSupport: function(sender, email, subject, msg) {
    var body = `${msg}
      <p>============================</p>
      <p>Sender: ${sender}</p>
      <p>Email: ${email}</p>
    `;

    var data = {
      from: from,
      to: config.get('General.appEmail'),
      subject: 'Support Contact: '+subject,
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onRequestLumens: function(requestObj) {
    var body = `Hello ${requestObj.rcvr_name}, <br> 
    You can send me XLM${requestObj.amount} using my stellar address
    <br>
    <b>${requestObj.sender_account_id}</b>
    <br>
    Thanks,
    <br/>
    ${requestObj.sender_name}
    ${requestObj.sender_email}
    <p>===============================</p>
      <b>Sent via Lumania App</b>
      www.lumania.tech
    `;

    var data = {
      from: from,
      to: requestObj.rcvr_email,
      subject: 'XLM'+requestObj.amount+' request from'+requestObj.sender_name,
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onCreditLumensSuccess: function(email, txObj) {
    var body = `Hello, <br> You just purchased XLM${txObj.lumens_amount} via Lumania

      ${config.get('Mail.signature')}
    `;

    var data = {
      from: from,
      to: email,
      subject: 'XLM'+txObj.lumens_amount+' bought',
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onCreditLumensFailure: function(email, amount, txref) {
    var body = `Hello, <br> Your payment of ${amount} via Lumania 
    is being processed.
    <br>
    Transaction Ref: ${txref}

      ${config.get('Mail.signature')}
    `;

    var data = {
      from: from,
      to: email,
      subject: 'Transaction: '+txref+' processing',
      html: body
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onEmailTx: function(rcptEmail, amount, senderEmail, claim_code) {
    var mail_content = `Hello ${rcptEmail}, <br> This is to inform you that to you have received 
      ${amount}XLM. from ${senderEmail}<br> To access this funds, follow the steps below. <br/>
      <h3>If You have a Lumania Account</h3><br/> 1. kindly login to your account.
      <br /> 2. Go to "Profile > Claim Lumens" <br /> 3. Enter the claim code: <b>${claim_code}</b> <br /> 
      <h3> No Lumania Account?</h3> 
      <br/> 1. Download <a href="#">Lumania</a> from the app store, create an account and follow the steps above
      <br />${config.get('Mail.signature')}
      `;
    var data = {
      from: from,
      to: rcptEmail,
      subject: 'You have received '+amount+'XLM.',
      html: mail_content
    };

    console.log("data", data);
    return this.sendEmail(data);
  },

  onNewAccount: function(rcptName, rcptEmail, auth_code) {

    var body = `Hello ${rcptName}, <br> This is your recovery code for your Stellar account
                on Lumania. Please keep it safe.
                <br>
                <b>${auth_code}</b>
                `

    var data = {
    //Specify email data
      from: from,
    //The email to contact
      to: rcptEmail,
    //Subject and text data  
      subject: 'Account recovery code',
      html: body+config.get('Mail.signature')
    };

    return this.sendEmail(data);

  },

  onSellLumens: function(name, email, fiatAmount, xlmAmount, currency) {

    var body = `Hello ${name}, <br> Your request to sell ${xlmAmount}XLM for ${fiatAmount}${currency} 
                has been successful.
                <br>
                <b>${auth_code}</b>
                `

    var data = {
    //Specify email data
      from: from,
    //The email to contact
      to: email,
    //Subject and text data  
      subject: xlmAmount+'XLM sold',
      html: body+config.get('Mail.signature')
    };

    return this.sendEmail(data);

  },  

	sendEmail: function(data) {
    data.bcc = config.get('General.appEmail');
    //Invokes the method to send emails given the above data with the helper library
    
    if (config.get('Mail.devMode') === 0) {

      Mailgun.messages().send(data, function (err, body) {
          //If there is an error, render the error page
          if (err) {
            
              console.log("got an error: ", err);
          }
          //Else we can greet    and leave
          else {
             
              console.log("\nbody\n",body);
          }
      });

    } else{
      console.log("===DevMode===\nDisplaying mail\n", data);
    };


	},


};
