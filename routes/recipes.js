import express from 'express';
import db from "../models";
import helpers from "../helpers/recipes";

const router =  express.Router();


router.route('/')
 .get(helpers.getRecipes)
 .post(helpers.createRecipe)

router.route('/:RecipeId')
  .get(helpers.getRecipe)
  .put(helpers.updateRecipe)
  .delete(helpers.deleteRecipe)

module.exports = router;
