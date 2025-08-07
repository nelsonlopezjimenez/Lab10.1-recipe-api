// src/middleware/validation.js
import { body, param, query } from 'express-validator';

// Recipe creation validation
export const recipeValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters')
    .notEmpty()
    .withMessage('Title is required'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('instructions')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Instructions must be at least 10 characters long')
    .notEmpty()
    .withMessage('Instructions are required'),

  body('ingredients')
    .isArray({ min: 1 })
    .withMessage('At least one ingredient is required')
    .custom((ingredients) => {
      if (!ingredients.every(ingredient => typeof ingredient === 'string' && ingredient.trim().length > 0)) {
        throw new Error('All ingredients must be non-empty strings');
      }
      return true;
    }),

  body('cookingTime')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Cooking time must be between 1 and 1440 minutes'),

  body('servings')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Servings must be between 1 and 50'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),

  body('category')
    .isIn(['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'beverage', 'appetizer'])
    .withMessage('Invalid category'),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Cannot have more than 10 tags')
    .custom((tags) => {
      if (tags && !tags.every(tag => typeof tag === 'string' && tag.trim().length > 0)) {
        throw new Error('All tags must be non-empty strings');
      }
      return true;
    }),

  body('img')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('Image must be a valid image URL (jpg, jpeg, png, gif, webp)'),

  body('nutrition.calories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Calories must be a positive number'),

  body('nutrition.protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein must be a positive number'),

  body('nutrition.carbs')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbs must be a positive number'),

  body('nutrition.fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat must be a positive number'),

  body('nutrition.fiber')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fiber must be a positive number'),

  body('author')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Author name cannot exceed 50 characters'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean')
];

// Recipe update validation (all fields optional for PATCH-like behavior)
export const updateRecipeValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid recipe ID'),

  ...recipeValidation.map(validation => {
    // Make all validations optional for updates except the param validation
    if (validation.builder && validation.builder.fields && validation.builder.fields[0] !== 'id') {
      return validation.optional();
    }
    return validation;
  })
];

// Recipe ID parameter validation
export const recipeIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid recipe ID')
];

// Category parameter validation
export const categoryValidation = [
  param('category')
    .isIn(['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'beverage', 'appetizer'])
    .withMessage('Invalid category')
];

// Rating validation
export const ratingValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid recipe ID'),
    
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

// Query parameter validation for getAllRecipes
export const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'beverage', 'appetizer'])
    .withMessage('Invalid category'),

  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty'),

  query('maxCookingTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max cooking time must be a positive integer'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'cookingTime', 'ratings.average'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];