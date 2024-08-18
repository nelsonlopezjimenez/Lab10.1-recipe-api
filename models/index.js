import mongoose from 'mongoose';
import Recipe from './model-recipe.js';

mongoose.set('debug', true);

mongoose.connect('mongodb://localhost/test030');

// mongoose.Promise = Promise;
const models = { Recipe };

export default models;
