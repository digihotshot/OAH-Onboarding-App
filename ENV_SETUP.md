# Environment Variables Setup

This project uses environment variables to configure the API base URL. This allows you to easily switch between development and production environments.

## Local Development

1. Create a `.env` file in the root directory (it's already in `.gitignore`):

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
```

2. The app will automatically use this URL when running locally with `npm run dev`

## Vercel Deployment

### Setting Environment Variables in Vercel

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://oah-booking-server.vercel.app/api` (replace with your actual production API URL)
   - **Environment**: Select all environments (Production, Preview, Development) or choose specific ones

4. Redeploy your app for the changes to take effect

### Build Settings for Vercel

Make sure your Vercel build settings are configured as follows:

- **Build Command**: `npm run build` or `vite build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Important Notes

- ✅ All API calls now use `API_CONFIG.BASE_URL` from `/src/config/api.ts`
- ✅ The config file automatically reads from `import.meta.env.VITE_API_BASE_URL`
- ✅ Falls back to `http://localhost:3000/api` if the environment variable is not set
- ⚠️ **NEVER** commit `.env` files to git (it's already in `.gitignore`)
- ⚠️ All environment variables in Vite must be prefixed with `VITE_`

## Testing

To test with a different API URL locally, simply update the `.env` file and restart the dev server.

## Files Modified

The following files now use the centralized API configuration:

### Services
- `/src/services/bookingService.ts`
- `/src/services/slotsService.ts`

### Hooks
- `/src/hooks/useUniversalCategories.ts`
- `/src/hooks/useMiddlewareProviders.ts`
- `/src/hooks/useServerAddress.ts`
- `/src/hooks/useServicesByCategory.ts`
- `/src/hooks/useRateLimit.ts`

### Utils
- `/src/utils/zipCodeValidation.ts`

### Config
- `/src/config/api.ts` (new centralized config file)
