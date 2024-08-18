import express from 'express';
import * as controllers from '../controllers/controller-recipes.js';
// import {
//   getRecipeAll,
//   getRecipeOne,
//   deleteRecipe,
//   updateRecipe,
// } from '../controllers/controller-recipes.js';

const router = express.Router();

router.route('/').get(controllers.getRecipeAll).post(controllers.createRecipe);

router
  .route('/:recipeId')
  .get(controllers.getRecipeOne)
  .put(controllers.updateRecipe)
  .delete(controllers.deleteRecipe);

export default router;
