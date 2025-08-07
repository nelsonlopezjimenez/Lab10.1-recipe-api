// src/server.js
import app from './app.js';
import { connectDB } from './config/database.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3999;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n🛑 Shutting down server gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;