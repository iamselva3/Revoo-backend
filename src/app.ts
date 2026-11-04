import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/index.js';
import routes from './presentation/routes/index.js';
import { errorHandler } from './presentation/middlewares/errorHandler.middleware.js';
import { globalLimiter } from './presentation/middlewares/rateLimiter.middleware.js';
import { AppError } from './shared/types.js';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS policy
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like native mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (
      config.cors.origin.includes('*') ||
      config.cors.origin.includes(origin) ||
      !config.isProduction
    ) {
      return callback(null, true);
    }
    return callback(new AppError('Blocked by CORS policy', 403));
  },
  credentials: true,
}));

// Rate limiting
app.use(globalLimiter);

// Request body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Serve uploaded static files
const uploadBasePath = path.resolve(process.cwd(), config.storage.uploadDir);
app.use('/uploads', express.static(uploadBasePath));

// Mount REST API version 1
app.use('/api/v1', routes);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
