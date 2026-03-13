import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import businessRoutes from './routes/businesses.js';
import businessOwnerRoutes from './routes/business.js';
import adminBusinessRoutes from './routes/admin/businesses.js';
import adminConsumerRoutes from './routes/admin/consumers.js';
import adminReviewRoutes from './routes/admin/reviews.js';
import reviewRoutes from './routes/reviews.js';
import categoryRoutes from './routes/categories.js';
import consumerRoutes from './routes/consumer.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Middleware: Security
app.use(helmet());

// Middleware: CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Middleware: Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Middleware: Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware: Rate Limiting
// Global limiter — applied to all routes as a baseline
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // raised from 100 → 500; admin panel is a trusted internal tool
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests. Please slow down and try again.' },
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1', // skip localhost in dev
});
app.use(limiter);

// Auth limiter — stricter limit on login/register to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many auth attempts. Please try again later.' },
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes); // stricter auth limiter
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin/businesses', adminBusinessRoutes);
app.use('/api/admin/businesses', adminReviewRoutes);
app.use('/api/admin/consumers', adminConsumerRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/business', businessOwnerRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error Handler (must be last)
app.use(errorHandler);

export default app;
