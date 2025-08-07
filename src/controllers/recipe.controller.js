// src/controllers/recipe.controller.js
import Recipe from '../models/Recipe.model.js';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// @desc    Get all recipes with pagination and filtering
// @route   GET /api/v1/recipes
// @access  Public
export const getAllRecipes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    difficulty,
    maxCookingTime,
    tags,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Convert string parameters to appropriate types
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  // Validate pagination parameters
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new AppError('Invalid pagination parameters', 400);
  }

  const options = {
    category,
    difficulty,
    maxCookingTime: maxCookingTime ? parseInt(maxCookingTime) : undefined,
    tags: tags ? tags.split(',') : undefined,
    page: pageNum,
    limit: limitNum,
    sortBy,
    sortOrder
  };

  // Get recipes and total count
  const [recipes, totalRecipes] = await Promise.all([
    Recipe.searchRecipes(search, options),
    Recipe.countDocuments({ isPublished: true })
  ]);

  const totalPages = Math.ceil(totalRecipes / limitNum);

  res.status(200).json({
    success: true,
    count: recipes.length,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalRecipes,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    data: recipes
  });
});

// @desc    Get single recipe
// @route   GET /api/v1/recipes/:id
// @access  Public
export const getRecipeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const recipe = await Recipe.findOne({ _id: id, isPublished: true });

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  res.status(200).json({
    success: true,
    data: recipe
  });
});

// @desc    Create new recipe
// @route   POST /api/v1/recipes
// @access  Public
export const createRecipe = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const recipe = await Recipe.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Recipe created successfully',
    data: recipe
  });
});

// @desc    Update recipe
// @route   PUT /api/v1/recipes/:id
// @access  Public
export const updateRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const recipe = await Recipe.findByIdAndUpdate(
    id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Recipe updated successfully',
    data: recipe
  });
});

// @desc    Delete recipe
// @route   DELETE /api/v1/recipes/:id
// @access  Public
export const deleteRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const recipe = await Recipe.findByIdAndDelete(id);

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Recipe deleted successfully',
    data: { id: recipe._id }
  });
});

// @desc    Get recipes by category
// @route   GET /api/v1/recipes/category/:category
// @access  Public
export const getRecipesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const recipes = await Recipe.findByCategory(category)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalRecipes = await Recipe.countDocuments({ 
    category: category.toLowerCase(), 
    isPublished: true 
  });

  res.status(200).json({
    success: true,
    count: recipes.length,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(totalRecipes / limitNum),
      totalRecipes
    },
    data: recipes
  });
});

// @desc    Rate a recipe
// @route   POST /api/v1/recipes/:id/rate
// @access  Public
export const rateRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  const recipe = await Recipe.findById(id);

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  await recipe.addRating(rating);

  res.status(200).json({
    success: true,
    message: 'Rating added successfully',
    data: {
      averageRating: recipe.ratings.average,
      totalRatings: recipe.ratings.count
    }
  });
});

// @desc    Get recipe statistics
// @route   GET /api/v1/recipes/stats
// @access  Public
export const getRecipeStats = asyncHandler(async (req, res) => {
  const stats = await Recipe.aggregate([
    {
      $match: { isPublished: true }
    },
    {
      $group: {
        _id: null,
        totalRecipes: { $sum: 1 },
        averageCookingTime: { $avg: '$cookingTime' },
        averageRating: { $avg: '$ratings.average' },
        categories: { $addToSet: '$category' },
        difficulties: { $addToSet: '$difficulty' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRecipes: 1,
        averageCookingTime: { $round: ['$averageCookingTime', 2] },
        averageRating: { $round: ['$averageRating', 2] },
        categoriesCount: { $size: '$categories' },
        difficultiesCount: { $size: '$difficulties' }
      }
    }
  ]);

  const categoryStats = await Recipe.aggregate([
    {
      $match: { isPublished: true }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averageRating: { $avg: '$ratings.average' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      general: stats[0] || {},
      byCategory: categoryStats
    }
  });
});