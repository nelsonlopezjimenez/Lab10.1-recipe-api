import mongoose from 'mongoose';
import Recipe from './model-recipe.js';

mongoose.set('debug', true);

mongoose.connect('mongodb://127.0.0.1:27017/test030');
//mongoose.connect('mongodb://localhost/test030');


// mongoose.Promise = Promise;
const models = { Recipe };

export default models;
     