# 📱 Homepage & Category Pages - Complete Guide

## 🎯 Overview

Created complete homepage and category browsing system with:
- **Homepage** with latest posts and category sections
- **Dynamic category pages** for browsing posts by category
- **Paid content badges** on article cards
- **Responsive grid layouts**
- **Both Next.js and HTML versions**

---

## 📦 Files Created

### Next.js Version (4 files)
```
├── app/
│   ├── page.tsx                    # Homepage
│   └── category/
│       └── [slug]/
│           └── page.tsx            # Dynamic category page
```

### Standalone HTML Version (2 files)
```
├── home.html                       # Homepage
└── category.html                   # Category page (with URL params)
```

### Documentation
```
└── HOMEPAGE_CATEGORY_GUIDE.md      # This file
```

---

## ✨ Features Implemented

### 🏠 Homepage Features

#### 1. **Hero Section**
- Welcome message
- Site tagline
- Clean, modern design

#### 2. **Latest Posts Section**
- Shows 8 most recent published posts
- "查看全部" link to all posts
- Grid layout (4 columns on desktop)

#### 3. **Category Sections**
- Each category displays top 4 posts
- Category name and description
- "查看全部" link to category page
- Only shows categories with posts

#### 4. **Paid Content Badge**
- Orange badge on cover image
- Shows "付费" text
- Displays price below card
- Icon indicator

#### 5. **CTA Section**
- Call-to-action for new users
- "发布文章" button
- Gradient background

### 📂 Category Page Features

#### 1. **Breadcrumb Navigation**
- Home → Category name
- Clickable path

#### 2. **Category Header**
- Large category title
- Description text
- Post count statistics

#### 3. **Posts Grid**
- 3 columns on desktop
- 2 columns on tablet
- 1 column on mobile
- All published posts in category

#### 4. **Sidebar**
- Related categories list
- CTA card for publishing

#### 5. **Empty State**
- Friendly message when no posts
- "发布第一篇文章" CTA

---

## 🎨 Design Specifications

### Layout Structure

#### Homepage
```
┌─────────────────────────────────────┐
│         Hero Section                 │
├─────────────────────────────────────┤
│    Latest Posts (4 columns)         │
├─────────────────────────────────────┤
│  Category 1 Section (4 columns)     │
├─────────────────────────────────────┤
│  Category 2 Section (4 columns)     │
├─────────────────────────────────────┤
│         CTA Section                  │
└─────────────────────────────────────┘
```

#### Category Page
```
┌─────────────────────────────────────┐
│         Breadcrumb                   │
├─────────────────────────────────────┤
│      Category Header                 │
├──────────────────┬──────────────────┤
│  Posts Grid      │    Sidebar       │
│  (3 columns)     │  - Related       │
│                  │  - CTA Card      │
└──────────────────┴──────────────────┘
```

### Post Card Components

```
┌──────────────────────┐
│  Cover Image         │
│  [Paid Badge]        │  ← Orange badge if is_paid
├──────────────────────┤
│  Title               │
│  Summary (optional)  │
│  Author + Price      │
│  Date                │
└──────────────────────┘
```

### Color Scheme

