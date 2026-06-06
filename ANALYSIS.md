# Full-Stack Analysis — Recipe App (Backend + Frontend)

> **Where this file lives:** at the root of the **backend** repo
> (`Lab10.1-recipe-api`), on the `teaching/annotated-walkthrough` branch.
> A matching branch with the same name exists in the **frontend** repo
> (`Lab10.1-recipe-react-frontend`); its `CHANGELOG.md` documents the
> frontend-specific work. When you build your combined "both apps" folder,
> this document is the one meant to describe the *whole* stack — start here,
> then dive into the inline comments in the actual source files (that's where
> the day-to-day teaching detail lives; this file is the map).

## How to use this document with students

Read it top to bottom once for the big picture, then use it as a reference
while reading the source files — nearly every concept named here has a
matching comment block at its point of use in the code. Suggested order for
a class:

1. **Backend first** (this repo): `index.js` → `routes/routes-recipe.js` →
   `controllers/controller-recipes.js` → `models/`
2. **Then frontend** (`Lab10.1-recipe-react-frontend`): `src/api.js` →
   `src/hooks/useRecipes.js` → `src/App.jsx` → `src/components/`

This mirrors the data's actual journey: a request starts in the browser,
travels through the API layer, hits a route, runs through a controller,
touches the database, and the response flows all the way back to a
component's render. Once a student can trace one full round trip — say,
"what happens, in order, when I click Delete on a recipe card?" — they have
the mental model for the whole stack.

---

## 1. The big picture: how the pieces fit together

```
┌─────────────────────────┐        HTTP / JSON         ┌──────────────────────────┐        Mongoose         ┌─────────────┐
│   React frontend        │   ───────────────────────▶ │   Express backend        │   ──────────────────▶   │   MongoDB   │
│ (Lab10.1-recipe-react-  │   fetch('http://localhost  │ (this repo)              │   (driver + ODM)        │  database   │
│  frontend, port 5173)   │    :3999/api/v1/recipe')   │  port 3999               │                         │ port 27017  │
│                         │   ◀─────────────────────── │                          │   ◀──────────────────   │             │
└─────────────────────────┘        JSON responses      └──────────────────────────┘        documents        └─────────────┘
```

Three separate programs, three separate "languages of the trade":

| Layer | Technology | Job | Speaks |
|---|---|---|---|
| **Frontend** | React + Vite + Tailwind | renders UI, captures user input, calls the API | JavaScript / JSX in the browser |
| **Backend (this repo)** | Express (Node.js) | exposes an HTTP API, validates requests, talks to the database | JavaScript on the server |
| **Database** | MongoDB (via Mongoose) | persists data durably, across restarts and for every user | BSON documents / Mongo query language |

