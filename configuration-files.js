// .eslintrc.js
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "arrow-spacing": "error",
      "prefer-template": "error",
      "template-curly-spacing": "error",
      "no-trailing-spaces": "error",
      "eol-last": "error",
      "comma-dangle": ["error", "never"],
      "semi": ["error", "always"],
      "quotes": ["error", "single"],
      "indent": ["error", 2],
      "no-multiple-empty-lines": ["error", { max: 1 }]
    }
  },
  {
    files: ["src/test/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly"
      }
    },
    rules: {
      "no-console": "off"
    }
  }
];

// .prettierrc
{
  "semi": true,
  "trailingComma": "none",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}

// .gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Testing
jest_coverage/

# Build outputs
dist/
build/

# Docker
.dockerignore
Dockerfile

// docker-compose.yml (for development)
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3999:3999"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/recipe_dev
    depends_on:
      - mongo
    volumes:
      - ./src:/app/src
    command: npm run dev

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=recipe_dev

  mongo-express:
    image: mongo-express
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_URL=mongodb://mongo:27017
      - ME_CONFIG_BASICAUTH_USERNAME=admin
      - ME_CONFIG_BASICAUTH_PASSWORD=admin
    depends_on:
      - mongo

volumes:
  mongo_data:

// Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Copy source code
COPY --chown=nodeuser:nodejs src/ ./src/

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3999

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["npm", "start"]

// healthcheck.js (for Docker)
import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT || 3999,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('ERROR', err);
  process.exit(1);
});

request.end();

// scripts/setup-dev.js (Development setup script)
import fs from 'fs';
import path from 'path';

const envExample = `# Environment Configuration
NODE_ENV=development
PORT=3999

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/recipe_api
MONGODB_DEV_URI=mongodb://localhost:27017/recipe_dev
MONGODB_TEST_URI=mongodb://localhost:27017/recipe_test

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
`;

const setupDevelopment = () => {
  console.log('🚀 Setting up development environment...');

  // Create .env file if it doesn't exist
  if (!fs.existsSync('.env')) {
    fs.writeFileSync('.env', envExample);
    console.log('✅ Created .env file');
  } else {
    console.log('⚠️  .env file already exists');
  }

  // Create necessary directories
  const dirs = ['src/test/coverage', 'logs'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });

  console.log('🎉 Development environment setup complete!');
  console.log('📝 Next steps:');
  console.log('   1. Start MongoDB: mongod');
  console.log('   2. Install dependencies: npm install');
  console.log('   3. Run tests: npm test');
  console.log('   4. Start development server: npm run dev');
};

setupDevelopment();

// scripts/seed-db.js (Database seeding script)
import { connectDB, disconnectDB } from '../src/config/database.js';
import Recipe from '../src/models/Recipe.model.js';

const sampleRecipes = [
  {
    title: 'Classic Pancakes',
    description: 'Fluffy and delicious pancakes perfect for breakfast',
    instructions: 'Mix dry ingredients, combine with wet ingredients, cook on griddle until golden brown.',
    ingredients: ['2 cups flour', '2 tbsp sugar', '2 tsp baking powder', '1 tsp salt', '2 eggs', '1.5 cups milk', '1/4 cup melted butter'],
    cookingTime: 20,
    servings: 4,
    difficulty: 'easy',
    category: 'breakfast',
    tags: ['pancakes', 'breakfast', 'family-friendly'],
    nutrition: {
      calories: 320,
      protein: 8,
      carbs: 42,
      fat: 12,
      fiber: 2
    },
    author: 'Chef Demo'
  },
  {
    title: 'Mediterranean Salad',
    description: 'Fresh and healthy salad with Mediterranean flavors',
    instructions: 'Chop vegetables, mix with olive oil and vinegar, add feta cheese and olives.',
    ingredients: ['Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Red onion', 'Feta cheese', 'Kalamata olives', 'Olive oil', 'Balsamic vinegar'],
    cookingTime: 15,
    servings: 2,
    difficulty: 'easy',
    category: 'lunch',
    tags: ['salad', 'healthy', 'vegetarian', 'mediterranean'],
    nutrition: {
      calories: 240,
      protein: 6,
      carbs: 12,
      fat: 18,
      fiber: 4
    },
    author: 'Chef Demo'
  },
  {
    title: 'Beef Stroganoff',
    description: 'Rich and creamy beef stroganoff with mushrooms',
    instructions: 'Brown beef strips, sauté mushrooms and onions, add cream and seasonings, serve over noodles.',
    ingredients: ['1 lb beef strips', '8 oz mushrooms', '1 onion', '2 cups beef broth', '1 cup sour cream', '2 tbsp flour', 'Egg noodles'],
    cookingTime: 45,
    servings: 6,
    difficulty: 'medium',
    category: 'dinner',
    tags: ['beef', 'comfort-food', 'creamy'],
    nutrition: {
      calories: 480,
      protein: 28,
      carbs: 32,
      fat: 24,
      fiber: 3
    },
    author: 'Chef Demo'
  },
  {
    title: 'Chocolate Chip Cookies',
    description: 'Classic homemade chocolate chip cookies',
    instructions: 'Cream butter and sugars, add eggs and vanilla, mix in flour and chocolate chips, bake until golden.',
    ingredients: ['2.25 cups flour', '1 tsp baking soda', '1 cup butter', '3/4 cup brown sugar', '1/2 cup white sugar', '2 eggs', '2 cups chocolate chips'],
    cookingTime: 25,
    servings: 24,
    difficulty: 'easy',
    category: 'dessert',
    tags: ['cookies', 'chocolate', 'baking', 'sweet'],
    nutrition: {
      calories: 180,
      protein: 2,
      carbs: 24,
      fat: 9,
      fiber: 1
    },
    author: 'Chef Demo'
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');
    
    await connectDB();
    
    // Clear existing recipes
    await Recipe.deleteMany({});
    console.log('🗑️  Cleared existing recipes');
    
    // Insert sample recipes
    const createdRecipes = await Recipe.insertMany(sampleRecipes);
    console.log(`✅ Created ${createdRecipes.length} sample recipes`);
    
    console.log('🎉 Database seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await disconnectDB();
  }
};

if (process.argv[2] === '--seed') {
  seedDatabase();
}