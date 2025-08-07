// src/models/Recipe.model.js
import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Recipe title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      index: true, // Add index for faster searching
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    instructions: {
      type: String,
      required: [true, 'Instructions are required'],
      trim: true,
      minlength: [10, 'Instructions must be at least 10 characters long'],
    },
    ingredients: {
      type: [String],
      required: [true, 'At least one ingredient is required'],
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'Recipe must have at least one ingredient'
      }
    },
    cookingTime: {
      type: Number,
      min: [1, 'Cooking time must be at least 1 minute'],
      max: [1440, 'Cooking time cannot exceed 24 hours (1440 minutes)'],
    },
    servings: {
      type: Number,
      min: [1, 'Servings must be at least 1'],
      max: [50, 'Servings cannot exceed 50'],
      default: 1,
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: 'Difficulty must be either easy, medium, or hard'
      },
      default: 'medium',
      lowercase: true,
    },
    category: {
      type: String,
      enum: {
        values: ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'beverage', 'appetizer'],
        message: 'Invalid category'
      },
      required: [true, 'Category is required'],
      lowercase: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 tags'
      }
    },
    img: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Image must be a valid URL ending with jpg, jpeg, png, gif, or webp'
      }
    },
    nutrition: {
      calories: { type: Number, min: 0 },
      protein: { type: Number, min: 0 },
      carbs: { type: Number, min: 0 },
      fat: { type: Number, min: 0 },
      fiber: { type: Number, min: 0 },
    },
    author: {
      type: String,
      trim: true,
      maxlength: [50, 'Author name cannot exceed 50 characters'],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    ratings: {
      average: { type: Number, min: 0, max: 5, default: 0 },
      count: { type: Number, min: 0, default: 0 }
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toObject: { virtuals: true },
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual for formatted cooking time
recipeSchema.virtual('formattedCookingTime').get(function() {
  if (!this.cookingTime) return null;
  
  const hours = Math.floor(this.cookingTime / 60);
  const minutes = this.cookingTime % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
});

// Virtual for recipe URL slug
recipeSchema.virtual('slug').get(function() {
  return this.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
});

// Indexes for better query performance
recipeSchema.index({ title: 'text', description: 'text', ingredients: 'text' });
recipeSchema.index({ category: 1, difficulty: 1 });
recipeSchema.index({ createdAt: -1 });
recipeSchema.index({ 'ratings.average': -1 });

// Pre-save middleware
recipeSchema.pre('save', function(next) {
  // Ensure ingredients are trimmed and not empty
  if (this.ingredients) {
    this.ingredients = this.ingredients
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0);
  }
  
  // Ensure tags are trimmed, lowercase, and unique
  if (this.tags) {
    this.tags = [...new Set(this.tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0))];
  }
  
  next();
});

// Instance methods
recipeSchema.methods.addRating = function(rating) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  
  const totalRating = (this.ratings.average * this.ratings.count) + rating;
  this.ratings.count += 1;
  this.ratings.average = totalRating / this.ratings.count;
  
  return this.save();
};

// Static methods
recipeSchema.statics.findByCategory = function(category) {
  return this.find({ category: category.toLowerCase(), isPublished: true });
};

recipeSchema.statics.findByDifficulty = function(difficulty) {
  return this.find({ difficulty: difficulty.toLowerCase(), isPublished: true });
};

recipeSchema.statics.searchRecipes = function(query, options = {}) {
  const {
    category,
    difficulty,
    maxCookingTime,
    tags,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  let searchQuery = { isPublished: true };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  if (category) {
    searchQuery.category = category.toLowerCase();
  }

  if (difficulty) {
    searchQuery.difficulty = difficulty.toLowerCase();
  }

  if (maxCookingTime) {
    searchQuery.cookingTime = { $lte: maxCookingTime };
  }

  if (tags && tags.length > 0) {
    searchQuery.tags = { $in: tags.map(tag => tag.toLowerCase()) };
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return this.find(searchQuery)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;