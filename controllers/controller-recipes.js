import models from '../models/index.js';

/**
 * ============================================================================
 *  CONTROLLERS — where the actual work happens
 * ============================================================================
 * Routes decide WHICH function should run for a given URL + HTTP method (see
 * routes/routes-recipe.js). Controllers decide WHAT that function actually
 * DOES: read the request, talk to the database, and shape a response.
 *
 * Every handler below has the (req, res) signature Express always provides:
 *     req → the incoming request  (req.params, req.query, req.body, req.headers)
 *     res → the outgoing response (res.status(...), res.json(...), res.send(...))
 *
 * ── async / await ───────────────────────────────────────────────────────────
 * Talking to MongoDB takes time — it's an I/O operation, not instant
 * arithmetic. Mongoose methods such as `.find()` or `.create()` return a
 * PROMISE: an object representing "a value that will exist later". Marking a
 * function `async` lets us use `await` inside it to pause *that function only*
 * (Node keeps serving other requests in the meantime — nothing blocks) until
 * the promise settles, and write asynchronous code that *reads* top-to-bottom
 * like ordinary synchronous code:
 *
 *     // with await (read this top-to-bottom, easy!)
 *     const data = await models.Recipe.find({});
 *     res.json(data);
 *
 *     // the equivalent without it (harder to follow as it grows)
 *     models.Recipe.find({}).then((data) => res.json(data));
 *
 * ── try / catch ─────────────────────────────────────────────────────────────
 * `await` re-throws whatever error the promise rejects with — e.g. MongoDB is
 * unreachable, or the data fails schema validation. An uncaught error in an
 * async Express handler becomes an unhandled rejection: the client is left
 * hanging with no response, and you lose the chance to log useful context or
 * return a meaningful status code. Wrapping the database call in try/catch
 * lets us:
 *   1. log the real error for ourselves (console.error)
 *   2. send the CLIENT a clean, predictable JSON error response instead
 *
 * ── HTTP status codes (cheat-sheet for the codes used below) ───────────────
 *   200 OK                    general success — you got what you asked for
 *   201 Created               a NEW resource now exists (POST only!)
 *   400 Bad Request           the data the client sent was invalid
 *   404 Not Found             no resource exists at that id
 *   500 Internal Server Error something broke on OUR side, not the client's
 * ============================================================================
 */

// GET /api/v1/recipe — list every recipe in the collection
const getRecipeAll = async (req, res) => {
  try {
    // Recipe.find(filter) returns every document matching `filter`.
    // An empty filter `{}` matches everything — "give me them all".
    const data = await models.Recipe.find({});
    res.status(200).json(data);
  } catch (error) {
    console.error('getRecipeAll failed:', error);
    res.status(500).json({ message: 'Failed to fetch recipes' });
  }
};

// POST /api/v1/recipe — create a new recipe from the request body
const createRecipe = async (req, res) => {
  try {
    // `req.body` holds the parsed JSON payload the client sent. It only
    // exists because index.js registered the express.json() middleware —
    // remove that line and `req.body` would be `undefined` here.
    const data = await models.Recipe.create(req.body);

    // 201 Created is the *correct* status specifically because a brand-new
    // resource now exists in the database as a result of this request.
    res.status(201).json(data);
  } catch (error) {
    console.error('createRecipe failed:', error);
    // Mongoose throws a ValidationError here if required fields (title,
    // instructions, img...) are missing — see model-recipe.js. That's the
    // CLIENT's mistake, not ours, so 400 (not 500) is the honest status code.
    res.status(400).json({ message: error.message });
  }
};

// GET /api/v1/recipe/:recipeId — fetch a single recipe by its Mongo _id
const getRecipeOne = async (req, res) => {
  try {
    // Route params — the `:recipeId` segment captured from the URL — live
    // on req.params, keyed by name (see routes/routes-recipe.js).
    const data = await models.Recipe.findById(req.params.recipeId);

    // IMPORTANT: when nothing matches, findById resolves to `null` — it does
    // NOT throw. If we skipped this check, we'd send `null` back with a 200
    // "success" status, telling the client "here's your recipe: nothing",
    // which is confusing to consume. Translating "found nothing" into an
    // explicit 404 is *our* responsibility as API authors.
    if (!data) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('getRecipeOne failed:', error);
    res.status(500).json({ message: 'Failed to fetch recipe' });
  }
};

// PUT /api/v1/recipe/:recipeId — update an existing recipe
const updateRecipe = async (req, res) => {
  try {
    const data = await models.Recipe.findByIdAndUpdate(
      req.params.recipeId,
      req.body,
      { new: true } // return the document AFTER the update, not the stale original
    );

    if (!data) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // 200 OK, not 201 — we modified something that already existed.
    // Reserve 201 for "a brand-new resource was created" (see createRecipe).
    res.status(200).json(data);
  } catch (error) {
    console.error('updateRecipe failed:', error);
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/v1/recipe/:recipeId — remove a recipe permanently
const deleteRecipe = async (req, res) => {
  try {
    const data = await models.Recipe.findByIdAndDelete(req.params.recipeId);

    if (!data) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Returning the deleted document (rather than a plain sentence like
    // "<id> was deleted from the database") gives the client structured
    // JSON it can actually use — e.g. to confirm which recipe disappeared,
    // or to show its title in a "Recipe X was deleted" toast.
    res.status(200).json({ message: 'Recipe deleted', recipe: data });
  } catch (error) {
    console.error('deleteRecipe failed:', error);
    res.status(500).json({ message: 'Failed to delete recipe' });
  }
};

export { getRecipeAll, getRecipeOne, createRecipe, deleteRecipe, updateRecipe };
