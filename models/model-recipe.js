import mongoose from 'mongoose';

/**
 * ============================================================================
 *  SCHEMA & MODEL — describing the shape of a "recipe" document
 * ============================================================================
 * MongoDB itself is *schema-less*: it will gladly store wildly different
 * document shapes side-by-side in the same collection. Mongoose layers a
 * SCHEMA on top — a blueprint describing each field's name, type, and simple
 * rules — which buys us things plain MongoDB doesn't give for free:
 *
 *   • Validation → reject malformed data BEFORE it ever reaches the database
 *   • Defaults   → silently fill in sensible values for omitted fields
 *   • Casting    → e.g. coerce the string "12" into the number 12
 *   • Convenience→ rich query helpers: .find, .findById, .create, .findByIdAndUpdate...
 *
 * ── Why a database instead of localStorage or flat files? ──────────────────
 * (Full comparison lives in ANALYSIS.md at the project root — short version:)
 *
 *   localStorage  → lives in ONE browser, on ONE device. Two students viewing
 *                   "the same" app see completely different data. No querying,
 *                   ~5MB cap, gone if the user clears site data.
 *   flat files    → better than localStorage (shared, persists on a server),
 *                   but reading/writing the whole file for every change
 *                   doesn't scale, and concurrent writes can corrupt the file.
 *   MongoDB       → shared, persistent, queryable, handles many simultaneous
 *                   readers/writers safely, and — paired with Mongoose — adds
 *                   the validation and structure shown in this very file.
 * ============================================================================
 */
const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // A truthy string here doubles as BOTH "this field is required" AND
      // the custom message Mongoose attaches to the ValidationError if it's
      // missing — that message is what controller-recipes.js relays back to
      // the client as `error.message` when createRecipe/updateRecipe fail.
      required: 'Name cannot be blank!',
    },
    instructions: {
      type: String,
      required: 'Instructions cannot be blank!',
    },
    ingredients: {
      type: [String],   // an ARRAY of strings — e.g. ["2 eggs", "1 cup flour"]
      default: [],      // store [] rather than `undefined` when the field is omitted
    },
    img: {
      type: String,
      required: 'Image cannot be blank!',
    },
    isLogged: {
      type: Boolean,
      default: false,
    },
  },
  {
    // `toObject: { virtuals: true }` makes "virtual" properties — computed
    // fields that are derived on the fly rather than stored in the database —
    // appear when a document is converted to a plain JS object. There aren't
    // any virtuals defined yet, but this is exactly the switch you'd need if
    // you later added e.g. a `fullImageUrl` virtual that combines `img` with
    // the server's base URL.
    toObject: { virtuals: true },
  }
);

// mongoose.model(name, schema):
//   1. registers this schema under the name 'Recipe'
//   2. returns a MODEL — the object whose static methods (.find, .create,
//      .findById, .findByIdAndUpdate, .findByIdAndDelete...) are how the
//      controllers talk to MongoDB's `recipes` collection. (Mongoose
//      automatically lower-cases and pluralizes 'Recipe' → 'recipes' to
//      find — or create — the matching collection.)
const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;
