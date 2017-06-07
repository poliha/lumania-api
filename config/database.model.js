var bookshelf = require('./bookshelf');
var bcrypt = require('bcrypt-nodejs');

var User = bookshelf.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  validatePassword: function(password) {
    return bcrypt.compareSync(password, this.get('password'));
  },
  validatePin: function(pin) {
    return bcrypt.compareSync(pin, this.get('pin'));
  },
  transactions: function() {
    return this.hasMany(Transaction);
  },
  accounts: function() {
    return this.hasMany(Account);
  },

});

var Transaction = bookshelf.Model.extend({
  tableName: 'transactions',
  hasTimestamps: true,
  user: function() {
    return this.belongsTo(User);
  }

});

var Transactions = bookshelf.Collection.extend({
  model: Transaction
});


var Account = bookshelf.Model.extend({
  tableName: 'accounts',
  hasTimestamps: true,
  user: function() {
    return this.belongsTo(User);
  }

});

var Accounts = bookshelf.Collection.extend({
  model: Account
});




var returnObj = {};
    returnObj.user = User;
    returnObj.transaction = Transaction;
    returnObj.transactions = Transactions;
    returnObj.account = Account;
    returnObj.accounts = Accounts;

module.exports = returnObj;