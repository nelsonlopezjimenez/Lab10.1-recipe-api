// src/test/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

// Connect to in-memory database before tests
export const connectTestDB = async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('🧪 Test database connected');
  } catch (error) {
    console.error('❌ Test database connection error:', error);
    process.exit(1);
  }
};

// Disconnect and stop in-memory database after tests
export const disconnectTestDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
    console.log('🔌 Test database disconnected');
  } catch (error) {
    console.error('❌ Test database disconnection error:', error);
  }
};

// Clear all collections between tests
export const clearTestDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('❌ Error clearing test database:', error);
  }
};

// Setup and teardown
beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

// Increase timeout for database operations
jest.setTimeout(30000);

// src/test/helpers/testData.js
export const validRecipeData = {
  title: 'Delicious Pasta',
  description: 'A wonderful pasta dish perfect for dinner',
  instructions: 'Boil water, add pasta, cook for 10 minutes, drain, add sauce and serve hot.',
  ingredients: ['500g pasta', '300ml tomato sauce', '100g parmesan cheese', '2 cloves garlic'],
  cookingTime: 25,
  servings: 4,
  difficulty: 'easy',
  category: 'dinner',
  tags: ['italian', 'pasta', 'quick'],
  nutrition: {
    calories: 450,
    protein: 15,
    carbs: 65,
    fat: 12,
    fiber: 3
  },
  author: 'Chef Mario',
  isPublished: true
};

export const invalidRecipeData = {
  title: '', // Invalid - too short
  instructions: 'Short', // Invalid - too short
  ingredients: [], // Invalid - empty array
  category: 'invalid-category', // Invalid category
  difficulty: 'super-hard', // Invalid difficulty
  cookingTime: -5, // Invalid - negative
  servings: 0, // Invalid - zero
  img: 'not-a-url' // Invalid URL
};

export const updateRecipeData = {
  title: 'Updated Delicious Pasta',
  description: 'An even more wonderful pasta dish',
  cookingTime: 30,
  tags: ['italian', 'pasta', 'quick', 'updated']
};

export const createMultipleRecipes = () => [
  {
    ...validRecipeData,
    title: 'Breakfast Pancakes',
    category: 'breakfast',
    difficulty: 'easy',
    cookingTime: 15
  },
  {
    ...validRecipeData,
    title: 'Lunch Salad',
    category: 'lunch',
    difficulty: 'easy',
    cookingTime: 10
  },
  {
    ...validRecipeData,
    title: 'Dinner Steak',
    category: 'dinner',
    difficulty: 'hard',
    cookingTime: 45
  },
  {
    ...validRecipeData,
    title: 'Chocolate Cake',
    category: 'dessert',
    difficulty: 'medium',
    cookingTime: 60
  }
];