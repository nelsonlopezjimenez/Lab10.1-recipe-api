# MongoDB Connection — Configuration Scenarios

A companion to [`ANALYSIS.md`](ANALYSIS.md) and [`.env.example`](.env.example),
focused on one specific question students always end up asking once they've
seen `mongoose.connect(...)` work once: *"Okay, but where should this code
actually live, how should the connection string be configured, and what
happens when something goes wrong?"* This document walks through each.

---

## 1. Where should the connection code live?

There's no single "correct" location — but the *trade-offs* between the
options are concrete and worth walking through deliberately, because the
choice affects how easy the codebase is to test, reconfigure, and reason
about as it grows. Three real options, in order of "least to most separated
from the rest of the app":

### Option A — directly in the entry point (`index.js`)

```js
import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/test030');
// ...then app.use(...), app.listen(...), etc.
```

| | |
|---|---|
| **Pros** | Everything about "how this app starts up" is in one file — a newcomer can read top-to-bottom and see the whole boot sequence. Zero indirection. |
| **Cons** | Mixes two unrelated concerns — "configure the database" and "configure the HTTP server" — in one file that will only get busier. Importing `index.js` anywhere else (e.g. a test file that just wants the `Recipe` model) drags the entire Express app and a live database connection along with it. |
| **Best for** | Tiny scripts, quick prototypes, single-file demos — places where "everything in one file" is a feature, not a smell. |

### Option B — directly in the model file (`models/model-recipe.js`)

```js
import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/test030');   // <- added here

const recipeSchema = new mongoose.Schema({ /* ... */ });
const Recipe = mongoose.model('Recipe', recipeSchema);
export default Recipe;
```

| | |
|---|---|
| **Pros** | "Importing this file connects you to the database AND gives you the model" — arguably convenient for a one-model toy app. |
| **Cons** | **Hides a major side effect inside what looks like a simple data-shape definition.** A schema file should describe *what a recipe looks like*; "also, by the way, this opens a network connection the moment you import it" is a surprising, easy-to-miss side effect — and it gets *worse* the moment you add a second model (`User`, `Comment`...): now which file "owns" the connection? Do they all call `mongoose.connect`? (Mongoose would reuse the existing connection, but now the *intent* is scattered and ambiguous — readers can't tell which file is "the real one" without checking all of them.) |
| **Best for** | Honestly, rarely the best choice once you have more than one model — included here mainly because it's the *natural first instinct* ("the model needs a connection, so connect it right there"), and seeing why it doesn't scale is itself the lesson. |

### Option C — a dedicated "models index" file (`models/index.js`) — what THIS app does

```js
// models/index.js
import mongoose from 'mongoose';
import Recipe from './model-recipe.js';

mongoose.connect('mongodb://127.0.0.1:27017/test030');
mongoose.set('debug', true);

const models = { Recipe };
export default models;
```

```js
// controllers/controller-recipes.js
import models from '../models/index.js';
// ...models.Recipe.find({}), models.Recipe.create(...), etc.
```

| | |
|---|---|
| **Pros** | One obvious "front door" to the entire data layer — connect once, register every model, and hand the rest of the app a single `models` object (a small **service-locator pattern**, explained further in `models/index.js`'s own header comment). Adding a second model means adding one line (`const models = { Recipe, User };`) — no new connection logic, no ambiguity about where it lives. Keeps `index.js` focused purely on the *HTTP* concern (middleware, routes, listening), and keeps schema files (`model-recipe.js`) focused purely on *shape* (fields, types, validation). |
| **Cons** | One more file/layer of indirection for a beginner to trace through — "wait, `models` is a folder *and* a file *and* an object?" is a real source of early confusion (worth narrating explicitly in class). |
| **Best for** | Any app with more than one model — which is to say, almost every real app. This is the conventional, scales-cleanly choice, and exactly why it's the one already in place here. |

**The throughline for students:** as an app grows, the question shifts from
"where can I put this code so it works?" (all three options *work* — Mongoose
will happily connect from any of them) to "where can I put this code so the
*next* person — including future-me — can find it without guessing?" Option C
wins not because A and B are *broken*, but because it draws the clearest line
between "what does a recipe look like" (the model), "how do requests flow
through this server" (`index.js`), and "how do I get to the database" (the
models index) — three questions that deserve three different files once an
app is more than a toy.

---

## 2. How should the connection *string* itself be configured?

Orthogonal to *where* the `mongoose.connect(...)` call lives is *what* you
pass it. The current code hardcodes a literal string
(`models/index.js:35` — `mongoose.connect('mongodb://127.0.0.1:27017/test030')`)
even though `index.js` already loads environment variables via
`import 'dotenv/config'`. Three realistic options, and when each earns its
keep:

### Option 1 — hardcoded string (what's currently in place)

```js
mongoose.connect('mongodb://127.0.0.1:27017/test030');
```
- **Pros:** zero setup — clone the repo, run `npm start`, it just works (as
  long as MongoDB is running locally on the default port). Nothing to
  configure, nothing to get wrong.
- **Cons:** the *only* database this code can ever talk to is a local Mongo
  on the default port with this exact database name. Deploying to a host, or
  pointing at a teammate's database, or running a separate test database,
  all require *editing source code* — which is also how credentials end up
  accidentally committed to git history.
- **Right for:** local-only learning exercises — exactly this stage of this
  project, which is *why* it's currently fine as-is (and flagged with a
  "teaching note," not "fixed," in `models/index.js`).

