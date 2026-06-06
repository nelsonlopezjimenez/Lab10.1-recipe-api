import express from 'express';
import cors from 'cors';
import router from './routes/routes-recipe.js';
import 'dotenv/config';

/**
 * ============================================================================
 *  ENTRY POINT — wiring an Express app together
 * ============================================================================
 * Express models the server as a PIPELINE: every incoming HTTP request flows
 * through a chain of MIDDLEWARE functions (registered with app.use) before it
 * reaches a route handler that finally sends a response back to the client.
 *
 *        request  ─▶ [cors] ─▶ [json parser] ─▶ [static files] ─▶ [router] ─▶ response
 *
 * Order matters — middleware runs top-to-bottom in the order it's registered.
 * Keep that picture in mind as you read the app.use(...) calls below.
 * ============================================================================
 */

const app = express();

// `process.env` reads configuration from the environment (or a local `.env`
// file, loaded above by `import 'dotenv/config'`). Reading the port this way
// — instead of hardcoding `3999` — means the exact same code can run on
// whatever port a host (Render, Railway, Heroku...) assigns in production.
const port = process.env.PORT || 3999;

// ---------------------------------------------------------------------------
// MIDDLEWARE — functions that run on (almost) every request
// ---------------------------------------------------------------------------

// 1) CORS — Cross-Origin Resource Sharing.
//    Our frontend (e.g. http://localhost:3000, a Vite dev server) and this
//    API (http://localhost:3999) are different ORIGINS. Browsers block
//    JavaScript on one origin from reading responses from another unless the
//    server explicitly opts in via CORS headers. cors() adds those headers
//    for us. This is the direct, visible consequence of splitting frontend
//    and backend into two separate apps/repos.
app.use(cors());

// 2) Body parsers — turn the raw bytes of an HTTP request body into a
//    JavaScript object we can actually use:
//      express.json()       → parses `Content-Type: application/json` bodies
//                             (what our React app sends) into `req.body`
//      express.urlencoded() → parses classic HTML <form> submissions
//                             (`Content-Type: application/x-www-form-urlencoded`)
//    Without these, `req.body` would be `undefined` and createRecipe /
//    updateRecipe would have nothing to work with.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) Static file serving.
//    Anything placed in ./public is served directly at the matching URL path,
//    e.g. a GET to http://localhost:3999/spaghetti.jpg returns
//    ./public/spaghetti.jpg as-is — no route handler needed. This is how the
//    recipe images become reachable for the React frontend to <img src=...>.
app.use(express.static('public'));

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

// `router` (see routes/routes-recipe.js) groups every endpoint that belongs
// to the "recipe" resource. Mounting it at '/api/v1/recipe' prefixes ALL of
// its routes automatically:
//
//   GET    /api/v1/recipe        → list every recipe
//   POST   /api/v1/recipe        → create a recipe
//   GET    /api/v1/recipe/:id    → fetch one recipe
//   PUT    /api/v1/recipe/:id    → update one recipe
//   DELETE /api/v1/recipe/:id    → delete one recipe
//
// Two REST conventions hiding in that prefix:
//   '/api'  → "this URL returns data (JSON), not an HTML page"
//   '/v1'   → API VERSIONING. If you need a breaking change later, you can
//             add '/v2' routes alongside '/v1' instead of breaking every
//             client (mobile apps, other services...) that already depends
//             on the old shape.
app.use('/api/v1/recipe', router);

// A minimal health-check / landing route. Visiting http://localhost:3999/
// in a browser confirms the server is up and responding.
app.get('/', function (req, res) {
  res.send('this is root route');
});

app.listen(port, function () {
  console.log('APP IS RUNNING ON PORT ' + port);
});

/**
 * ── WHERE TO GO FROM HERE ───────────────────────────────────────────────────
 * This server currently has NO authentication or authorization — any client
 * that can reach it can read, create, update, or delete any recipe. That's
 * fine (even good!) while you're learning how the moving pieces fit together;
 * security concepts are much easier to understand once you've felt the
 * absence of them. See ANALYSIS.md at the project root for a full discussion
 * of what to add later (and why) once the fundamentals feel solid.
 */
