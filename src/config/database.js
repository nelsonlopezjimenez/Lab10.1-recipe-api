// src/config/database.js
import mongoose from 'mongoose';

// Database connection options with latest Mongoose 8.x compatibility
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  // Removed deprecated options: bufferMaxEntries, bufferCommands
  // These are now handled internally by Mongoose 8.x
};

export const connectDB = async () => {
  try {
    // Different database URIs for different environments
    let mongoURI;
    
    switch (process.env.NODE_ENV) {
      case 'test':
        mongoURI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/recipe_test';
        break;
      case 'production':
        mongoURI = process.env.MONGODB_PROD_URI || process.env.MONGODB_URI;
        break;
      default:
        mongoURI = process.env.MONGODB_DEV_URI || 'mongodb://localhost:27017/recipe_dev';
    }

    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗃️  Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Exit process with failure in production
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error.message);
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  console.error('🔴 Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔵 Mongoose disconnected from MongoDB');
});

// Close connection when app terminates
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed through app termination');
  process.exit(0);
});