### Option 2 — one full URI from an environment variable

```js
mongoose.connect(process.env.MONGODB_URI);
```
…with `.env` containing `MONGODB_URI=mongodb://127.0.0.1:27017/test030`
(see `.env.example`'s "Shape 1").
- **Pros:** the *exact same code* now connects to a local database in
  development, a teammate's database, a CI test database, or a hosted
  MongoDB Atlas cluster in production — by changing **one line in a
  git-ignored file**, never the source code. This is the single biggest
  "aha" moment of the `.env` pattern: configuration and code are now
  cleanly separated.
- **Cons:** one new concept to teach (environment variables, `dotenv`, the
  `.env`/`.env.example` split) and one new failure mode to anticipate — a
  missing or empty `.env` now means `process.env.MONGODB_URI` is
  `undefined`, and `mongoose.connect(undefined)` fails in a way that's
  *less* obvious to a beginner than "MongoDB isn't running." (A one-line
  guard — `if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is
  not set — did you create a .env file from .env.example?')` — turns that
  confusing failure into an actionable one.)
- **Right for:** essentially every real project past the prototype stage —
  this is the conventional default, and the natural very-next-step for this
  codebase (see `.env.example`'s `MONGODB_URI`).

### Option 3 — compose the URI from separate host/port/name variables

```js
const { MONGO_HOST, MONGO_PORT, MONGO_DB_NAME } = process.env;
mongoose.connect(`mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`);
```
…with `.env` containing the three separate keys (see `.env.example`'s
"Shape 2": `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB_NAME`).
- **Pros:** lets you change *one piece* (just the port, say, when running a
  second Mongo instance for tests) without retyping a whole URI; can be
  friendlier to container/orchestration tooling (Docker Compose, Kubernetes)
  that's often set up to inject *individual* values like `MONGO_PORT` rather
  than a single pre-assembled string.
- **Cons:** more variables to define, document, and keep in sync; you now
  own the string-template logic (and its bugs — a missing `:` or `/` in the
  template produces a confusing connection error, not a template error);
  and it stops working cleanly the moment you need a hosted connection
  string with embedded credentials and query parameters (Atlas-style
  `mongodb+srv://user:pass@cluster/db?retryWrites=true&w=majority` doesn't
  decompose into "host/port/name" nearly as cleanly).
- **Right for:** specific infrastructure contexts where the *deployment*
  tooling already deals in individual values — not a default choice for a
  learning project, but worth knowing it exists and *why* teams reach for it.

**Recommendation to give students:** Option 2 (one URI in one environment
variable) is the sweet spot for the overwhelming majority of projects —
including the natural next step for this one. Option 3 is a specialized tool
for a specific kind of deployment environment, not a "more advanced, always
better" upgrade — a good moment to reinforce that *more configuration knobs
isn't automatically more professional; matching the tool to the actual
constraint is.*

---

## 3. How does the connection actually *work*? (and how many are there at once?)

This is the part that surprises most students: **`mongoose.connect(uri)`
does not open "a connection."** It opens — and thereafter manages — a
**connection pool**: a small set of persistent TCP connections to the
MongoDB server that get reused across every query your app issues, for as
long as the process runs.

A few concrete consequences worth walking through on a whiteboard:

- **One `connect()` call ⇒ one pool, shared by the whole app.** Whether your
  Express server is handling 1 request or 100 requests *simultaneously*,
  they all draw from the *same* pool of already-open connections — opening a
  brand-new TCP connection (and renegotiating auth, TLS, etc.) for every
  single query would be far too slow to be usable. The modern MongoDB Node.js
  driver — which Mongoose wraps, and which this app pulls in via
  `mongoose: ^8.x` — defaults to a pool of **up to 100 simultaneous
  connections** per `connect()` call (tunable via the `maxPoolSize` option,
  e.g. `mongoose.connect(uri, { maxPoolSize: 20 })`).
- **Operations queue, they don't fail, when the pool is momentarily busy.**
  If every connection in the pool is mid-query and a new one comes in, the
  driver queues it briefly and reuses a connection as soon as one frees up —
  invisible to your code. This is part of *why* `async`/`await` (see
  `ANALYSIS.md` §5) matters here: each `await models.Recipe.find({})` yields
  control back to Node while it waits its turn, instead of blocking the
  entire server.
- **Mongoose buffers commands issued before the connection is ready** — by
  default (`bufferCommands: true`). This explains something that looks like
  magic the first time you see it: `models/index.js` calls
  `mongoose.connect(...)` and *immediately* exports `models.Recipe` — and
  `controller-recipes.js` can call `models.Recipe.find({})` right away,
  without ever explicitly waiting for the connection to finish establishing.
  Mongoose queues that `.find({})` internally and runs it the instant the
  connection succeeds. **This buffering has a timeout** (`bufferTimeoutMS`,
  10 seconds by default) — which is the direct explanation for one of the
  error scenarios below.
- **Multiple server instances ⇒ multiple pools.** If you ever run two copies
  of this Express app (for scaling, or just two terminal windows during
  development), *each* opens and manages its own independent pool — MongoDB
  itself is built to handle many such pools, from many applications, at once.
  This is a good moment to connect back to `ANALYSIS.md` §4's storage
  comparison: *this* is the kind of concurrent, multi-client access a real
  database is engineered for, and a flat JSON file fundamentally is not.

---

## 4. Error scenarios — what happens, and how to handle each

Walking through *specific failure scenarios* concretely (rather than just
saying "handle your errors") is what turns "remember to write `try`/`catch`"
into "I understand what I'm catching and why." Four scenarios worth running
live in class — actually stop MongoDB and watch what happens:

### Scenario A — MongoDB isn't running when the app starts

**What happens with the *current* code:** `mongoose.connect(...)` returns a
Promise immediately — the line doesn't `await` it or attach a `.catch`, so
the connection attempt happens "in the background." Express starts up and
prints `APP IS RUNNING ON PORT 3999` *regardless* of whether Mongo is
reachable — the server *looks* healthy. The first request that touches the
database (say, `GET /api/v1/recipe`) triggers
`models.Recipe.find({})`, which — per the buffering behavior above — queues
silently for up to **10 seconds**, then rejects with something like
`MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`. That
rejection is exactly what `controller-recipes.js`'s `try`/`catch` catches,
producing a `500` with `{ message: 'Failed to fetch recipe(s)', error:
'...ECONNREFUSED...' }`.

**How to actually handle it:**
- **Fail fast and loud at startup**, instead of silently limping along:
  ```js
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Could not connect to MongoDB — is it running?', err.message);
    process.exit(1);   // don't keep serving requests you can't fulfil
  }
  ```
  This turns "the server *looks* up but every request times out and 500s"
  into "the server refuses to start, with a message that names the actual
  problem" — a dramatically shorter path from symptom to fix for whoever's
  debugging it (very often, a frustrated student at 11pm).
- **Or, listen for the connection's lifecycle events** (a complementary,
  not exclusive, technique — useful for *recovering* from drops *after*
  a successful start, see Scenario C):
  ```js
  mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
  ```

### Scenario B — MongoDB is running, but the URI/credentials are wrong

E.g. a typo'd database name, wrong port, or (for a hosted database) wrong
username/password in the connection string. The *symptom* looks similar to
Scenario A from the outside (queries eventually fail with a connection-ish
error) — but the *cause* is different, which matters once you're debugging
for real: `ECONNREFUSED` means "nothing is listening there at all"; an `auth
failed` / `bad auth` error means "something answered, but rejected your
credentials." **The fix differs accordingly** — one means "start MongoDB,"
the other means "check your `.env` values" — which is exactly why *reading
the actual error message*, not just noticing "it broke," is a skill worth
deliberately modeling for students.

### Scenario C — the connection drops *after* the app has been running fine

A network blip, the database server restarting, a hosted cluster failing
over to a replica. **What happens:** Mongoose's connection enters a
`disconnected` state and *automatically* attempts to reconnect in the
background (this is built into the driver — you don't write this logic
yourself). Any operation *in flight* at the moment of the drop fails;
operations issued *while* disconnected are buffered (same `bufferCommands`
behavior as Scenario A, same ~10-second timeout) and replayed automatically
once the connection is restored.

**How to handle it:** the `disconnected`/`reconnected` event listeners shown
above are the right place to *log* this (and, in a production app, to alert
someone) — but the *user-facing* failure is still just "this one request
failed," which is precisely what the per-request `try`/`catch` in
`controller-recipes.js` already exists to translate into a clean `500`
response. **This is the key insight to land:** connection-LIFECYCLE handling
(the event listeners — "is the database there at all, broadly speaking?")
and per-OPERATION handling (`try`/`catch` around individual queries — "did
*this specific* request succeed?") are two complementary layers, not
competing choices. A robust app has both; each answers a question the other
can't.

### Scenario D — the operation reaches the database fine, but *fails for a data reason*

Not a connection problem at all — e.g. `createRecipe` receives a payload
missing the required `title` field. Mongoose's schema validation (`required:
'Name cannot be blank!'` in `model-recipe.js`) rejects the `.create(...)`
call with a `ValidationError` *before* anything is written. This is **not**
a "MongoDB is unreachable" problem — it's "the caller sent bad data" — and
deserves a completely different status code: `400 Bad Request` (the
caller's fault, fixable by the caller) rather than `500 Internal Server
Error` (the server's fault, the caller can't do anything about it).
`controller-recipes.js`'s `createRecipe` distinguishes exactly this case:

```js
} catch (err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation failed', error: err.message });
  }
  res.status(500).json({ message: 'Failed to create recipe', error: err.message });
}
```

**The throughline across all four scenarios:** "an error happened" is never
the end of the analysis — *which* error, originating *where*, meaning *what*
to *whom*, is. A `500` tells a caller "try again later, it's not you"; a
`400` tells them "fix your request, it won't work no matter how many times
you retry it"; a connection-lifecycle log tells *the team running the
server* something the caller never needs to see at all. Three audiences,
three different pieces of information, three different mechanisms — matching
them correctly is the actual skill `try`/`catch` is in service of (see
`ANALYSIS.md` §6 for the broader version of this point, applied across the
whole stack rather than just the database layer).

---

## See also

- [`ANALYSIS.md`](ANALYSIS.md) — the whole-stack analysis (REST, routing,
  storage trade-offs, async/await, try/catch, components, Tailwind,
  security, and "where to go from here").
- [`.env.example`](.env.example) — the concrete variables this document
  refers to, with inline comments explaining each one.
- [`models/index.js`](models/index.js) and
  [`controllers/controller-recipes.js`](controllers/controller-recipes.js) —
  where the connection is established and where its failures are actually
  caught and translated into HTTP responses, respectively.
