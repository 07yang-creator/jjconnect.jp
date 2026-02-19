# 🏠 Homepage & Category Pages - Quick Reference

## 📦 Files Created

| File | Purpose | Type |
|------|---------|------|
| `app/page.tsx` | Next.js homepage | React |
| `app/category/[slug]/page.tsx` | Next.js category page | React |
| `home.html` | Standalone homepage | HTML |
| `category.html` | Standalone category page | HTML |
| `HOMEPAGE_CATEGORY_GUIDE.md` | Full documentation | Guide |

---

## 🚀 Quick Setup (3 Steps)

### HTML Version (Recommended)

```bash
# 1. Configure Supabase in home.html (line 73)
const SUPABASE_URL = 'YOUR_URL';
const SUPABASE_ANON_KEY = 'YOUR_KEY';

# 2. Configure Supabase in category.html (line 99)
const SUPABASE_URL = 'YOUR_URL';
const SUPABASE_ANON_KEY = 'YOUR_KEY';

# 3. Open in browser
open home.html
open category.html?slug=tech
```

---

## ✨ Key Features

### Homepage (`home.html`)
- ✅ Latest 8 posts section
- ✅ Category sections (4 posts each)
- ✅ Paid content badges
- ✅ Author info display
- ✅ CTA section
- ✅ Responsive grid

### Category Page (`category.html`)
- ✅ Breadcrumb navigation
- ✅ Category header with stats
- ✅ All posts in category
- ✅ Related categories sidebar
- ✅ Empty state handling
- ✅ 3-column grid

---

## 🎨 Layout Structure

### Homepage
```
Hero Section
    ↓
Latest Posts (4 columns)
    ↓
Category Sections (each 4 posts)
    ↓
CTA Section
```

### Category Page
```
Breadcrumb
    ↓
Category Header (name + description)
    ↓
┌─────────────┬──────────┐
│ Posts Grid  │ Sidebar  │
│ (3 columns) │ - Related│
│             │ - CTA    │
└─────────────┴──────────┘
```

---

## 💰 Paid Content Display

Posts with `is_paid = true` show:

```
┌──────────────────┐
│  [Cover Image]   │
│  [💰 付费] Badge │ ← Orange, top-right
├──────────────────┤
│  Title           │
│  Summary         │
│  Author | ¥29.9 │ ← Price shown
└──────────────────┘
```

---

## 🔗 URL Patterns

| Page | Next.js | HTML |
|------|---------|------|
| Homepage | `/` | `/home.html` |
| Category | `/category/tech` | `/category.html?slug=tech` |
| Category | `/category/life` | `/category.html?slug=life` |

---

## 🎯 Usage Examples

### Link to Homepage
```html
<a href="/home.html">首页</a>
```

### Link to Category (from Sidebar)
```html
<a href="/category.html?slug=tech">技术分享</a>
<a href="/category.html?slug=life">生活日常</a>
```

### Create Test Post
```sql
INSERT INTO posts (
  title, content, status, is_paid, price,
  category_id, author_id
) VALUES (
  'Test Article',
  '{"html": "<p>Content</p>"}',
  'published',
  true,
  29.90,
  'category-uuid',
  'author-uuid'
);
```

---

## 🔧 Common Customizations

### Change Posts Per Section
```javascript
// Latest posts (line 76 in home.html)
.limit(8)  → .limit(12)

// Category posts (line 104)
.limit(4)  → .limit(6)
```

### Change Grid Columns
```html
<!-- 4 columns to 3 -->
lg:grid-cols-4 → lg:grid-cols-3

<!-- 3 columns to 4 (category page) -->
xl:grid-cols-3 → xl:grid-cols-4
```

### Change Paid Badge Color
```html
<!-- Orange to Red -->
bg-orange-500 → bg-red-500
text-orange-600 → text-red-600
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Posts not loading | Check Supabase config & console |
| Category 404 | Check slug matches database |
| Badge not showing | Verify `is_paid = true` (boolean) |
| Images broken | Check Storage bucket & URLs |

### Debug Commands
```javascript
// Check connection
console.log(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check data
const { data, error } = await supabase.from('posts').select('*');
console.log(data, error);

// Check category
const { data } = await supabase.from('categories').select('*').eq('slug', 'tech');
console.log(data);
```

---

## 📱 Responsive Breakpoints

| Screen | Columns | Container |
|--------|---------|-----------|
| Mobile | 1 | Full width |
| Tablet | 2 | Full width |
| Desktop | 3-4 | 1280px max |

---

## 🎨 Post Card Components

### Required Data
```javascript
{
  id: 'uuid',
  title: 'Article Title',
  summary: 'Optional summary',
  cover_image: 'https://...', // optional
  is_paid: true,
  price: 29.90,
  created_at: '2026-02-15',
  author: {
    display_name: 'Author Name',
    avatar_url: 'https://...' // optional
  }
}
```

### Visual Elements
- Cover image (or placeholder)
- Paid badge (conditional)
- Title (2 lines max)
- Summary (2 lines max)
- Author avatar + name
- Price (if paid)
- Date

---

## ✅ Integration Checklist

### Before Testing
- [ ] Supabase configured in both files
- [ ] Database has categories
- [ ] Database has posts
- [ ] Posts have `status = 'published'`
- [ ] Storage bucket created (for images)

### Testing Flow
- [ ] Open `home.html` - see latest posts
- [ ] See category sections
- [ ] Click "查看全部" → goes to category
- [ ] Click post card → goes to post detail
- [ ] Check paid badges show correctly
- [ ] Test on mobile device

### Sidebar Integration
- [ ] Update sidebar category links
- [ ] Link format: `/category.html?slug=${slug}`
- [ ] Test navigation from sidebar

---

## 🔄 Data Flow Summary

```
User → home.html
    ↓
Load latest 8 posts
Load categories with 4 posts each
    ↓
Render sections
    ↓
User clicks category
    ↓
Navigate to category.html?slug=tech
    ↓
Load category + all posts
    ↓
Display grid
```

---

## 📊 Performance Tips

1. **Lazy load images**
   ```html
   <img loading="lazy" src="..." />
   ```

2. **Cache categories**
   ```javascript
   // Categories rarely change
   let cachedCategories = null;
   ```

3. **Add pagination**
   ```javascript
   // For large categories
   .limit(12)
   .range(0, 11)
   ```

---

## 🎯 Next Steps

1. ✅ Configure Supabase URLs
2. ✅ Test homepage loading
3. ✅ Test category navigation
4. ✅ Verify paid badges
5. ✅ Test responsive design
6. ⭐ Add pagination (optional)
7. ⭐ Add search (optional)
8. ⭐ Add filters (optional)

---

## 📚 Related Docs

- Full Guide: `HOMEPAGE_CATEGORY_GUIDE.md`
- Database Types: `types/database.ts`
- Publish Page: `PUBLISH_PAGE_GUIDE.md`
- Sidebar: `RIGHT_SIDEBAR_GUIDE.md`

---

**Quick Ref v1.0.0**  
**Created: 2026-02-15**  
**Ready to browse! 🎊**
