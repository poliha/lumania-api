var config = require('config');



var dbConfig = {
		host     : 'localhost',
    user     : 'root',
    password : 'c6h6demwinc2h5',
    database : config.get('General.production') ? 'lumania' : 'lumania_test',
    // database : 'lumenswall',
    charset  : 'utf8',
    socketPath:  '/var/run/mysqld/mysqld.sock'

  };

module.exports  =  dbConfig;
