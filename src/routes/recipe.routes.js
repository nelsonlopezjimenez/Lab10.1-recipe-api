// src/routes/recipe.routes.js
import express from 'express';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipesByCategory,
  rateRecipe,
  getRecipeStats
} from '../controllers/recipe.controller.js';
import { recipeValidation, updateRecipeValidation } from '../middleware/validation.js';

const router = express.Router();

// Statistics route (before parameterized routes)
router.get('/stats', getRecipeStats);

// Category routes
router.get('/category/:category', getRecipesByCategory);

// Main CRUD routes
router.route('/')
  .get(getAllRecipes)
  .post(recipeValidation, createRecipe);

router.route('/:id')
  .get(getRecipeById)
  .put(updateRecipeValidation, updateRecipe)
  .delete(deleteRecipe);

// Rating route
router.post('/:id/rate', rateRecipe);

export default router;