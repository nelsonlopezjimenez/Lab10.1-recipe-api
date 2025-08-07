// src/test/model.test.js - Recipe Model Unit Tests
import Recipe from '../models/Recipe.model.js';
import { validRecipeData } from './helpers/testData.js';

describe('Recipe Model', () => {
  describe('Validation', () => {
    it('should create a recipe with valid data', async () => {
      const recipe = new Recipe(validRecipeData);
      const savedRecipe = await recipe.save();

      expect(savedRecipe._id).toBeDefined();
      expect(savedRecipe.title).toBe(validRecipeData.title);
      expect(savedRecipe.createdAt).toBeDefined();
      expect(savedRecipe.updatedAt).toBeDefined();
    });

    it('should require title', async () => {
      const recipe = new Recipe({ ...validRecipeData, title: undefined });
      
      await expect(recipe.save()).rejects.toThrow(/title is required/i);
    });

    it('should require instructions', async () => {
      const recipe = new Recipe({ ...validRecipeData, instructions: undefined });
      
      await expect(recipe.save()).rejects.toThrow(/instructions are required/i);
    });

    it('should require at least one ingredient', async () => {
      const recipe = new Recipe({ ...validRecipeData, ingredients: [] });
      
      await expect(recipe.save()).rejects.toThrow(/at least one ingredient/i);
    });

    it('should validate title length', async () => {
      const shortTitle = new Recipe({ ...validRecipeData, title: 'a' });
      await expect(shortTitle.save()).rejects.toThrow(/at least 2 characters/i);

      const longTitle = new Recipe({ 
        ...validRecipeData, 
        title: 'a'.repeat(101) 
      });
      await expect(longTitle.save()).rejects.toThrow(/cannot exceed 100 characters/i);
    });

    it('should validate instructions length', async () => {
      const recipe = new Recipe({ 
        ...validRecipeData, 
        instructions: 'short' 
      });
      
      await expect(recipe.save()).rejects.toThrow(/at least 10 characters/i);
    });

    it('should validate category enum', async () => {
      const recipe = new Recipe({ 
        ...validRecipeData, 
        category: 'invalid-category' 
      });
      
      await expect(recipe.save()).rejects.toThrow(/invalid category/i);
    });

    it('should validate difficulty enum', async () => {
      const recipe = new Recipe({ 
        ...validRecipeData, 
        difficulty: 'super-hard' 
      });
      
      await expect(recipe.save()).rejects.toThrow(/difficulty must be either/i);
    });

    it('should validate cooking time range', async () => {
      const negativeTime = new Recipe({ 
        ...validRecipeData, 
        cookingTime: -5 
      });
      await expect(negativeTime.save()).rejects.toThrow(/at least 1 minute/i);

      const excessiveTime = new Recipe({ 
        ...validRecipeData, 
        cookingTime: 1500 
      });
      await expect(excessiveTime.save()).rejects.toThrow(/cannot exceed 24 hours/i);
    });

    it('should validate servings range', async () => {
      const zeroServings = new Recipe({ 
        ...validRecipeData, 
        servings: 0 
      });
      await expect(zeroServings.save()).rejects.toThrow(/at least 1/i);

      const tooManyServings = new Recipe({ 
        ...validRecipeData, 
        servings: 100 
      });
      await expect(tooManyServings.save()).rejects.toThrow(/cannot exceed 50/i);
    });

    it('should validate image URL format', async () => {
      const recipe = new Recipe({ 
        ...validRecipeData, 
        img: 'not-a-valid-url' 
      });
      
      await expect(recipe.save()).rejects.toThrow(/valid URL/i);
    });

    it('should validate nutrition values', async () => {
      const recipe = new Recipe({ 
        ...validRecipeData, 
        nutrition: { calories: -100 }
      });
      
      await expect(recipe.save()).rejects.toThrow();
    });

    it('should validate tags limit', async () => {
      const recipe = new Recipe({ 
        ...validRecipeData, 
        tags: new Array(11).fill('tag')
      });
      
      await expect(recipe.save()).rejects.toThrow(/more than 10 tags/i);
    });
  });

  describe('Pre-save Middleware', () => {
    it('should trim and filter ingredients', async () => {
      const recipe = new Recipe({
        ...validRecipeData,
        ingredients: ['  ingredient 1  ', '', '  ingredient 2  ', '   ']
      });
      
      const savedRecipe = await recipe.save();
      expect(savedRecipe.ingredients).toEqual(['ingredient 1', 'ingredient 2']);
    });

    it('should process tags correctly', async () => {
      const recipe = new Recipe({
        ...validRecipeData,
        tags: ['  TAG1  ', 'tag2', 'TAG1', '', '  tag3  ']
      });
      
      const savedRecipe = await recipe.save();
      expect(savedRecipe.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('Virtual Properties', () => {
    let recipe;

    beforeEach(async () => {
      recipe = await Recipe.create(validRecipeData);
    });

    it('should calculate formattedCookingTime correctly', async () => {
      // Test minutes only
      recipe.cookingTime = 45;
      expect(recipe.formattedCookingTime).toBe('45m');

      // Test hours only
      recipe.cookingTime = 120;
      expect(recipe.formattedCookingTime).toBe('2h');

      // Test hours and minutes
      recipe.cookingTime = 135;
      expect(recipe.formattedCookingTime).toBe('2h 15m');

      // Test null
      recipe.cookingTime = null;
      expect(recipe.formattedCookingTime).toBeNull();
    });

    it('should generate slug correctly', async () => {
      recipe.title = 'Amazing Chocolate Cake Recipe!';
      expect(recipe.slug).toBe('amazing-chocolate-cake-recipe');

      recipe.title = 'Recipe with Special Characters @#$%';
      expect(recipe.slug).toBe('recipe-with-special-characters');
    });
  });

  describe('Instance Methods', () => {
    let recipe;

    beforeEach(async () => {
      recipe = await Recipe.create(validRecipeData);
    });

    describe('addRating', () => {
      it('should add first rating correctly', async () => {
        await recipe.addRating(4.5);
        expect(recipe.ratings.average).toBe(4.5);
        expect(recipe.ratings.count).toBe(1);
      });

      it('should calculate average rating correctly', async () => {
        await recipe.addRating(5);
        await recipe.addRating(3);
        await recipe.addRating(4);
        
        expect(recipe.ratings.average).toBe(4);
        expect(recipe.ratings.count).toBe(3);
      });

      it('should throw error for invalid ratings', async () => {
        await expect(recipe.addRating(0)).rejects.toThrow('Rating must be between 1 and 5');
        await expect(recipe.addRating(6)).rejects.toThrow('Rating must be between 1 and 5');
        await expect(recipe.addRating('not-a-number')).rejects.toThrow();
      });
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Recipe.create([
        { ...validRecipeData, title: 'Breakfast Recipe', category: 'breakfast', difficulty: 'easy' },
        { ...validRecipeData, title: 'Lunch Recipe', category: 'lunch', difficulty: 'medium' },
        { ...validRecipeData, title: 'Dinner Recipe', category: 'dinner', difficulty: 'hard' },
        { ...validRecipeData, title: 'Unpublished Recipe', category: 'dinner', isPublished: false }
      ]);
    });

    describe('findByCategory', () => {
      it('should find recipes by category', async () => {
        const breakfastRecipes = await Recipe.findByCategory('breakfast');
        expect(breakfastRecipes).toHaveLength(1);
        expect(breakfastRecipes[0].category).toBe('breakfast');
      });

      it('should only return published recipes', async () => {
        const dinnerRecipes = await Recipe.findByCategory('dinner');
        expect(dinnerRecipes).toHaveLength(1); // Only published dinner recipe
        expect(dinnerRecipes.every(recipe => recipe.isPublished)).toBe(true);
      });

      it('should handle case insensitive search', async () => {
        const recipes = await Recipe.findByCategory('BREAKFAST');
        expect(recipes).toHaveLength(1);
      });
    });

    describe('findByDifficulty', () => {
      it('should find recipes by difficulty', async () => {
        const easyRecipes = await Recipe.findByDifficulty('easy');
        expect(easyRecipes).toHaveLength(1);
        expect(easyRecipes[0].difficulty).toBe('easy');
      });

      it('should only return published recipes', async () => {
        const allRecipes = await Recipe.findByDifficulty('medium');
        expect(allRecipes.every(recipe => recipe.isPublished)).toBe(true);
      });
    });

    describe('searchRecipes', () => {
      it('should search recipes by text', async () => {
        const results = await Recipe.searchRecipes('breakfast');
        expect(results).toHaveLength(1);
        expect(results[0].title).toContain('Breakfast');
      });

      it('should filter by category', async () => {
        const results = await Recipe.searchRecipes(null, { category: 'lunch' });
        expect(results).toHaveLength(1);
        expect(results[0].category).toBe('lunch');
      });

      it('should filter by difficulty', async () => {
        const results = await Recipe.searchRecipes(null, { difficulty: 'hard' });
        expect(results).toHaveLength(1);
        expect(results[0].difficulty).toBe('hard');
      });

      it('should paginate results', async () => {
        const page1 = await Recipe.searchRecipes(null, { page: 1, limit: 2 });
        expect(page1).toHaveLength(2);

        const page2 = await Recipe.searchRecipes(null, { page: 2, limit: 2 });
        expect(page2).toHaveLength(1);
      });

      it('should sort results', async () => {
        const ascending = await Recipe.searchRecipes(null, { 
          sortBy: 'title', 
          sortOrder: 'asc' 
        });
        const titles = ascending.map(recipe => recipe.title);
        expect(titles).toEqual([...titles].sort());
      });
    });
  });

  describe('Indexes', () => {
    it('should have text index for search', async () => {
      const indexes = await Recipe.collection.getIndexes();
      const textIndex = Object.values(indexes).find(index => 
        index.some && index.some(field => field[1] === 'text')
      );
      expect(textIndex).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should set default values correctly', async () => {
      const minimalRecipe = await Recipe.create({
        title: 'Test Recipe',
        instructions: 'Cook it well',
        ingredients: ['ingredient'],
        category: 'dinner'
      });

      expect(minimalRecipe.difficulty).toBe('medium');
      expect(minimalRecipe.servings).toBe(1);
      expect(minimalRecipe.isPublished).toBe(true);
      expect(minimalRecipe.tags).toEqual([]);
      expect(minimalRecipe.ratings.average).toBe(0);
      expect(minimalRecipe.ratings.count).toBe(0);
    });
  });
});

// src/test/middleware.test.js - Middleware Unit Tests
import { errorHandler, notFound } from '../middleware/errorHandler.js';
import { AppError } from '../utils/AppError.js';

describe('Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { originalUrl: '/test-url' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('notFound middleware', () => {
    it('should create 404 error for non-existent routes', () => {
      notFound(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not found - /test-url',
          statusCode: 404
        })
      );
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error'
        }
      });
    });

    it('should handle validation errors', () => {
      const error = new AppError('Validation failed', 400, [
        { msg: 'Title is required' },
        { msg: 'Instructions are required' }
      ]);
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          details: [
            { msg: 'Title is required' },
            { msg: 'Instructions are required' }
          ]
        }
      });
    });

    it('should handle Mongoose CastError', () => {
      const error = { name: 'CastError', message: 'Cast to ObjectId failed' };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Resource not found'
        }
      });
    });

    it('should handle Mongoose duplicate key error', () => {
      const error = { code: 11000, message: 'Duplicate key error' };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Duplicate field value entered'
        }
      });
    });

    it('should handle Mongoose validation error', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          title: { message: 'Title is required' },
          instructions: { message: 'Instructions are required' }
        }
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Title is required, Instructions are required'
        }
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Server Error'
        }
      });
    });
  });
});