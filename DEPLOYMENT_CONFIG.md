# Deployment Configuration Guide

## Backend API Configuration

Your application is configured to work with a Vercel-deployed backend. Follow these steps to configure it properly:

### 1. Environment Variables Setup

Create a `.env` file in the project root with the following content:

```env
# Backend API Configuration
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

**Replace `https://your-backend.vercel.app/api` with your actual Vercel backend URL.**

For example, if your backend is at `https://oah-backend.vercel.app`, set:
```env
VITE_API_BASE_URL=https://oah-backend.vercel.app/api
```

### 2. Environment File Template

You can also create a `.env.example` file (safe to commit) for reference:

```env
# Backend API Configuration
# Set this to your Vercel backend URL
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

### 3. Backend CORS Configuration

**Important:** Your Vercel backend must be configured to accept requests from your frontend domain.

#### Required CORS Headers:
```javascript
// In your Vercel backend
const allowedOrigins = [
  'http://localhost:5173',  // Local development
  'https://your-frontend.vercel.app',  // Production frontend
  // Add any other frontend URLs
];

response.setHeader('Access-Control-Allow-Origin', origin);
response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
response.setHeader('Access-Control-Allow-Credentials', 'true');
```

### 4. Deployment Environments

#### For Local Development:
- Create `.env` file with your Vercel backend URL
- Run `npm run dev`
- The app will use your Vercel backend instead of `localhost:3000`

#### For Vercel Deployment (Frontend):
If you're deploying this frontend to Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `VITE_API_BASE_URL` = `https://your-backend.vercel.app/api`
4. Redeploy your application

#### For Other Platforms:
Set the environment variable according to your platform:
- **Netlify**: Site settings → Environment variables
- **AWS Amplify**: App settings → Environment variables
- **Railway**: Variables tab

### 5. API Endpoints Used

Your application makes requests to these endpoints (all prefixed with `VITE_API_BASE_URL`):

- `POST /slots/unified` - Get available time slots
- `POST /bookings` - Create/get bookings
- `POST /bookings/:id/reserve` - Reserve a slot
- `POST /bookings/:id/confirm` - Confirm booking
- `POST /slots/select-provider` - Select provider by priority
- `POST /guests` - Create/update guest information

### 6. Verification

After configuration, verify the setup:

1. Start your dev server: `npm run dev`
2. Open browser console (F12)
3. Look for API request logs showing your Vercel URL
4. Successful requests should show: `✅ Successfully...`

### 7. Troubleshooting

#### Issue: CORS errors in browser console
**Solution:** Configure CORS headers on your Vercel backend (see step 3)

#### Issue: `fetch failed` or network errors
**Solution:** 
- Verify your Vercel backend URL is correct and accessible
- Check that your backend is deployed and running
- Test the backend URL directly in browser: `https://your-backend.vercel.app/api/health`

#### Issue: 404 errors on API calls
**Solution:**
- Ensure your backend routes match the expected paths
- Verify the `/api` prefix is correct for your backend setup
- Some Vercel backends might not need `/api` prefix

#### Issue: Environment variable not loading
**Solution:**
- Restart your dev server after creating/editing `.env`
- Ensure the variable starts with `VITE_` (required for Vite)
- Check for typos in the variable name

### 8. Git Ignore

Make sure `.env` is in your `.gitignore` to avoid committing sensitive URLs:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

Only commit `.env.example` as a template.

## Current Configuration

Your current setup:
- **API Config**: `src/config/api.ts`
- **Default fallback**: `http://localhost:3000/api`
- **Booking Service**: `src/services/bookingService.ts`
- **Slots Service**: `src/services/slotsService.ts`

All API calls go through the centralized `API_CONFIG.BASE_URL` configuration, so you only need to set one environment variable.
