#!/bin/bash

echo "🚀 Productivity Quest Deployment Script"
echo "========================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

echo "🌐 Deploying to Vercel..."
vercel

echo "✅ Deployment complete!"
echo "🎉 Your app should now be live!"
echo ""
echo "Next steps:"
echo "1. Visit your Vercel dashboard"
echo "2. Add a custom domain (optional)"
echo "3. Share your app with others!" 