**Why split it this way at all?** Because each layer can change, scale, fail,
or be replaced independently. You could rewrite the frontend in Vue without
touching the backend; you could swap MongoDB for PostgreSQL without the
frontend ever noticing — *as long as the contract between layers (the REST
API's shape) stays the same.* That contract — "send a `POST` to
`/api/v1/recipe` with a JSON body shaped like `{ title, ingredients,
instructions, img }`, and you'll get a `201` with the saved recipe back" — is
the single most important thing to internalize early. Everything below is
really just elaboration on *how that contract is implemented* on each side.

---

## 2. RESTful application concepts

**REST** (REpresentational State Transfer) is a *style* of API design — a set
of conventions, not a library or protocol. Its central idea: model your
problem domain as **resources** (here: recipes), give each one a stable URL,
and use HTTP's existing verbs to say what you want to do *to* that resource.

This app's entire API surface is one resource family:

| HTTP verb | URL | Meaning | Maps to (CRUD) | Controller |
|---|---|---|---|---|
| `GET` | `/api/v1/recipe` | list every recipe | **R**ead (collection) | `getRecipeAll` |
| `POST` | `/api/v1/recipe` | create a new recipe | **C**reate | `createRecipe` |
| `GET` | `/api/v1/recipe/:recipeId` | fetch one recipe | **R**ead (single) | `getRecipeOne` |
| `PUT` | `/api/v1/recipe/:recipeId` | replace/update one recipe | **U**pdate | `updateRecipe` |
| `DELETE` | `/api/v1/recipe/:recipeId` | remove one recipe | **D**elete | `deleteRecipe` |

A few things worth pointing out to students explicitly:

- **The URL names a *thing*, not an *action*.** Compare `/api/v1/recipe/:recipeId`
  with `DELETE` against an RPC-flavored alternative like
  `/api/deleteRecipe?id=123`. REST pushes the verb into the *HTTP method*,
  leaving the URL to describe *what* you're operating on. This is what makes
  `router.route('/:recipeId').get(...).put(...).delete(...)` in
  [`routes/routes-recipe.js`](routes/routes-recipe.js) so compact — one URL,
  three verbs, three behaviors.
- **Status codes are part of the contract, not decoration.** `200 OK`,
  `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server
  Error` each tell the *caller* — which might be your React app, a teammate's
  script, or `curl` — how to react without parsing the response body. The
  original controller used `res.status(201)` for *every* response (including
  reads, updates, and deletes, where `200` is correct and `201` is
  misleading); see [`controllers/controller-recipes.js`](controllers/controller-recipes.js)
  for the corrected mapping and a fuller cheat-sheet in its header comment.
- **Versioning the URL (`/api/v1/...`) buys you room to grow.** If the shape
  of a recipe needs to change in a breaking way later, you can stand up
  `/api/v2/recipe` alongside the old one instead of breaking every existing
  client overnight.
- **REST is stateless.** Each request carries everything the server needs to
  handle it (the method, the URL, the body, any auth headers) — the server
  doesn't remember "what the client was doing before." This is *why* the
  frontend has to re-send the full updated recipe on every `PUT`, and *why*
  authentication (see §7) has to be proven on every single request rather
  than "remembered" by the server between calls.

---

## 3. Routing — two *very* different meanings of the same word

Students often conflate "routing" because the word shows up on both sides of
the stack — but it means almost opposite things in each:

### 3a. Backend routing (Express) — mapping *URLs* to *handler functions*

This is "real" routing in the REST sense: an incoming HTTP request's method +
path is matched against a table of registered routes, and the matching
handler runs. See [`routes/routes-recipe.js`](routes/routes-recipe.js):

```js
router.route('/').get(getRecipeAll).post(createRecipe);
router.route('/:recipeId').get(getRecipeOne).put(updateRecipe).delete(deleteRecipe);
```

`:recipeId` is a **route parameter** — a placeholder segment that Express
captures and hands to the controller as `req.params.recipeId`. A request to
`/api/v1/recipe/65f1a2b3c4d5e6f7a8b9c0d1` arrives with `recipeId` already
parsed out for you; no manual URL-string-splitting required. The mounting
line in [`index.js`](index.js) — `app.use('/api/v1/recipe', router)` — prefixes
*every* route in this router with `/api/v1/recipe`, which is what makes the
versioned, namespaced URLs in the table above actually resolve.

### 3b. Frontend "routing" — in *this* app, there isn't any (yet)

This is an important, slightly counter-intuitive point: **the React frontend
in this project has no client-side router.** There's no `react-router-dom`
in its `package.json`, no `<Route>` components, and the browser's URL never
changes as the user interacts with the app. Instead, [`App.jsx`](../Lab10.1-recipe-react-frontend/src/App.jsx)
uses plain React state (`showForm`, `editingRecipe`) and **conditional
rendering** (`{showForm && <RecipeForm .../>}`) to swap *what's visible*
without ever leaving the page or changing the address bar.

This is a perfectly valid choice for a small, single-screen app — and a
great teaching opportunity: ask students "how would you add a dedicated
`/recipes/:id` detail page, with its own shareable URL and working browser
Back button?" The honest answer is "you'd add `react-router-dom`" — which is
exactly the kind of natural next step flagged in §8 (Where to go from here).
Conflating "the backend has routes" with "the frontend must too" is a common
early-career confusion; this app is a clean example of a *frontend that
doesn't need client-side routing yet*, which makes the distinction concrete.

---

## 4. Storage: localStorage vs. flat files vs. a database

Where should an application keep the data it needs to survive a page reload,
a server restart, or being used by more than one person at once? This app
picked MongoDB — but understanding *why*, and what the alternatives would
have cost, is more valuable than memorizing "use a database." Walk through
all three with students:

| | **`localStorage`** (browser) | **Flat files** (server disk, e.g. `data.json`) | **Database** (MongoDB, this app) |
|---|---|---|---|
| **Lives in** | the user's browser, per-origin | the server's filesystem | a dedicated database server/process |
| **Survives** | page reloads, browser restarts — but is wiped by "clear site data," and never leaves *that* browser | server restarts; but a deploy that wipes the disk wipes the data too | server restarts, redeploys, even moving to a new server (it's a separate service) |
| **Shared across users/devices?** | **No** — Alice's `localStorage` is invisible to Bob, and to Alice on her phone | Yes, if the server has one canonical copy — *but only the server can see it* | **Yes** — the whole point; many backend instances can all read/write the same data |
| **Querying** | none — you load the whole blob and filter in JS | none built-in — same problem, worse at scale (read the whole file to find one record) | rich queries, indexes, filters, sorting, aggregation — `Recipe.find({ title: /pasta/i })` instead of "load everything and `.filter()`" |
| **Concurrency** (two writes at once) | not a real concern — one browser, one tab usually | **a real hazard** — two requests writing the same file can corrupt or overwrite each other's changes | databases are *built* to handle this safely (atomic operations, transactions, locking) |
| **Typical use** | small bits of *client-only* preference data (theme, draft text, a "remember me" flag) | quick prototypes, config, logs, generated reports — not your primary multi-user data store | the system of record for any data that must be correct, durable, and shared |

Concrete framing for students: *"If I refresh the page, will my recipe still
be there? If I open the app on my phone, will I see the same recipes? If two
people add a recipe at the exact same second, will both be saved correctly?"*
`localStorage` fails question 2 outright (it never leaves the browser); flat
files can fail question 3 (concurrent writes); a real database is designed to
answer "yes" to all three. That's precisely why this app reaches for MongoDB
rather than, say, writing recipes to a JSON file or stashing them in the
browser — see the comment block at the top of
[`models/model-recipe.js`](models/model-recipe.js) for the in-context version
of this comparison, right where the schema is defined.

One more subtlety worth surfacing: **the *frontend* still uses the network,
not `localStorage`, as its source of truth.** Every recipe the user sees came
from a `fetch` to the backend (see [`src/api.js`](../Lab10.1-recipe-react-frontend/src/api.js)
and [`src/hooks/useRecipes.js`](../Lab10.1-recipe-react-frontend/src/hooks/useRecipes.js)) —
nothing is cached client-side between sessions. That's *correct* for shared,
authoritative data like recipes. `localStorage` would be the *right* tool for
something like "remember whether this user prefers dark mode," which is
exactly the kind of contrast that helps the distinction click.

---

## 5. `async`/`await` — writing asynchronous code that *reads* synchronously

Nearly every interesting operation in this stack takes time and can fail:
querying a database, making an HTTP request, reading a file. JavaScript
represents "a value that will exist later, or might fail instead" with a
**Promise**. `async`/`await` is syntax that lets you *write* code that waits
on a Promise as if it were an ordinary, blocking statement — while the
JavaScript engine keeps the program responsive underneath.

**Backend example** — [`controllers/controller-recipes.js`](controllers/controller-recipes.js):

```js
const getRecipeAll = async (req, res) => {
  const data = await models.Recipe.find({});   // pause here until Mongo responds…
  res.status(200).json(data);                  // …then continue with the result
};
```

`models.Recipe.find({})` returns a Promise *immediately* — the actual
database round trip (network latency, query execution, serialization) hasn't
finished yet. `await` is what says "pause *this function* (not the whole
server!) until that Promise settles, then hand me its resolved value." Every
controller in this file is declared `async` for exactly this reason — they
all `await` at least one Mongoose call.

**Frontend example** — [`src/hooks/useRecipes.js`](../Lab10.1-recipe-react-frontend/src/hooks/useRecipes.js):

```js
const fetchRecipes = useCallback(async () => {
  setLoading(true);
  try {
    const data = await getAllRecipes();   // wait for the network round trip
    setRecipes(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);
```

Same shape, same idea — `await getAllRecipes()` pauses until the `fetch`
resolves (or rejects), and the surrounding `try`/`catch`/`finally` (next
section) decides what to do with each outcome.

**The mental model worth drilling in:** `await` doesn't freeze the program.
While the backend awaits MongoDB, Node keeps handling *other* incoming
requests; while the frontend awaits the API, React keeps the UI responsive
(that's *why* `loading` state exists — to show *something* during the wait
rather than a frozen screen). `async`/`await` is "synchronous-*looking*"
syntax over fundamentally asynchronous, non-blocking machinery — a deliberate
illusion that makes the code dramatically easier to read than the
`.then().catch()` chains it's sugar for.

---

## 6. `try`/`catch` — and *why* it shows up differently in different places

`try`/`catch` catches exceptions — including a *rejected* Promise reached via
`await`. But *where* you put it, and *what you do* in the `catch`, is a
design decision, not a reflex. This codebase deliberately uses it three
different ways, and contrasting them is one of the most useful exercises in
the whole project:

1. **Backend controllers** — catch *and translate* into an HTTP response.
   A thrown error here can't just "go to the console" — the client is
   sitting there waiting for *some* HTTP response. See
   [`controllers/controller-recipes.js`](controllers/controller-recipes.js):
   ```js
   const getRecipeOne = async (req, res) => {
     try {
       const data = await models.Recipe.findById(req.params.recipeId);
       if (!data) return res.status(404).json({ message: 'Recipe not found' });
       res.status(200).json(data);
     } catch (err) {
       res.status(500).json({ message: 'Failed to fetch recipe', error: err.message });
     }
   };
   ```
   Notice this *also* needs an explicit `if (!data)` check — Mongoose
   resolves with `null` for "not found" rather than *throwing*, so a `404`
   has to be produced deliberately, not caught.

2. **The frontend's data-fetching hook** — catch and turn into *state* that
   drives UI. See [`src/hooks/useRecipes.js`](../Lab10.1-recipe-react-frontend/src/hooks/useRecipes.js):
   the `catch` block calls `setError(err.message)`, which `App.jsx` then
   renders as an `<ErrorMessage>` with a retry button. The error doesn't stop
   the app — it becomes *part of the UI*.

3. **`App.jsx`'s save/delete handlers** — catch, but *don't* swallow the
   user's work. A failed save shouldn't silently reset the form and discard
   what they typed:
   ```js
   const handleSaveRecipe = async (recipeData) => {
     try {
       /* ...await addRecipe / updateRecipe... */
       setShowForm(false);
     } catch (err) {
       console.error('Error saving recipe:', err);   // form stays open — nothing is lost
     }
   };
   ```

4. **`getImageUrl` in `src/api.js`** — an entirely different idiom: using
   `try`/`catch` for ordinary **control flow**, not error *handling*. `new
   URL(img)` throws if `img` isn't a full, valid URL — and that's treated as
   useful information ("ah, this must be a bare path") rather than a failure:
   ```js
   try {
     return `${API_ORIGIN}${new URL(img).pathname}`;   // img was a full URL
   } catch {
     return `${API_ORIGIN}/${img.replace(/^\/+/, '')}`; // img was a bare path — handle that case
   }
   ```

**The question to put to students:** *"You just caught an error. Now what?
Who needs to know, and what do they need to be told?"* A backend that catches
an error has to answer with an HTTP status and a JSON body; a hook has to
turn it into state a component can render; a form handler has to protect the
user's unsaved input; and sometimes — as in `getImageUrl` — the "error" isn't
really a problem at all, just one of two expected shapes of input. Four
different answers, four different `catch` blocks. That's the skill: not "did
you remember to write `try`/`catch`," but "did you handle *this specific*
failure the way *this specific* situation demands."

---

## 7. Components — building UIs out of small, composed pieces

(This section is necessarily frontend-focused — head to
[`Lab10.1-recipe-react-frontend/src/`](../Lab10.1-recipe-react-frontend/src)
to see every example named below in full, with inline teaching comments at
each one.)

A React **component** is a function that takes data in (`props`) and returns
a description of UI (JSX). The entire frontend is a tree of these, each one
deliberately kept small and single-purpose:

```
App                                 (the "conductor" — owns UI state, wires everything together)
├── NavBar                          (presentational — toggle-the-form button)
├── RecipeForm                      (controlled form — create/edit one recipe)
├── LoadingSpinner / ErrorMessage   (render-state components — "is the data here yet?")
└── RecipeList                      (maps an array → cards)
    └── RecipeCard (× N)            (renders ONE recipe; reports clicks upward)
```

Concepts worth spending real class time on, each with a concrete example
already annotated in the source:

- **Composition over inheritance.** `App` doesn't *contain* the logic for
  rendering a recipe card, validating a form, or showing a spinner — it
  *assembles* components that each own one job. See the header comment in
  [`App.jsx`](../Lab10.1-recipe-react-frontend/src/App.jsx).
- **Presentational vs. container components.** `RecipeCard`, `NavBar`,
  `LoadingSpinner`, and `ErrorMessage` are "dumb" — they render based purely
  on props and call callbacks they were *handed*, owning no state of their
  own. `App` (with help from the `useRecipes` hook) is the "smart" one that
  actually *decides* what edit/delete/save mean. This separation is what
  makes the dumb components trivially reusable and easy to test in isolation.
- **Custom hooks** (`useRecipes`). A function starting with `use` that bundles
  related state + side effects + actions into one reusable unit — see the
  header comment in [`useRecipes.js`](../Lab10.1-recipe-react-frontend/src/hooks/useRecipes.js)
  for the full breakdown of `useState`, `useEffect`, and `useCallback` working
  together, plus the "optimistic update" pattern used by `addRecipe` /
  `updateRecipe` / `removeRecipe`.
- **Controlled components.** `RecipeForm` keeps every field's value in React
  state (`formData`) rather than letting the DOM track it — see its header
  comment for a diagram of the resulting one-directional data loop, and why
  that unlocks features (instant validation, pre-filling on edit, one-call
  resets) that plain HTML forms can't easily do.
- **Conditional rendering** (`{condition && <Thing />}`) and **list
  rendering** (`array.map(...)` plus the `key` prop) — both explained at their
  exact points of use in `App.jsx`, `RecipeList.jsx`, and `RecipeCard.jsx`,
  including *why* `key` matters and when an array index is (and isn't) a safe
  choice for it.
- **Lifting state up.** `RecipeCard` doesn't decide what "delete" means; it
  just calls `onDelete(_id)` — a function handed down from `App`, three layers up
  — letting the component that *owns* the data make the actual decision. See
  the comment above the action buttons in `RecipeCard.jsx`.

---

## 8. Tailwind CSS — utility classes as a different way to write styles

Traditional CSS: invent a class name, write rules for it somewhere else.
Tailwind: skip the naming step — compose your design directly in the markup
from a large vocabulary of small, single-purpose classes that map almost 1:1
to individual CSS declarations:

```jsx
<div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
```

reads, left to right, as a list of independent style facts: white background,
large rounded corners, a drop shadow, clipped overflow, a *bigger* shadow on
hover, and a smooth 300ms transition between the two shadow states. No
`.recipe-card { ... }` block to go hunting for in a separate stylesheet — the
style travels with the markup. [`RecipeCard.jsx`](../Lab10.1-recipe-react-frontend/src/components/RecipeCard.jsx)
has a guided, line-by-line walkthrough of exactly this string.

Three more pieces worth naming explicitly (each is annotated in
[`src/index.css`](../Lab10.1-recipe-react-frontend/src/index.css)):

- **Variants** (`hover:`, `focus:`, `md:`, `lg:`, `disabled:`...) — prefixes
  that scope a utility to a state or screen size. `hover:shadow-xl` only
  applies on hover; `md:grid-cols-2` only applies at the "medium" breakpoint
  and up (see `RecipeList.jsx` for a full responsive-grid example: 1 column
  on mobile, 2 on tablets, 3 on desktops — zero hand-written media queries).
- **`@theme`** — Tailwind v4's CSS-first way to define design tokens (colors,
  spacing, fonts) as CSS custom properties, which Tailwind then turns into a
  *full family* of utilities automatically. This project's teal brand color
  (`--color-primary-500`, etc.) instantly becomes `bg-primary-500`,
  `text-primary-600`, `hover:bg-primary-700`, and so on — defined once,
  used everywhere, with the actual hex code living in exactly one place.
- **`@apply` and `@layer components`** — the escape hatch for when a long
  utility combination repeats often enough to be worth *naming*: `.btn-primary`
  bundles `bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold
  hover:bg-primary-600 transition-colors` into one reusable class. Comparing
  `.card` in `index.css` with the *actual* `className` on `RecipeCard`'s
  outer `<div>` — which spells the same utilities out longhand instead of
  using the `.card` class — is a great way to make the trade-off concrete:
  WET-but-local (utilities in markup) vs. DRY-but-indirect (named classes via
  `@apply`). Both are idiomatic Tailwind; mature codebases use a mix.

---

## 9. Security & authentication — *why* they matter, and *when* to add them

You've told your students, correctly: **understand how all the pieces work
together before you start locking them down.** Bolting security onto a
system you don't yet understand tends to produce code that's both insecure
*and* confusing — you can't reason about what a guard is protecting if you
don't know what's on the other side of it. So this analysis deliberately
leaves authentication and authorization for *later*. But "later" should be a
planned destination, not an afterthought — here's the orientation for when
your class gets there.

### Why it matters (concretely, in *this* app)

Right now, **every operation in this API is wide open**:

- `cors()` in [`index.js`](index.js) is configured with no options — meaning
  *any* website, anywhere, can call this API from a browser. Fine for local
  development; a real deployment should restrict it to known origins.
- There is no concept of a "user" anywhere in the system — `POST`, `PUT`, and
  `DELETE` on `/api/v1/recipe` will succeed for literally anyone who can
  reach the server. Try it yourself: `curl -X DELETE
  http://localhost:3999/api/v1/recipe/<any-id>` — no password, no token,
  nothing stops it.
- The `isLogged` boolean field already sitting in
  [`models/model-recipe.js`](models/model-recipe.js) is a visible seam —
  *something* about a user/session was clearly being planned at some point,
  and never finished. That's a great prompt: *"What would you need to build
  before this field actually means anything?"*

**Authentication** answers *"who are you?"* (proving identity — usually via a
password, a token, or a session). **Authorization** answers *"are you allowed
to do *this*, specifically?"* (permissions — e.g., "you can edit *your own*
recipes, but not someone else's"). They're related but distinct, and conflating
them is a common source of real-world security bugs — e.g., a system that
correctly identifies *who* you are, but then forgets to check *whether you're
allowed* to delete someone else's data.

### How to approach it (a roadmap, not a how-to)

When the time comes, a typical path through this exact stack looks like:

1. **Add a `User` model** (Mongoose schema — your students already understand
   schemas from `model-recipe.js`) and registration/login endpoints — more
   REST resources, more controllers, nothing conceptually new.
2. **Hash passwords** (`bcrypt`) — *never* store plaintext passwords. This is
   non-negotiable and a perfect "why" discussion: a leaked database of hashed
   passwords is an inconvenience; a leaked database of plaintext passwords is
   a catastrophe for every user who reused that password elsewhere.
3. **Issue and verify tokens** (commonly JSON Web Tokens / JWTs, or
   server-side sessions with cookies) — this is what lets the *stateless* REST
   API (§2) recognize "this request comes from an already-authenticated user"
   without storing per-client state on the server.
4. **Write middleware that checks the token** before a protected route's
   handler runs — Express's `app.use(...)` pipeline (already explained in the
   header comment of [`index.js`](index.js)) is *exactly* the mechanism for
   this: a function that runs before the route handler and can short-circuit
   the request (`return res.status(401)...`) if the credentials are missing
   or invalid.
