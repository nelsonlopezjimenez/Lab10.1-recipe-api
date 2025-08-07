// src/test/recipe.test.js
import request from 'supertest';
import app from '../app.js';
import Recipe from '../models/Recipe.model.js';
import {
  validRecipeData,
  invalidRecipeData,
  updateRecipeData,
  createMultipleRecipes
} from './helpers/testData.js';

describe('Recipe API Endpoints', () => {
  
  describe('GET /api/v1/recipes', () => {
    beforeEach(async () => {
      // Create test recipes
      const recipes = createMultipleRecipes();
      await Recipe.insertMany(recipes);
    });

    it('should return 400 for invalid category', async () => {
      const response = await request(app)
        .get('/api/v1/recipes/category/invalid-category')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should paginate category results', async () => {
      // Add more breakfast recipes
      await Recipe.create({
        ...validRecipeData,
        title: 'Another Breakfast',
        category: 'breakfast'
      });

      const response = await request(app)
        .get('/api/v1/recipes/category/breakfast?page=1&limit=1')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.pagination.totalRecipes).toBe(2);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('POST /api/v1/recipes/:id/rate', () => {
    let recipeId;

    beforeEach(async () => {
      const recipe = await Recipe.create(validRecipeData);
      recipeId = recipe._id.toString();
    });

    it('should add a rating to a recipe', async () => {
      const rating = 4.5;
      const response = await request(app)
        .post(`/api/v1/recipes/${recipeId}/rate`)
        .send({ rating })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rating added successfully');
      expect(response.body.data.averageRating).toBe(rating);
      expect(response.body.data.totalRatings).toBe(1);

      // Verify in database
      const ratedRecipe = await Recipe.findById(recipeId);
      expect(ratedRecipe.ratings.average).toBe(rating);
      expect(ratedRecipe.ratings.count).toBe(1);
    });

    it('should calculate average rating correctly', async () => {
      // Add first rating
      await request(app)
        .post(`/api/v1/recipes/${recipeId}/rate`)
        .send({ rating: 5 })
        .expect(200);

      // Add second rating
      const response = await request(app)
        .post(`/api/v1/recipes/${recipeId}/rate`)
        .send({ rating: 3 })
        .expect(200);

      expect(response.body.data.averageRating).toBe(4); // (5 + 3) / 2
      expect(response.body.data.totalRatings).toBe(2);
    });

    it('should return 400 for invalid rating', async () => {
      const response = await request(app)
        .post(`/api/v1/recipes/${recipeId}/rate`)
        .send({ rating: 6 }) // Invalid - over 5
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Rating must be between 1 and 5');
    });

    it('should return 400 for missing rating', async () => {
      const response = await request(app)
        .post(`/api/v1/recipes/${recipeId}/rate`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent recipe', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/v1/recipes/${fakeId}/rate`)
        .send({ rating: 4 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/recipes/stats', () => {
    beforeEach(async () => {
      const recipes = createMultipleRecipes();
      // Add ratings to some recipes
      recipes[0].ratings = { average: 4.5, count: 10 };
      recipes[1].ratings = { average: 3.5, count: 5 };
      await Recipe.insertMany(recipes);
    });

    it('should return recipe statistics', async () => {
      const response = await request(app)
        .get('/api/v1/recipes/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.general).toMatchObject({
        totalRecipes: 4,
        averageCookingTime: expect.any(Number),
        averageRating: expect.any(Number),
        categoriesCount: 4,
        difficultiesCount: 3
      });

      expect(response.body.data.byCategory).toHaveLength(4);
      expect(response.body.data.byCategory[0]).toMatchObject({
        _id: expect.any(String),
        count: expect.any(Number),
        averageRating: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock a database error by closing connection temporarily
      jest.spyOn(Recipe, 'find').mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/recipes')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Database connection failed');

      // Restore mock
      Recipe.find.mockRestore();
    });

    it('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/api/v1/recipes')
        .send({
          title: 'Test',
          instructions: 'Short', // Too short
          ingredients: ['ingredient'],
          category: 'invalid' // Invalid category
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('Model Methods', () => {
    let recipe;

    beforeEach(async () => {
      recipe = await Recipe.create(validRecipeData);
    });

    it('should use findByCategory static method', async () => {
      const recipes = await Recipe.findByCategory('dinner');
      expect(recipes).toHaveLength(1);
      expect(recipes[0].category).toBe('dinner');
    });

    it('should use findByDifficulty static method', async () => {
      const recipes = await Recipe.findByDifficulty('easy');
      expect(recipes).toHaveLength(1);
      expect(recipes[0].difficulty).toBe('easy');
    });

    it('should use searchRecipes static method', async () => {
      const recipes = await Recipe.searchRecipes('pasta', {
        category: 'dinner',
        limit: 5
      });
      expect(recipes).toHaveLength(1);
      expect(recipes[0].title).toContain('Pasta');
    });

    it('should calculate virtual properties correctly', async () => {
      const recipeWithVirtuals = recipe.toJSON();
      expect(recipeWithVirtuals.formattedCookingTime).toBe('25m');
      expect(recipeWithVirtuals.slug).toBe('delicious-pasta');
    });

    it('should use addRating instance method', async () => {
      await recipe.addRating(4);
      expect(recipe.ratings.average).toBe(4);
      expect(recipe.ratings.count).toBe(1);

      await recipe.addRating(5);
      expect(recipe.ratings.average).toBe(4.5);
      expect(recipe.ratings.count).toBe(2);
    });

    it('should validate rating range in addRating method', async () => {
      await expect(recipe.addRating(6)).rejects.toThrow('Rating must be between 1 and 5');
      await expect(recipe.addRating(0)).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('Middleware Integration', () => {
    it('should apply rate limiting', async () => {
      // This test would need to be adapted based on your rate limiting configuration
      // For demonstration, we'll test that the endpoint exists and works
      const response = await request(app)
        .get('/api/v1/recipes')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('should handle CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1/recipes')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should compress responses', async () => {
      const response = await request(app)
        .get('/api/v1/recipes')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Response should be compressed (this depends on the size threshold)
      expect(response.headers['content-encoding']).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String)
      });
    });
  });

  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        message: '🍳 Welcome to Recipe API',
        version: '2.0.0',
        endpoints: {
          recipes: '/api/v1/recipes',
          health: '/health'
        },
        documentation: expect.any(String)
      });
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Not found');
    });
  });
});d get all recipes with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/recipes')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(4);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalRecipes: 4,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should get recipes with custom pagination', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?page=1&limit=2')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalPages).toBe(2);
      expect(response.body.pagination.hasNext).toBe(true);
    });

    it('should filter recipes by category', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?category=breakfast')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.data[0].category).toBe('breakfast');
    });

    it('should filter recipes by difficulty', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?difficulty=hard')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.data[0].difficulty).toBe('hard');
    });

    it('should filter recipes by max cooking time', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?maxCookingTime=20')
        .expect(200);

      expect(response.body.count).toBe(2); // Breakfast (15min) and Lunch (10min)
      response.body.data.forEach(recipe => {
        expect(recipe.cookingTime).toBeLessThanOrEqual(20);
      });
    });

    it('should sort recipes by cooking time ascending', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?sortBy=cookingTime&sortOrder=asc')
        .expect(200);

      const cookingTimes = response.body.data.map(recipe => recipe.cookingTime);
      expect(cookingTimes).toEqual([10, 15, 45, 60]);
    });

    it('should search recipes by text', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?search=pancakes')
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0].title.toLowerCase()).toContain('pancakes');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/recipes?page=0&limit=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid pagination parameters');
    });
  });

  describe('GET /api/v1/recipes/:id', () => {
    let recipeId;

    beforeEach(async () => {
      const recipe = await Recipe.create(validRecipeData);
      recipeId = recipe._id.toString();
    });

    it('should get a recipe by valid ID', async () => {
      const response = await request(app)
        .get(`/api/v1/recipes/${recipeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(recipeId);
      expect(response.body.data.title).toBe(validRecipeData.title);
      expect(response.body.data.instructions).toBe(validRecipeData.instructions);
    });

    it('should return 404 for non-existent recipe ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/recipes/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Recipe not found');
    });

    it('should return 400 for invalid recipe ID format', async () => {
      const response = await request(app)
        .get('/api/v1/recipes/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not return unpublished recipes', async () => {
      // Create unpublished recipe
      const unpublishedRecipe = await Recipe.create({
        ...validRecipeData,
        title: 'Unpublished Recipe',
        isPublished: false
      });

      const response = await request(app)
        .get(`/api/v1/recipes/${unpublishedRecipe._id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/recipes', () => {
    it('should create a new recipe with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/recipes')
        .send(validRecipeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recipe created successfully');
      expect(response.body.data.title).toBe(validRecipeData.title);
      expect(response.body.data.ingredients).toEqual(validRecipeData.ingredients);
      expect(response.body.data._id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();

      // Verify recipe was saved to database
      const savedRecipe = await Recipe.findById(response.body.data._id);
      expect(savedRecipe).toBeTruthy();
      expect(savedRecipe.title).toBe(validRecipeData.title);
    });

    it('should create recipe with minimal required fields', async () => {
      const minimalData = {
        title: 'Simple Recipe',
        instructions: 'Cook it well and serve hot with love',
        ingredients: ['ingredient 1', 'ingredient 2'],
        category: 'dinner'
      };

      const response = await request(app)
        .post('/api/v1/recipes')
        .send(minimalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(minimalData.title);
      expect(response.body.data.difficulty).toBe('medium'); // default value
      expect(response.body.data.servings).toBe(1); // default value
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        title: 'Test Recipe'
        // Missing instructions, ingredients, category
      };

      const response = await request(app)
        .post('/api/v1/recipes')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for invalid field values', async () => {
      const response = await request(app)
        .post('/api/v1/recipes')
        .send(invalidRecipeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should validate ingredients array', async () => {
      const dataWithInvalidIngredients = {
        ...validRecipeData,
        ingredients: ['', '   ', 'valid ingredient'] // Empty and whitespace ingredients
      };

      const response = await request(app)
        .post('/api/v1/recipes')
        .send(dataWithInvalidIngredients)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate nutrition values', async () => {
      const dataWithInvalidNutrition = {
        ...validRecipeData,
        nutrition: {
          calories: -100, // Invalid negative value
          protein: 'not-a-number'
        }
      };

      const response = await request(app)
        .post('/api/v1/recipes')
        .send(dataWithInvalidNutrition)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should trim and clean input data', async () => {
      const dataWithWhitespace = {
        ...validRecipeData,
        title: '  Trimmed Recipe  ',
        tags: ['  tag1  ', '', '  tag2  ', 'tag1'], // Duplicates and whitespace
        ingredients: ['  ingredient 1  ', '', '  ingredient 2  ']
      };

      const response = await request(app)
        .post('/api/v1/recipes')
        .send(dataWithWhitespace)
        .expect(201);

      expect(response.body.data.title).toBe('Trimmed Recipe');
      expect(response.body.data.tags).toEqual(['tag1', 'tag2']); // Cleaned and deduplicated
      expect(response.body.data.ingredients).toEqual(['ingredient 1', 'ingredient 2']); // Cleaned
    });
  });

  describe('PUT /api/v1/recipes/:id', () => {
    let recipeId;

    beforeEach(async () => {
      const recipe = await Recipe.create(validRecipeData);
      recipeId = recipe._id.toString();
    });

    it('should update a recipe with valid data', async () => {
      const response = await request(app)
        .put(`/api/v1/recipes/${recipeId}`)
        .send(updateRecipeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recipe updated successfully');
      expect(response.body.data.title).toBe(updateRecipeData.title);
      expect(response.body.data.description).toBe(updateRecipeData.description);
      expect(response.body.data.cookingTime).toBe(updateRecipeData.cookingTime);

      // Verify in database
      const updatedRecipe = await Recipe.findById(recipeId);
      expect(updatedRecipe.title).toBe(updateRecipeData.title);
      expect(updatedRecipe.updatedAt).not.toEqual(updatedRecipe.createdAt);
    });

    it('should partially update a recipe', async () => {
      const partialUpdate = {
        cookingTime: 35,
        difficulty: 'hard'
      };

      const response = await request(app)
        .put(`/api/v1/recipes/${recipeId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.data.cookingTime).toBe(35);
      expect(response.body.data.difficulty).toBe('hard');
      expect(response.body.data.title).toBe(validRecipeData.title); // Unchanged
    });

    it('should return 404 for non-existent recipe', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/v1/recipes/${fakeId}`)
        .send(updateRecipeData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Recipe not found');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdate = {
        title: '', // Too short
        cookingTime: -10, // Invalid
        category: 'invalid-category'
      };

      const response = await request(app)
        .put(`/api/v1/recipes/${recipeId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should run model validators on update', async () => {
      const invalidUpdate = {
        ingredients: [] // Empty array should fail validation
      };

      const response = await request(app)
        .put(`/api/v1/recipes/${recipeId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/recipes/:id', () => {
    let recipeId;

    beforeEach(async () => {
      const recipe = await Recipe.create(validRecipeData);
      recipeId = recipe._id.toString();
    });

    it('should delete a recipe by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/recipes/${recipeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recipe deleted successfully');
      expect(response.body.data.id).toBe(recipeId);

      // Verify recipe was deleted from database
      const deletedRecipe = await Recipe.findById(recipeId);
      expect(deletedRecipe).toBeNull();
    });

    it('should return 404 for non-existent recipe', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/v1/recipes/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Recipe not found');
    });

    it('should return 400 for invalid recipe ID', async () => {
      const response = await request(app)
        .delete('/api/v1/recipes/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/recipes/category/:category', () => {
    beforeEach(async () => {
      const recipes = createMultipleRecipes();
      await Recipe.insertMany(recipes);
    });

    it('should get recipes by category', async () => {
      const response = await request(app)
        .get('/api/v1/recipes/category/breakfast')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].category).toBe('breakfast');
    });

    it('should return empty array for category with no recipes', async () => {
      const response = await request(app)
        .get('/api/v1/recipes/category/appetizer')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it('shoul