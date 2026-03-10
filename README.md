# VMC Reviews - Backend API

Node.js + Express + Supabase backend for the VMC Reviews platform.

## Tech Stack

- **Node.js** 18+ - JavaScript runtime
- **Express** 4.18+ - Web framework
- **Supabase** - PostgreSQL database + authentication
- **JWT** - Token-based authentication
- **Nodemailer** - Email service
- **Multer** - File upload handling
- **bcryptjs** - Password hashing
- **Joi** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin handling

## Project Structure

```
vmc-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── db.js           # Supabase connection
│   │   └── env.js          # Environment variables
│   ├── routes/              # API route handlers
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── businesses.js
│   │   └── reviews.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js         # JWT authentication
│   │   ├── errorHandler.js # Error handling
│   │   └── requestLogger.js# Request logging
│   ├── controllers/         # Business logic (ready to expand)
│   ├── services/            # Reusable services (ready to expand)
│   ├── models/              # Database models (ready to expand)
│   ├── validators/          # Input validation (ready to expand)
│   ├── utils/               # Utility functions (ready to expand)
│   ├── constants/           # Constants (ready to expand)
│   └── app.js              # Express app setup
├── uploads/                 # File upload directory
├── .env                     # Environment variables
├── .env.example             # Environment template
├── package.json
├── server.js                # Server entry point
├── .eslintrc.cjs            # ESLint config
├── .prettierrc               # Prettier config
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project (free tier available)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase and other credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_jwt_secret
```

### Development

Start the development server with auto-reload:
```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Production

Start production server:
```bash
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with nodemon |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |

## API Routes

### Health Check
```
GET /health
```

### Authentication
```
POST   /api/auth/register      # Register user
POST   /api/auth/login         # Login
POST   /api/auth/logout        # Logout
```

### Users
```
GET    /api/users/:id          # Get user profile
PUT    /api/users/:id          # Update profile
DELETE /api/users/:id          # Delete account
```

### Businesses
```
GET    /api/businesses         # Search businesses
GET    /api/businesses/:id     # Get business details
POST   /api/businesses         # Create business
PUT    /api/businesses/:id     # Update business
```

### Reviews
```
GET    /api/reviews            # List reviews
GET    /api/reviews/:id        # Get single review
POST   /api/reviews            # Submit review
PUT    /api/reviews/:id        # Update review
DELETE /api/reviews/:id        # Delete review
```

## Authentication

This API uses **JWT (JSON Web Tokens)** for authentication.

### Getting a Token

1. Register or login to get a JWT token
2. Include the token in all protected requests:
```
Authorization: Bearer <your_jwt_token>
```

### Token Expiry

- Access Token: 24 hours
- Refresh Token: 7 days

## Response Format

### Success Response
```json
{
  "status": "success",
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error description",
  "errors": [ /* validation errors */ ]
}
```

## Code Quality

### ESLint Configuration

Check for linting errors:
```bash
npm run lint
npm run lint:fix  # Auto-fix errors
```

### Prettier Configuration

Format all code:
```bash
npm run format
```

Both tools are configured with consistent standards.

## Environment Variables

See `.env.example` for all available options:

- `NODE_ENV` - Environment (development/production)
- `SERVER_PORT` - Server port (default: 5000)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JWT_SECRET` - JWT signing secret
- `EMAIL_FROM` - Sender email address
- `EMAIL_HOST` - SMTP server host
- `CAPTCHA_SECRET` - reCAPTCHA secret key

## Database

The API uses **Supabase** (PostgreSQL) as the database.

### Connecting to Database

The connection is managed in `src/config/db.js` using the Supabase JS SDK.

### Creating Tables

Run the SQL migrations in your Supabase dashboard to create the 17 required tables as specified in the architecture documentation.

## Error Handling

All errors are caught and formatted consistently:

1. **Validation Errors** (400) - Invalid input
2. **Authentication Errors** (401) - Invalid/missing token
3. **Authorization Errors** (403) - Insufficient permissions
4. **Not Found Errors** (404) - Resource not found
5. **Server Errors** (500) - Unexpected error

Errors are logged to console with stack traces in development mode.

## Middleware

### Authentication Middleware
Protects routes by verifying JWT tokens:
```javascript
import { authMiddleware } from './middleware/auth.js';

router.post('/protected-route', authMiddleware, handler);
```

### Error Handler
Catches and formats all errors uniformly.

### Request Logger
Logs all requests with method, path, status code, and response time.

### Rate Limiter
Global rate limit: 100 requests per IP per 15 minutes.

## Security Best Practices

1. ✅ **HTTPS Only** - Use HTTPS in production
2. ✅ **JWT Expiry** - Tokens expire after 24 hours
3. ✅ **Password Hashing** - Bcrypt with salt rounds
4. ✅ **Input Validation** - Joi schema validation
5. ✅ **CORS Protection** - Restricted to frontend domain
6. ✅ **Security Headers** - Helmet.js enabled
7. ✅ **Rate Limiting** - Prevents brute force attacks
8. ✅ **Environment Secrets** - Never hardcoded

## File Upload Security

- Max file size: 5MB per file
- Allowed types: JPG, PNG, PDF
- Files stored in Supabase Storage bucket
- Automatic virus scanning (Supabase feature)

## Future Enhancements

- [ ] Database models and migrations
- [ ] Controller implementations
- [ ] Service layer logic
- [ ] Input validators
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Redis caching layer
- [ ] Background job queue
- [ ] Analytics tracking

## Troubleshooting

### Port 5000 Already in Use
Change the port in `.env`:
```
SERVER_PORT=5001
```

### Supabase Connection Failed
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Check Supabase project is active
3. Ensure network access is allowed

### JWT Errors
1. Verify `JWT_SECRET` matches token generation
2. Check token expiry hasn't passed
3. Ensure token format is: `Bearer <token>`

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test
3. Run linter: `npm run lint:fix`
4. Commit: `git commit -m "Add feature"`
5. Create pull request

## License

MIT License - see LICENSE file for details

---

For more information, see the main project [ARCHITECTURE.md](../ARCHITECTURE.md)
