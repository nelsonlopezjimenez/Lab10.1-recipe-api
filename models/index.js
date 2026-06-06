import mongoose from 'mongoose';
import Recipe from './model-recipe.js';

/**
 * ============================================================================
 *  DATABASE CONNECTION
 * ============================================================================
 * `mongoose.connect(uri)` opens a connection to a MongoDB server. Every
 * query issued afterwards (.find, .create, ...) is internally queued until
 * that connection is ready — so the rest of the app doesn't need to manually
 * wait for it before starting up.
 *
 * Anatomy of the connection string:
 *
 *     mongodb://127.0.0.1:27017/test030
 *               └────┬────┘ └─┬─┘ └──┬──┘
 *                    host    port   database name
 *
 *   127.0.0.1:27017 is the default address of a LOCAL MongoDB install.
 *   'test030' is just a database name — Mongo creates it automatically
 *   the first time something is written to it.
 *
 * TEACHING NOTE — this URI is hardcoded, but `index.js` already loads
 * environment variables via `import 'dotenv/config'`. In a real project
 * you'd write:
 *
 *     mongoose.connect(process.env.MONGODB_URI);
 *
 * and put the actual value in a git-ignored `.env` file. That keeps
 * credentials out of source control AND lets the exact same code connect to
 * a local database in development and a hosted one (MongoDB Atlas, etc.) in
 * production — just by changing an environment variable, never the code.
 * ============================================================================
 */
mongoose.connect('mongodb://127.0.0.1:27017/test030');

// `mongoose.set('debug', true)` makes Mongoose print every query it runs —
// collection, operation, and filter — to the console. While you're learning,
// this is gold: you can watch `Recipe.find({})` literally become
// `recipes.find({})` in MongoDB's own query language in real time. Turn it
// off (`false`) once you don't need the play-by-play; it's noisy in
// production and adds a small overhead.
mongoose.set('debug', true);

// A tiny "service locator" object. Rather than having every controller
// `import Recipe from '../models/model-recipe.js'` directly, they import
// this `models` object and reach in via `models.Recipe`. As the app grows
// you'd register more models here —
//
//     const models = { Recipe, User, Comment };
//
// — without touching a single import statement in the controllers.
const models = { Recipe };

export default models;
