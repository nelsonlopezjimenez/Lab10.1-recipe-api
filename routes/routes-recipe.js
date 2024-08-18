import express from 'express';
// import * as controllers from '../controllers/controller-recipes.js';
import {
  getRecipeAll,
  getRecipeOne,
  deleteRecipe,
  updateRecipe,
  createRecipe,
} from '../controllers/controller-recipes.js';

const router = express.Router();

router.route('/').get(getRecipeAll).post(createRecipe);

router
  .route('/:recipeId')
  .get(getRecipeOne)
  .put(updateRecipe)
  .delete(deleteRecipe);

export default router;
