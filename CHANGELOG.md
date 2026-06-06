# Changelog — `teaching/annotated-walkthrough` branch

This branch is a **teaching pass** over the existing, working backend. The
goal was not to redesign the API but to make every working piece legible:
add comments that explain *why* the code is shaped the way it is (not just
what it does), and fix the small handful of spots where the original code's
behavior didn't match REST conventions closely enough to teach cleanly.

For the cross-cutting, whole-stack analysis (REST, routing, storage,
async/await, components, security, "where to go from here"), see
[`ANALYSIS.md`](ANALYSIS.md) at the root of this repo. This file documents
only what changed *in this repo*, file by file, and why.

---

## `index.js`

**Added:** a header comment diagramming Express's middleware pipeline —
`cors → express.json → express.urlencoded → express.static → router` — and
explaining *why* each layer exists and *why order matters* (e.g. body parsers
must run before any handler that reads `req.body`; `cors()` must run before
the routes it's meant to protect/enable).

**Fixed (small, behavioral):**
- Removed a **duplicate** `app.use(express.json())` call that had no effect
  beyond registering the same middleware twice — harmless, but confusing to
  a student trying to trace the pipeline ("wait, why is this here twice?").
- Removed a dead, commented-out `console.log` line.
- Confirmed and kept `app.use(express.static('public'))` — this is what
  serves recipe images at `http://localhost:3999/<path-from-the-img-field>`,
  which the frontend's `getImageUrl` (in `src/api.js` on the frontend's
  matching branch) depends on. See the inline comment for the full
  request-to-file-on-disk explanation.

**Added:** a "WHERE TO GO FROM HERE" comment block pointing at `ANALYSIS.md`
and previewing the authentication/authorization roadmap (§9 there) — so a
student reading `index.js` top-to-bottom lands on a concrete next step
instead of just "the end."

## `routes/routes-recipe.js`

**Added:** a comment block laying out the full REST verb → URL → controller →
CRUD-operation mapping as a table, plus an explanation of route parameters
(`:recipeId` → `req.params.recipeId`) and of `router.route(path).verb(...)`
chaining as "one URL, several verbs, one place to read them all."

**No functional changes** — the routing table was already correct and
idiomatic; it just needed the *why* spelled out for newcomers.

## `controllers/controller-recipes.js`

This file got the most substantive refactor in the backend, because its
original error handling and status codes didn't model REST conventions
closely enough to be a good teaching example as-is. Specifically, the
original:

- Had `try`/`catch` on only **one** of five handlers (`createRecipe`) — and
  even there, a caught error wasn't translated into an HTTP error response
  (so a failure would have left the client's request hanging).
- Used `res.status(201)` ("Created") on **every** response, including reads,
  updates, and deletes — where `200 OK` is the correct, conventional code.
- Never checked for Mongoose returning `null` (its way of saying "no document
  matched that id") — so a request for a nonexistent recipe would have
  returned `200`/`201` with a `null` body instead of a `404`.
- Sent `deleteRecipe`'s success response as an interpolated string
  (`` `${data} was deleted from the database` ``, which — because `data` is an
  object — would actually have rendered as the unhelpful literal text
  `"[object Object] was deleted from the database"`) instead of structured
  JSON.

**Changed:**
- Wrapped **every** handler in `try`/`catch`, with the `catch` translating
  thrown errors into `500 Internal Server Error` responses carrying a JSON
  `{ message, error }` body — so a database hiccup now produces a sensible,
  parseable response instead of a hung connection.
- Corrected status codes throughout: `200` for successful reads/updates/
  deletes, `201` reserved for `createRecipe` alone, `400 Bad Request` for
  validation failures (Mongoose `ValidationError`), `404 Not Found` for a
  missing id.
- Added explicit `if (!data) return res.status(404)...` checks after every
  `findById`/`findByIdAndUpdate`/`findByIdAndDelete` — translating Mongoose's
  `null` into the `404` a REST client should expect.
- Changed `deleteRecipe`'s success response from the broken interpolated
  string to structured JSON: `{ message: 'Recipe deleted', recipe: data }`.
  *(Verified this doesn't break the frontend: `useRecipes.js`'s `removeRecipe`
  only checks that the request succeeded — it never reads the delete
  response's body.)*
- Added an extensive header comment explaining `async`/`await`, the
  different *purposes* `try`/`catch` serves in a controller versus a hook
  versus a "control flow" use (cross-referenced in `ANALYSIS.md` §6), and an
  HTTP status-code cheat sheet for quick reference while reading the rest of
  the file.

## `models/model-recipe.js`

**Added:** a header comment explaining what a Mongoose *schema* and *model*
are (the blueprint vs. the thing you actually query), how the `required`
strings double as built-in validation-error messages, and a pointer to
`ANALYSIS.md` §4 for the full localStorage-vs-files-vs-database comparison
that this file's existence is itself an example of.

**No functional changes** — the schema's fields, types, defaults, and
options are exactly as they were.

## `models/index.js`

**Added:** comments explaining the anatomy of the connection string
(`mongodb://127.0.0.1:27017/test030` → protocol, host, port, database name),
what `mongoose.set('debug', true)` does (logs every query Mongoose sends to
MongoDB — invaluable for a student trying to see "what does my `.find({})`
actually turn into?"), and the "models" object as a small service-locator
pattern (one place the rest of the app imports database access from).

**Noted, not changed:** the connection string is hardcoded here even though
`dotenv/config` is already imported in `index.js` — a clean, low-risk
candidate for a "move this to an environment variable" exercise (see
`ANALYSIS.md` §10's deployment discussion for why that matters in practice,
not just in theory).

**Cleaned up:** removed two dead, commented-out lines (an old connection
string using a different host, and a `mongoose.Promise = Promise;` line that
predates Mongoose's native Promise support).

---

## What *didn't* change, and why that matters

No functional/business logic changed in `routes-recipe.js`, `model-recipe.js`,
or the connection setup in `models/index.js` — and the changes in
`controller-recipes.js` were corrections toward documented REST conventions
(status codes, error responses), not redesigns. The app's external behavior
for the *happy path* (valid requests, successful operations) is unchanged;
what changed is how it behaves at the *edges* (bad input, missing records,
database errors) — which is precisely the part that's hardest to learn from
reading a "happy path only" implementation, and most valuable to model
correctly for students who'll write their own controllers soon.

## See also

- [`ANALYSIS.md`](ANALYSIS.md) — the whole-stack analysis (start here for the
  big picture: REST, routing on both sides of the stack, storage trade-offs,
  async/await, components, Tailwind, security, and "where to go from here").
- The frontend repo's own `teaching/annotated-walkthrough` branch and its
  `CHANGELOG.md` for the matching frontend-side write-up.
