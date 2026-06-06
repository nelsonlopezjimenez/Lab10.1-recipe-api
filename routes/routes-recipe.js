import express from 'express';
import {
  getRecipeAll,
  getRecipeOne,
  deleteRecipe,
  updateRecipe,
  createRecipe,
} from '../controllers/controller-recipes.js';

/**
 * ============================================================================
 *  ROUTES — the "RESTful" part of a REST API
 * ============================================================================
 * REST (REpresentational State Transfer) is a *style* of API design built
 * around RESOURCES (nouns, like "recipe") and a small, standard set of HTTP
 * METHODS (verbs) that act on them. Instead of inventing a different URL for
 * every action —
 *
 *     /getAllRecipes   /addNewRecipe   /removeRecipeById   /editRecipe   ...
 *
 * — REST gives ONE url per resource, and lets the HTTP method say what to do
 * with it:
 *
 *   URL                   METHOD    MEANS…                     CRUD
 *   -------------------   -------   ------------------------   --------------
 *   /recipe               GET       "list every recipe"        Read (all)
 *   /recipe               POST      "create a new recipe"      Create
 *   /recipe/:recipeId     GET       "show me this one recipe"  Read (one)
 *   /recipe/:recipeId     PUT       "replace this recipe"      Update
 *   /recipe/:recipeId     DELETE    "remove this recipe"       Delete
 *
 * Notice the symmetry with CRUD (Create / Read / Update / Delete) — that's
 * not a coincidence, it's the whole point of REST. Once you know this
 * pattern, you can predict the shape of almost any well-designed API.
 *
 * Remember this router is *mounted* at '/api/v1/recipe' in index.js, so every
 * path written here is relative to that prefix:
 *   '/'            here  ==  http://localhost:3999/api/v1/recipe
 *   '/:recipeId'   here  ==  http://localhost:3999/api/v1/recipe/<some-id>
 * ============================================================================
 */

// express.Router() creates a mini, self-contained Express app: it can have
// its own routes and middleware, and gets "plugged into" the main app
// (see index.js). This keeps route definitions for different resources
// (recipes, users, comments...) cleanly separated into their own files.
const router = express.Router();

// `.route(path)` returns an object you can chain HTTP-method handlers onto.
// This is just a shorthand for writing the two statements separately:
//     router.get('/', getRecipeAll);
//     router.post('/', createRecipe);
// Chaining communicates "these handlers all share the same URL" at a glance.
router.route('/').get(getRecipeAll).post(createRecipe);

// `:recipeId` is a ROUTE PARAMETER — a named placeholder segment. Express
// matches whatever the client put in that position of the URL and exposes it
// on `req.params.recipeId` inside the controller functions. For example:
//
//     DELETE /api/v1/recipe/64f1a2b3c4d5e6f7a8b9c0d1
//                           └────────────┬───────────┘
//                              req.params.recipeId
//
// That value is the recipe's MongoDB-generated `_id` — see model-recipe.js
// and how the frontend reads `recipe._id` to build these URLs.
router
  .route('/:recipeId')
  .get(getRecipeOne)
  .put(updateRecipe)
  .delete(deleteRecipe);

export default router;
