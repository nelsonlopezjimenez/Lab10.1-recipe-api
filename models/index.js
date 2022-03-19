var mongoose = require('mongoose');
mongoose.set('debug', true);
mongoose.connect('mongodb://localhost/lucasknezevich');

mongoose.Promise = Promise;

module.exports.Recipe = require("./recipe");