5. **Add ownership checks in the controllers** — e.g., `updateRecipe` and
   `deleteRecipe` would need to confirm `recipe.owner === req.user.id` before
   proceeding. This is the **authorization** layer, and it's where the
   `isLogged`-style fields would finally earn their keep.
6. **On the frontend**, add login/register forms (more `RecipeForm`-style
   controlled components — nothing new there either), store the resulting
   token (a `localStorage` use case that's actually *appropriate* — see §4!),
   and attach it to every API call as an `Authorization` header in
   [`src/api.js`](../Lab10.1-recipe-react-frontend/src/api.js)'s `apiRequest`
   wrapper — which is *already structured* as a single chokepoint that every
   request passes through, ready for exactly this kind of addition.

The throughline for students: **none of this requires new concepts** — it's
the *same* schemas, routes, controllers, middleware, async/await, components,
and storage decisions you already understand, aimed at a new problem. That's
precisely the reassurance "learn the pieces first" is meant to deliver.

---

## 10. Where to go from here

Once the class is comfortable with the current app, here are natural next
steps — roughly ordered from "small, contained exercises" to "bigger,
multi-concept projects." Each connects back to a concept covered above.

**Small, contained exercises (good for solo practice or pair work):**
- Add a new field to a recipe (e.g. `prepTimeMinutes`, `servings`, `cuisine`)
  — touch the Mongoose schema, the form, and the card display. A complete,
  small round trip through every layer of the stack.
- Add **search/filter** on the recipe list — server-side
  (`Recipe.find({ title: new RegExp(query, 'i') })`, a new query-string-aware
  route) *or* client-side (`Array.prototype.filter` over the already-fetched
  `recipes`). Building both versions back-to-back is a great way to feel the
  difference between "the database does the work" and "the browser does the
  work" — and when each makes sense.
- Add **pagination** — naturally motivates *why* "fetch everything, every
  time" (the current `getRecipeAll`) doesn't scale, and introduces query
  parameters (`?page=2&limit=10`) as another piece of the URL contract.
- Add **toast notifications** for success/failure instead of (or alongside)
  `alert()` and `console.error` — a good excuse to practice component
  composition and to replace a "fire and forget" error path
  (`console.error('Error saving recipe:', err)` in `App.jsx`) with one that's
  actually visible to the user.

**Bigger, multi-concept projects:**
- **Client-side routing** (`react-router-dom`) — give each recipe a real,
  shareable URL (`/recipes/:id`), add a dedicated detail page, and make the
  browser's Back button work the way users expect. Directly resolves the gap
  named in §3b, and is most students' first encounter with the idea that "the
  URL is part of your application's state."
- **File uploads for recipe images** — replace the `img: <url string>` field
  with real uploads (`multer` on the backend, `<input type="file">` on the
  frontend). A perfect excuse to revisit §4: where do uploaded files actually
  *live* — the database (as binary blobs — usually a poor fit), the
  filesystem (simple, but doesn't survive a redeploy on most hosting), or
  object storage like S3 (the production-grade answer)? All three of this
  document's storage options, suddenly very concrete.
- **Authentication & authorization** — the full roadmap is in §9. This is the
  natural "capstone" once everything above feels solid.
- **Automated tests** — note that `package.json`'s `test` script is currently
  a placeholder (`"echo \"Error: no test specified\" && exit 1"`). Backend
  controllers are async functions that take `req`/`res` and touch a database —
  an ideal, bounded subject for a first introduction to integration testing
  (e.g. `supertest` + an in-memory MongoDB via `mongodb-memory-server`).
  Frontend components are pure functions of props — an ideal subject for a
  first introduction to component testing (e.g. React Testing Library).
- **Deployment** — take the app off `localhost`. This is where decisions that
  feel academic right now become unavoidable and concrete: CORS origins
  (§9), environment variables for secrets and URLs (already half-wired via
  `dotenv` and `import.meta.env.VITE_*` — see the comments in `models/index.js`
  and `src/api.js`), and HTTPS all stop being "best practices to remember
  later" and start being "the reason the deployed app does or doesn't work."

---

## A note on how this branch is organized

This analysis sits alongside **inline comments added directly to the source
files** on the `teaching/annotated-walkthrough` branch (in *both* repos —
backend and frontend each have their own copy of that branch name, since
they're independent Git repositories). The split is intentional:

- **This document** is for the *map* — the big ideas, how they connect across
  files and across the frontend/backend boundary, and where to go next.
- **The inline comments** are for the *territory* — the specific reasoning
  behind a specific line, right where a student's eye will already be when
  they're reading that code. (`controllers/controller-recipes.js`'s status
  codes; `useRecipes.js`'s optimistic updates; `RecipeForm.jsx`'s controlled
  inputs; `index.css`'s `@theme`/`@layer`/`@apply` — and many more.)

See each repo's own `README.md` / `CHANGELOG.md` on this branch for a
narrower account of exactly what changed and why, file by file.
