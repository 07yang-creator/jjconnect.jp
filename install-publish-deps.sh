#!/bin/bash

# Article Publishing Page - Dependency Installation Script
# For Next.js version with TipTap editor

echo "📦 Installing dependencies for Article Publishing Page..."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "Please install Node.js and npm first: https://nodejs.org/"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "⚠️  Warning: package.json not found"
    echo "Creating package.json for Next.js project..."
    npm init -y
fi

echo "🔧 Installing TipTap editor and extensions..."
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder

echo ""
echo "🔧 Installing Supabase client..."
npm install @supabase/supabase-js @supabase/ssr

echo ""
echo "🔧 Installing Next.js (if not already installed)..."
npm install next@latest react@latest react-dom@latest

echo ""
echo "🔧 Installing TypeScript dependencies (if using TypeScript)..."
npm install -D typescript @types/react @types/node

echo ""
echo "🔧 Installing Tailwind CSS (if not already installed)..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure environment variables in .env.local:"
echo "   NEXT_PUBLIC_SUPABASE_URL=your_url"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key"
echo ""
echo "2. Create 'covers' bucket in Supabase Storage"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Visit http://localhost:3000/publish"
echo ""
echo "📚 For more information, see PUBLISH_PAGE_GUIDE.md"
