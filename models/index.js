var mongoose = require('mongoose');
mongoose.set('debug', true);
mongoose.connect('mongodb://localhost/dianakang');

mongoose.Promise = Promise;

module.exports.Recipe = require("./recipe");
