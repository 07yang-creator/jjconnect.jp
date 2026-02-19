# Posts Server Actions - Usage Guide

## Overview

Complete Server Actions for managing posts in your Supabase-powered application with authentication, authorization, and file upload support.

## Files Created

```
├── lib/
│   └── supabase/
│       ├── client.ts       # Supabase client configuration
│       └── server.ts       # Server-side utilities
├── app/
│   └── actions/
│       └── posts.ts        # Post management Server Actions
└── types/
    └── database.ts         # TypeScript type definitions
```

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Create Storage Bucket

In Supabase Dashboard:
1. Go to **Storage**
2. Create a new bucket named `covers`
3. Set it to **Public** (or configure RLS policies)

### 4. Storage RLS Policy (Optional)

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access
CREATE POLICY "Public can view covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- Users can delete their own covers
CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Usage Examples

### Example 1: Create a Simple Post

```typescript
'use client';

import { createPost } from '@/app/actions/posts';
import { useState } from 'react';

export default function CreatePostForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const result = await createPost({
      title: formData.get('title') as string,
      content: {
        html: formData.get('content') as string
      },
      status: 'published'
    });

    if (result.success) {
      console.log('Post created:', result.data?.post_id);
      // Redirect or show success message
    } else {
      console.error('Error:', result.error?.message);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Publishing...' : 'Publish'}
      </button>
    </form>
  );
}
```

### Example 2: Create Paid Post with Cover Image

```typescript
'use client';

import { createPost } from '@/app/actions/posts';
import { useState } from 'react';

export default function CreatePaidPost() {
  const [coverFile, setCoverFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await createPost({
      title: formData.get('title') as string,
      content: {
        html: formData.get('content') as string
      },
      summary: formData.get('summary') as string,
      category_id: formData.get('category') as string,
      is_paid: true,
      price: parseFloat(formData.get('price') as string),
      cover_image: coverFile || undefined,
      status: 'published'
    });

    if (result.success) {
      console.log('Post created:', result.data?.post_id);
      console.log('Cover URL:', result.data?.cover_url);
    } else {
      console.error('Error:', result.error?.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="summary" placeholder="Summary" />
      <textarea name="content" placeholder="Content" required />
      
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
      />
      
      <select name="category">
        <option value="">Select category...</option>
        {/* Add your categories */}
      </select>
      
      <input
        type="number"
        name="price"
        placeholder="Price"
        step="0.01"
        min="0"
        required
      />
      
      <button type="submit">Publish Paid Post</button>
    </form>
  );
}
```

### Example 3: Rich Text Editor (TipTap/ProseMirror)

```typescript
import { createPost } from '@/app/actions/posts';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function RichTextPostForm() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  async function handlePublish() {
    if (!editor) return;

    const result = await createPost({
      title: 'My Rich Text Post',
      content: {
        type: 'doc',
        content: editor.getJSON().content
      },
      status: 'published'
    });

    if (result.success) {
      console.log('Published:', result.data?.post_id);
    }
  }

  return (
    <div>
      <EditorContent editor={editor} />
      <button onClick={handlePublish}>Publish</button>
    </div>
  );
}
```

### Example 4: Authorized User Custom Category

```typescript
import { createPost } from '@/app/actions/posts';

async function publishToUserCategory() {
  const result = await createPost({
    title: 'Post in My Custom Category',
    content: { html: '<p>Content here</p>' },
    user_category_id: 'uuid-of-user-category', // User's custom category
    status: 'published'
  });

  if (result.success) {
    console.log('Post created in user category');
  } else {
    // Will fail if user is not authorized (is_authorized = false)
    console.error(result.error?.message);
  }
}
```

### Example 5: Save as Draft

```typescript
import { createPost } from '@/app/actions/posts';

async function saveDraft() {
  const result = await createPost({
    title: 'Work in Progress',
    content: { markdown: '# Draft content' },
    status: 'draft' // Won't be visible to public
  });

  if (result.success) {
    console.log('Draft saved:', result.data?.post_id);
  }
}
```

### Example 6: Update Existing Post

