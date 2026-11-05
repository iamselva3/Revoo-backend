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

// Trust reverse proxies (Render, Cloudflare, load balancers) for accurate client IP & rate limiting
app.set('trust proxy', 1);

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

// UptimeRobot & Service Health Check (exempt from rate limits for 24/7 monitoring)
app.get(['/health', '/'], (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'REVOO Backend API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
  });
});

// Rate limiting
app.use(globalLimiter);

// Request body parsers (supports high-res image uploads & base64 data URLs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Serve uploaded static files
const uploadBasePath = path.resolve(process.cwd(), config.storage.uploadDir);
app.use('/uploads', express.static(uploadBasePath));

// Mount REST API (both /api/v1 and root / for seamless compatibility)
app.use('/api/v1', routes);
app.use('/', routes);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
