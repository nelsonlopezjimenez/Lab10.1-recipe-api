const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: 'Name cannot be blank!'
    },
    instructions: {
        type: String,
        required: 'Instructions cannot be blank!'
    },
    ingredients: {
        type: [String],
        default: []
    },
    img: {
        type: String,
        required: 'Image cannot be blank!'
    },
    isLogged: {
        type: Boolean,
        default: false
    }
}, { toObject: { virtuals: true } });

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;
//isLogged false added 10.26.2019