```typescript
import { updatePost } from '@/app/actions/posts';

async function editPost(postId: string) {
  const result = await updatePost(postId, {
    title: 'Updated Title',
    summary: 'New summary',
    price: 29.99,
  });

  if (result.success) {
    console.log('Post updated');
  }
}
```

### Example 7: Publish/Unpublish

```typescript
import { publishPost, unpublishPost } from '@/app/actions/posts';

// Publish a draft
await publishPost('post-uuid');

// Unpublish (back to draft)
await unpublishPost('post-uuid');
```

### Example 8: Delete Post

```typescript
import { deletePost } from '@/app/actions/posts';

async function handleDelete(postId: string) {
  const confirmed = confirm('Delete this post?');
  if (!confirmed) return;

  const result = await deletePost(postId);

  if (result.success) {
    console.log('Post deleted');
    // Cover image is automatically deleted from storage
  } else {
    console.error(result.error?.message);
  }
}
```

## API Reference

### `createPost(input: CreatePostInput)`

Creates a new post with optional cover image upload.

**Parameters:**
- `title` (required): Post title
- `content` (required): Post content (JSONB format)
- `summary` (optional): Short summary
- `category_id` (optional): Global category UUID
- `user_category_id` (optional): User's custom category UUID (requires authorization)
- `is_paid` (optional): Whether post is paid (default: false)
- `price` (optional): Price if paid (default: 0)
- `cover_image` (optional): File or URL string
- `status` (optional): 'draft' or 'published' (default: 'draft')

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    post_id: string;
    cover_url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### `updatePost(postId: string, input: Partial<CreatePostInput>)`

Updates an existing post. Only author or admin can update.

### `deletePost(postId: string)`

Deletes a post and its cover image from storage.

### `publishPost(postId: string)`

Changes post status from 'draft' to 'published'.

### `unpublishPost(postId: string)`

Changes post status from 'published' to 'draft'.

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input data |
| `UNAUTHORIZED` | User not logged in |
| `FORBIDDEN` | User lacks permission |
| `UPLOAD_ERROR` | File upload failed |
| `DATABASE_ERROR` | Database operation failed |
| `NOT_FOUND` | Post not found |
| `INTERNAL_ERROR` | Unexpected error |

## Security Features

✅ **Authentication Check**: Verifies user is logged in
✅ **Authorization Check**: Validates `is_authorized` flag for user categories
✅ **Ownership Verification**: Ensures only author/admin can modify posts
✅ **Category Ownership**: Validates user owns the user_category
✅ **Input Validation**: Sanitizes and validates all inputs
✅ **RLS Policies**: Respects Supabase Row Level Security
✅ **File Upload Security**: Organizes uploads by user ID
✅ **Automatic Cleanup**: Deletes cover images when post is deleted

## Testing

### Test User Authorization

```typescript
import { isAuthorizedUser } from '@/lib/supabase/server';

const isAuth = await isAuthorizedUser(userId);
console.log('Is authorized:', isAuth);
```

### Test Image Upload

```typescript
// Create a test file
const blob = new Blob(['test'], { type: 'image/png' });
const file = new File([blob], 'test.png', { type: 'image/png' });

const result = await createPost({
  title: 'Test Post',
  content: { html: '<p>Test</p>' },
  cover_image: file,
  status: 'draft'
});

console.log('Upload result:', result);
```

## Next Steps

1. **Create UI Components**: Build forms using these actions
2. **Add Validation**: Use Zod or similar for client-side validation
3. **Implement Editor**: Integrate TipTap, Slate, or your preferred editor
4. **Add Loading States**: Show progress during uploads
5. **Error Handling**: Display user-friendly error messages
6. **Add Middleware**: Protect routes that require authentication

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Failed to upload cover image"
- Check that `covers` bucket exists in Supabase Storage
- Verify bucket is public or has correct RLS policies
- Ensure file size is within limits

### "Only authorized users can post to custom categories"
- User's `is_authorized` field must be `true` in profiles table
- Only applies when using `user_category_id`

### "You do not have permission to update this post"
- User must be the post author or have `is_authorized = true`

## License

MIT