| Element | Color |
|---------|-------|
| Primary (buttons, links) | Blue (#2563eb) |
| Paid badge | Orange (#f97316) |
| Background | Gray-50 (#f9fafb) |
| Cards | White (#ffffff) |
| Text | Gray-900 (#111827) |
| Secondary text | Gray-600 (#4b5563) |

---

## 🚀 Quick Start

### HTML Version (Recommended)

1. **Configure Supabase**

```javascript
// In home.html (line ~73)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// In category.html (line ~99)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

2. **Test Locally**

```bash
# Open files directly
open home.html
open category.html?slug=tech

# Or use local server
python3 -m http.server 8000
# Visit: http://localhost:8000/home.html
```

3. **Update Navigation Links**

Update your existing HTML pages to link to new pages:
```html
<!-- Link to homepage -->
<a href="/home.html">首页</a>

<!-- Link to category (from sidebar) -->
<a href="/category.html?slug=tech">技术分享</a>
```

### Next.js Version

1. **Ensure Dependencies**

```bash
npm install next react react-dom
npm install @supabase/supabase-js @supabase/ssr
```

2. **Configure Environment**

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

3. **Start Dev Server**

```bash
npm run dev
# Visit: http://localhost:3000
```

---

## 📊 Data Flow

### Homepage

```
User visits /home.html
    ↓
Load latest 8 posts
Load all categories
    ↓
For each category:
  Load top 4 posts
    ↓
Filter categories with posts > 0
    ↓
Render sections
```

### Category Page

```
User visits /category.html?slug=tech
    ↓
Get slug from URL params
    ↓
Fetch category by slug
    ↓
Fetch all posts in category
Fetch related categories
    ↓
Render grid layout
```

---

## 🎯 Usage Examples

### Example 1: Display Paid Content

Posts with `is_paid = true` automatically show:
- Orange "付费" badge on cover
- Price tag below card (¥29.9)
- Dollar icon in badge

```sql
-- Create a paid post
INSERT INTO posts (title, is_paid, price, ...) 
VALUES ('Premium Article', true, 29.90, ...);
```

### Example 2: Category Navigation

From sidebar (RightSidebar component):
```html
<!-- Links automatically work -->
<a href="/category.html?slug=tech">技术分享</a>
<a href="/category.html?slug=life">生活日常</a>
```

### Example 3: Empty Category Handling

If category has no posts:
```
┌──────────────────────────┐
│     📄 Icon              │
│   暂无文章                │
│ 该分类下还没有发布任何文章  │
│  [发布第一篇文章] Button   │
└──────────────────────────┘
```

---

## 🔧 Customization

### Change Posts Per Section

**Homepage - Latest posts:**
```javascript
// home.html line ~76
.limit(8)  // Change to 12 for more posts
```

**Homepage - Category posts:**
```javascript
// home.html line ~104
.limit(4)  // Change to 6 for more per category
```

### Change Grid Columns

**Desktop (4 columns to 3):**
```html
<!-- Change -->
class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

<!-- To -->
class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

**Category page (3 to 4 columns):**
```html
<!-- Change -->
class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"

<!-- To -->
class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
```

### Customize Paid Badge

**Change color:**
```html
<!-- From orange to red -->
class="bg-orange-500" → class="bg-red-500"
class="text-orange-600" → class="text-red-600"
```

**Change text:**
```html
<!-- From "付费" to "VIP" -->
付费 → VIP
```

### Add Category Icons

```javascript
// In renderPostCard function, add icons
const categoryIcons = {
  'tech': '💻',
  'life': '🏠',
  'news': '📰'
};

// Use in template
<span>${categoryIcons[category.slug] || '📝'}</span>
```

---

## 📱 Responsive Behavior

### Breakpoints

| Screen | Columns | Container Width |
|--------|---------|----------------|
| Mobile (<768px) | 1 | Full width |
| Tablet (768-1023px) | 2 | Full width |
| Desktop (1024-1279px) | 3-4 | 1024px |
| Large (≥1280px) | 4 | 1280px |

### Mobile Optimizations

- Single column layout
- Larger touch targets
- Simplified navigation
- Optimized image sizes
- Reduced padding

---

## 🔍 SEO & Metadata

### Next.js Version (Automatic)

```typescript
// Category page metadata
export async function generateMetadata({ params }) {
  const category = await getCategoryBySlug(params.slug);
  
  return {
    title: `${category.name} - JJConnect`,
    description: category.description,
  };
}
```

### HTML Version (Manual)

```html
<!-- Update in category.html -->
<title id="page-title">分类 - JJConnect</title>

<script>
  // Update dynamically
  document.title = `${category.name} - JJConnect`;
</script>
```

---

## 🐛 Troubleshooting

### Issue 1: Posts Not Loading

**Check:**
```javascript
// 1. Supabase configuration
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY);

// 2. Database query
const { data, error } = await supabase.from('posts').select('*');
console.log('Posts:', data, error);

// 3. RLS policies
SELECT * FROM posts WHERE status = 'published';
```

### Issue 2: Category Not Found

**Check:**
```javascript
// 1. URL parameter
console.log('Slug:', categorySlug);

// 2. Database match
SELECT * FROM categories WHERE slug = 'your-slug';

// 3. Case sensitivity
-- Slugs are case-sensitive!
```

### Issue 3: Paid Badge Not Showing

**Check:**
```javascript
// 1. is_paid field
console.log('Is paid:', post.is_paid);

// 2. Boolean type
-- Must be true, not 'true' or 1
UPDATE posts SET is_paid = true WHERE id = 'uuid';
```

### Issue 4: Images Not Loading

**Check:**
```javascript
// 1. URL format
console.log('Cover:', post.cover_image);

// 2. Storage permissions
-- Check Supabase Storage RLS

// 3. CORS settings
-- Check Supabase CORS configuration
```

---

## 📊 Performance Optimization

### 1. Image Optimization

```html
<!-- Add lazy loading -->
<img loading="lazy" src="..." />

<!-- Use appropriate sizes -->
<img 
  src="..." 
  srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
/>
```

### 2. Data Caching

```javascript
// Cache categories (they don't change often)
let categoriesCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadCategoriesWithPosts() {
  const now = Date.now();
  if (categoriesCache && (now - cacheTime < CACHE_DURATION)) {
    return categoriesCache;
  }
  
  // Fetch from database
  categoriesCache = await fetchCategories();
  cacheTime = now;
  return categoriesCache;
}
```

### 3. Pagination

```javascript
// Add pagination for large categories
const PAGE_SIZE = 12;
let currentPage = 1;

async function loadMore() {
  const offset = (currentPage - 1) * PAGE_SIZE;
  const { data } = await supabase
    .from('posts')
    .select('*')
    .range(offset, offset + PAGE_SIZE - 1);
  
  renderPosts(data, true); // append mode
  currentPage++;
}
```

---

## 🎯 Integration with Sidebar

### Update RightSidebar Links

**In RightSidebar component:**

```typescript
// Change category links
<a href={`/category/${category.slug}`}>
  {category.name}
</a>
```

**In RightSidebar HTML:**

```html
<!-- Update category links -->
<a href="/category.html?slug=${category.slug}">
  ${category.name}
</a>
```

---

## 📚 Related Documentation

- **Database Schema**: See `schema.sql` for table structures
- **Type Definitions**: See `types/database.ts` for TypeScript types
- **Publishing**: See `PUBLISH_PAGE_GUIDE.md` for article creation
- **Sidebar**: See `RIGHT_SIDEBAR_GUIDE.md` for sidebar integration

---

## ✅ Testing Checklist

### Homepage
- [ ] Latest posts load correctly
- [ ] Category sections appear
- [ ] Paid badges show on paid posts
- [ ] Prices display correctly
- [ ] Author names show
- [ ] Dates format correctly
- [ ] Links work
- [ ] Responsive on mobile
- [ ] Empty states show when needed
- [ ] CTA buttons work

### Category Page
- [ ] Category loads by slug
- [ ] Breadcrumb shows correctly
- [ ] Post count accurate
- [ ] All posts in category show
- [ ] Grid layout correct
- [ ] Related categories show
- [ ] Sidebar CTA works
- [ ] Empty state for no posts
- [ ] Responsive on mobile
- [ ] URL parameter works

### Cross-Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

---

## 🎉 Summary

### What's Ready
✅ Homepage with latest posts and categories
✅ Category browsing pages  
✅ Paid content indicators  
✅ Responsive grid layouts  
✅ Next.js and HTML versions  
✅ Empty state handling  
✅ SEO-friendly structure  

### Next Steps
1. **Test with real data** - Add test posts and categories
2. **Customize styling** - Adjust colors and layouts
3. **Add pagination** - For large categories
4. **Integrate search** - Add search functionality
5. **Add filters** - Sort by date, price, etc.

---

**Created**: 2026-02-15  
**Version**: 1.0.0  
**Author**: Claude (Cursor AI)  
**Project**: JJConnect.jp

**Ready to browse! 🎊**
