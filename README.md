# lab10.1-restful-express-mongo-api

## last edited: 8.18.2024 m.d.y

### Log

1. Old version using require and module.exports syntax
1. Refactored into ES6 imports: using default as well as named imports
1. Folder structure using MVC

### Code

    index.js

```js
import express from 'express';
import router from './routes/routes-recipe.js';
import 'dotenv/config';

const app = express();

const port = process.env.PORT || 3999;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.send('this is root route');
});

app.use('/api/v1/recipe', router);

app.listen(port, function () {
  //console.log("APP IS RUNNING ON PORT " + process.env.PORT);
  console.log('APP IS RUNNING ON PORT ' + port);
});
```

    routes.recipe.js

```js
import express from 'express';
import * as controllers from '../controllers/controller-recipes.js';
// import {
//   getRecipeAll,
//   getRecipeOne,
//   deleteRecipe,
//   updateRecipe,
// } from '../controllers/controller-recipes.js';

const router = express.Router();

router.route('/').get(controllers.getRecipeAll).post(controllers.createRecipe);

router
  .route('/:recipeId')
  .get(controllers.getRecipeOne)
  .put(controllers.updateRecipe)
  .delete(controllers.deleteRecipe);

export default router;
```

    model/index.js

```js
import mongoose from 'mongoose';
import Recipe from './model-recipe.js';

mongoose.set('debug', true);

mongoose.connect('mongodb://localhost/test030');

// mongoose.Promise = Promise;
const models = { Recipe };

export default models;
```

    model-recipe.js

```js
import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: 'Name cannot be blank!',
    },
    instructions: {
      type: String,
      required: 'Instructions cannot be blank!',
    },
    ingredients: {
      type: [String],
      default: [],
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
  { toObject: { virtuals: true } }
);

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;
```

    controller-recipes.js

```js
import models from '../models/index.js';

const getRecipeAll = async (req, res) => {
  const data = await models.Recipe.find({});
  res.json(data);
};
const createRecipe = async (req, res) => {
  const data = await models.Recipe.create(req.body);
  res.status(201).json(data);
};

const getRecipeOne = async (req, res) => {
  console.log(req.params);
  const data = await models.Recipe.findById(req.params.recipeId);
  res.status(201).json(data);
};

const updateRecipe = async (req, res) => {
  const data = await models.Recipe.findByIdAndUpdate(
    req.params.recipeId,
    req.body,
    {
      new: true,
    }
  );
  res.status(201).json(data);
};
const deleteRecipe = async (req, res) => {
  const data = await models.Recipe.findByIdAndDelete(req.params.recipeId);
  res.status(201).json(`${data} was deleted from the database`);
};

export { getRecipeAll, getRecipeOne, createRecipe, deleteRecipe, updateRecipe };
```
