import models from '../models/index.js';

const getRecipeAll = async (req, res) => {
  const data = await models.Recipe.find({});
  res.json(data);
};
const createRecipe = async (req, res) => {
  try {
    const data = await models.Recipe.create(req.body);
    res.status(201).json(data);
  }catch(error){
    console.log(error);
  }
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
