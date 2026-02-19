# 📝 Article Publishing Page - Quick Reference

## 🚀 Quick Start (5 Minutes)

### HTML Version (Recommended for Current Project)

```bash
# 1. Open publish.html
# 2. Find lines 151-152 and replace:
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

# 3. Open in browser or run:
python3 -m http.server 8000
# Visit: http://localhost:8000/publish.html
```

### Next.js Version

```bash
# 1. Install dependencies
./install-publish-deps.sh

# 2. Configure .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# 3. Start server
npm run dev
# Visit: http://localhost:3000/publish
```

---

## 📦 Files Overview

| File | Purpose | Size |
|------|---------|------|
| `app/publish/page.tsx` | Next.js page (TipTap) | ~600 lines |
| `publish.html` | Standalone page (Quill) | ~500 lines |
| `PUBLISH_PAGE_GUIDE.md` | Full documentation | Detailed |
| `PUBLISH_PAGE_SUMMARY.md` | Complete summary | Overview |
| `install-publish-deps.sh` | Dependency installer | Script |

---

## ✨ Features Checklist

- [x] Title input (4xl font)
- [x] Cover image upload (drag & drop)
- [x] Summary textarea
- [x] Category selector (official + personal)
- [x] Rich text editor (TipTap / Quill)
- [x] Paid content toggle
- [x] Price input (appears when paid)
- [x] Save draft button
- [x] Publish button
- [x] Form validation
- [x] Loading states
- [x] Error handling
- [x] Responsive design

---

## 🔑 Required Setup

### 1. Supabase Configuration
```javascript
// Change these in publish.html (lines 151-152)
const SUPABASE_URL = 'YOUR_URL';
const SUPABASE_ANON_KEY = 'YOUR_KEY';
```

### 2. Storage Bucket
```sql
-- Create in Supabase Dashboard > Storage
Bucket name: covers
Public: Yes
```

### 3. Database Tables
```sql
-- Must exist:
- categories (official categories)
- user_categories (personal categories)
- profiles (with is_authorized field)
- posts (with all required fields)
```

---

## 🎯 Usage Flow

```
1. Fill Title → 2. Upload Cover (optional)
        ↓
3. Add Summary (optional) → 4. Select Category
        ↓
5. Write Content (rich text) → 6. Set Paid (optional)
        ↓
7. Click "Publish" or "Save Draft"
        ↓
8. Redirect to post page or drafts
```

---

## 🔧 Common Configurations

### Change Editor Height
```javascript
// Quill (HTML)
.ql-editor { min-height: 600px; }

// TipTap (Next.js)
className="min-h-[600px]"
```

### Change Upload Size Limit
```javascript
// From 5MB to 10MB
if (file.size > 10 * 1024 * 1024) {
  alert('文件大小不能超过 10MB');
}
```

### Add Auto-Save
```javascript
// HTML version
let autoSaveTimer;
quill.on('text-change', () => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveDraft, 5000);
});
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Editor not showing | Check CDN/dependencies loaded |
| Upload fails | Check Storage bucket & RLS |
| Categories empty | Check database has data |
| Personal categories hidden | Check `is_authorized = true` |
| Publish fails | Check console for errors |

---

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Mobile | ✅ Responsive |

---

## 🎨 Key Components

### Title Input
```html
<input class="w-full text-4xl font-bold" />
```

### Cover Upload
```html
<input type="file" accept="image/*" />
<!-- Preview with remove button -->
```

### Category Toggle
```html
<button>官方板块</button>
<button>个人分类</button> <!-- If authorized -->
```

### Rich Editor
```html
<!-- Quill -->
<div id="editor"></div>

<!-- TipTap -->
<EditorContent editor={editor} />
```

### Paid Toggle
```html
<input type="checkbox" id="is-paid-toggle" />
<input type="number" id="price-input" /> <!-- When checked -->
```

---

## 📊 Data Format

### Saved to Database
```json
{
  "title": "Article Title",
  "content": {
    "html": "<p>Content</p>",
    "text": "Content",
    "delta": {}
  },
  "summary": "Summary text",
  "cover_image": "https://...url",
  "category_id": "uuid",
  "is_paid": true,
  "price": 29.90,
  "status": "published",
  "author_id": "user-uuid"
}
```

---

## 🔐 Permissions Required

### User Must Be
- ✅ Logged in (authenticated)
- ✅ Have valid session

### For Personal Categories
- ✅ `profiles.is_authorized = true`

### Database RLS
```sql
-- Insert own posts
CREATE POLICY "insert_own_posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Upload covers
CREATE POLICY "upload_covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' AND
  auth.role() = 'authenticated'
);
```

---

## 💡 Pro Tips

1. **Use descriptive titles** (15-30 characters)
2. **Optimize cover images** (< 500KB, 1200x630px)
3. **Write clear summaries** (100-200 characters)
4. **Structure content** with headings
5. **Test on mobile** before publishing
6. **Save drafts frequently** while writing
7. **Preview before publish** (if feature added)

---

## 📞 Getting Help

1. **Check guide**: `PUBLISH_PAGE_GUIDE.md`
2. **Check summary**: `PUBLISH_PAGE_SUMMARY.md`
3. **Browser console**: F12 → Console tab
4. **Network tab**: Check API calls
5. **Supabase logs**: Dashboard → Logs

---

## ⚡ Performance Tips

- Compress cover images before upload
- Limit editor content to reasonable length
- Use lazy loading for images in content
- Implement auto-save (don't overuse)
- Cache categories data (optional)

---

## 🎯 Next Steps After Setup

1. ✅ Test basic publish flow
2. ✅ Test image upload
3. ✅ Test category selection
4. ✅ Test paid content
5. ✅ Test draft saving
6. ✅ Test mobile layout
7. ✅ Create first article!

---

## 📚 Related Docs

- Full Guide: `PUBLISH_PAGE_GUIDE.md`
- Summary: `PUBLISH_PAGE_SUMMARY.md`
- Posts Actions: `POSTS_ACTIONS_GUIDE.md`
- Database Types: `types/database.ts`

---

**Quick Reference v1.0.0**  
**Created: 2026-02-15**  
**For: JJConnect.jp**

**Ready to publish? Let's go! 🚀**
