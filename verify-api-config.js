#!/usr/bin/env node

/**
 * Verification script to check API configuration
 * Run with: node verify-api-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying API Configuration...\n');

// Check for .env file
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ No .env file found!');
  console.log('📝 Please create a .env file with:');
  console.log('   VITE_API_BASE_URL=https://your-backend.vercel.app/api\n');
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiUrlMatch = envContent.match(/VITE_API_BASE_URL\s*=\s*(.+)/);

if (!apiUrlMatch) {
  console.log('❌ VITE_API_BASE_URL not found in .env file!');
  console.log('📝 Please add to .env file:');
  console.log('   VITE_API_BASE_URL=https://your-backend.vercel.app/api\n');
  process.exit(1);
}

const apiUrl = apiUrlMatch[1].trim();

console.log('✅ .env file found');
console.log(`✅ VITE_API_BASE_URL is set to: ${apiUrl}\n`);

// Validate URL format
try {
  const url = new URL(apiUrl);
  
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    console.log('⚠️  Warning: URL should use http:// or https://');
  }
  
  if (apiUrl.includes('localhost')) {
    console.log('⚠️  Warning: You are using localhost instead of your Vercel backend');
    console.log('   For production, update to: https://your-backend.vercel.app/api\n');
  } else if (apiUrl.includes('your-backend')) {
    console.log('⚠️  Warning: Please replace "your-backend" with your actual Vercel backend URL\n');
  } else {
    console.log('✅ URL format looks good!\n');
  }
  
  console.log('📋 Configuration Summary:');
  console.log(`   Protocol: ${url.protocol}`);
  console.log(`   Host: ${url.host}`);
  console.log(`   Path: ${url.pathname}\n`);
  
  console.log('🚀 Next Steps:');
  console.log('   1. Make sure your Vercel backend is deployed and accessible');
  console.log('   2. Ensure CORS is configured on your backend');
  console.log('   3. Run: npm run dev');
  console.log('   4. Check browser console for API requests\n');
  
  console.log('📚 For more details, see: DEPLOYMENT_CONFIG.md\n');
  
} catch (error) {
  console.log('❌ Invalid URL format!');
  console.log(`   Error: ${error.message}`);
  console.log('   Expected format: https://your-backend.vercel.app/api\n');
  process.exit(1);
}
