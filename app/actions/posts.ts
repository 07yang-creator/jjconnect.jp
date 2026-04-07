'use server';

/**
 * Server Actions for Post Management
 * Handles creating, updating, and publishing posts
 */

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { createServerSupabaseClient, getCurrentUser, getProfileGateStatus, isAuthorizedUser, isUpgradedRole } from '@/lib/supabase/server';
import type { PostInsert, PostUpdate, PostContent } from '@/types/database';
import { createPostSchema, parseSafe, saveDraftSchema, type CreatePostInput as SchemaCreatePostInput } from '@/lib/schemas';
import {
  sendPostSubmittedConfirmationToAuthor,
  sendPostSubmittedNotificationToAdmin,
} from '@/lib/email';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePostInput {
  title: string;
  content: PostContent;
  summary?: string;
  category_id?: string;
  user_category_id?: string;
  is_paid?: boolean;
  price?: number;
  cover_image?: File | string; // File for upload or URL string
  status?: 'draft' | 'published';
}

/** Save draft to DB (create or update). Title may be empty → stored as "Untitled". */
export interface SavePublishDraftInput {
  post_id?: string | null;
  title?: string;
  content: PostContent;
  summary?: string;
  category_id?: string;
  user_category_id?: string;
  is_paid?: boolean;
  price?: number;
  cover_image?: File | string;
}

export interface SubmitPostForReviewInput extends CreatePostInput {
  /** When set, updates this draft instead of inserting a new row. */
  post_id?: string | null;
}

export interface CreatePostResult {
  success: boolean;
  data?: {
    post_id: string;
    cover_url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Upload cover image to Supabase Storage
 * @param file - File to upload
 * @param userId - User ID for organizing uploads
 * @returns Public URL of uploaded image or null on error
 */
async function uploadCoverImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Generate unique filename with validated extension
    const timestamp = Date.now();
    const nameParts = file.name.split('.');
    const rawExt = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : null;
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
    if (!rawExt || !allowedExtensions.includes(rawExt)) {
      return { url: null, error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` };
    }
    const fileExt = rawExt;
    const fileName = `${userId}/${timestamp}.${fileExt}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('covers')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return { url: null, error: error.message };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('covers')
      .getPublicUrl(data.path);
    
    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Validate post input data (Zod schema - prevents injection)
 */
function validatePostInput(input: unknown): { valid: true; data: SchemaCreatePostInput } | { valid: false; error: string } {
  const parsed = parseSafe(createPostSchema, input);
  if (parsed.success) return { valid: true, data: parsed.data as SchemaCreatePostInput };
  const firstIssue = parsed.error.issues[0];
  const msg = firstIssue?.message || 'Invalid post input';
  return { valid: false, error: msg };
}

function validateSaveDraftInput(input: unknown): { valid: true; data: z.infer<typeof saveDraftSchema> } | { valid: false; error: string } {
  const parsed = parseSafe(saveDraftSchema, input);
  if (parsed.success) return { valid: true, data: parsed.data as z.infer<typeof saveDraftSchema> };
  const firstIssue = parsed.error.issues[0];
  return { valid: false, error: firstIssue?.message || 'Invalid draft input' };
}

async function queueReviewSubmissionEmails(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  authorEmail: string | null | undefined,
  postTitle: string,
  postId: string
): Promise<void> {
  if (!authorEmail?.trim()) return;
  let authorDisplayName: string | null = null;
  try {
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    authorDisplayName = (profile as { display_name?: string } | null)?.display_name ?? null;
  } catch {
    /* ignore */
  }
  const reviewPayload = {
    postTitle: postTitle.trim(),
    authorEmail,
    postId,
    authorDisplayName,
  };
  Promise.all([
    sendPostSubmittedConfirmationToAuthor(authorEmail),
    sendPostSubmittedNotificationToAdmin(reviewPayload),
  ])
    .then(([userResult, adminResult]) => {
      if (!userResult.success) console.error('Review confirmation email failed:', userResult.error);
      if (!adminResult.success) console.error('Review notification to admin failed:', adminResult.error);
    })
    .catch((err) => console.error('Review emails error:', err));
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Create and publish a new post
 * 
 * @param input - Post creation data
 * @returns Result with post ID or error
 * 
 * @example
 * ```typescript
 * const result = await createPost({
 *   title: 'My Article',
 *   content: { html: '<p>Content</p>' },
 *   category_id: 'uuid',
 *   is_paid: false,
 *   status: 'published'
 * });
 * ```
 */
export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  try {
    // 1. Validate input (Zod - prevents injection)
    const validation = validatePostInput(input);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error,
        },
      };
    }
    const validatedInput = validation.data;

    // 2. Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create posts',
        },
      };
    }

    const gateStatus = await getProfileGateStatus(user.id);
    if (!gateStatus.basic_complete) {
      return {
        success: false,
        error: {
          code: 'PROFILE_INCOMPLETE',
          message: 'Please complete the 3-question onboarding profile first.',
        },
      };
    }

    if (isUpgradedRole(gateStatus.role) && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
      return {
        success: false,
        error: {
          code: 'UPGRADE_PROFILE_INCOMPLETE',
          message: 'Please verify email and complete upgrade profile before using upgraded features.',
        },
      };
    }

    if (validatedInput.is_paid && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
      return {
        success: false,
        error: {
          code: 'PAID_PROFILE_REQUIRED',
          message: 'Paid content requires verified email and completed upgrade profile.',
        },
      };
    }

    if (validatedInput.status === 'published') {
      const { canPublishDirectly } = await import('@/lib/publish/canPublishDirectly');
      if (!(await canPublishDirectly(user.id))) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Direct publishing is limited to administrators. Save a draft and use Submit for review instead.',
          },
        };
      }
    }

    // 3. Check if user_category_id is provided (indicates posting to user homepage)
    if (validatedInput.user_category_id) {
      const isAuthorized = await isAuthorizedUser(user.id);
      if (!isAuthorized) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only authorized users can post to custom categories',
          },
        };
      }
      
      // Verify the user_category belongs to this user
      const supabase = await createServerSupabaseClient();
      const { data: userCategory } = await supabase
        .from('user_categories')
        .select('user_id')
        .eq('id', validatedInput.user_category_id)
        .single();
      
      const uc = userCategory as { user_id: string } | null;
      if (!uc || uc.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'This category does not belong to you',
          },
        };
      }
    }
    
    // 4. Handle cover image upload
    let coverUrl: string | null = null;
    if (validatedInput.cover_image) {
      if (validatedInput.cover_image instanceof File) {
        const uploadResult = await uploadCoverImage(validatedInput.cover_image, user.id);
        if (uploadResult.error) {
          return {
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: `Failed to upload cover image: ${uploadResult.error}`,
            },
          };
        }
        coverUrl = uploadResult.url;
      } else if (typeof validatedInput.cover_image === 'string') {
        // URL string provided directly
        coverUrl = validatedInput.cover_image;
      }
    }
    
    // 5. Create post data
    const supabase = await createServerSupabaseClient();
    const postData = {
      title: validatedInput.title.trim(),
      content: validatedInput.content,
      summary: validatedInput.summary?.trim() || null,
      cover_image: coverUrl,
      category_id: validatedInput.category_id || null,
      user_category_id: validatedInput.user_category_id || null,
      author_id: user.id,
      is_paid: validatedInput.is_paid || false,
      price: validatedInput.price || 0,
      status: validatedInput.status || 'draft',
    } as PostInsert & { user_category_id?: string | null };

    // 6. Insert post
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert(postData)
      .select('id')
      .single();
    
    if (insertError) {
      console.error('Post insert error:', insertError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create post',
          details: insertError.message,
        },
      };
    }

    const postId = (post as { id: string }).id;

    // 6b. Submitted for review → notify author + admins
    const contentWithReview = validatedInput.content as Record<string, unknown> | undefined;
    if (contentWithReview?.review_state === 'pending') {
      void queueReviewSubmissionEmails(supabase, user.id, user.email, validatedInput.title.trim(), postId);
    }

    // 7. Revalidate relevant paths
    revalidatePath('/posts');
    revalidatePath('/');
    revalidatePath(`/profile/${user.id}`);
    revalidatePath('/profile/drafts');
    if (validatedInput.category_id) {
      const { data: catData } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', validatedInput.category_id)
        .single();
      if (catData?.slug) {
        revalidatePath(`/category/${catData.slug}`);
      }
    }

    // 8. Return success
    return {
      success: true,
      data: {
        post_id: postId,
        cover_url: coverUrl || undefined,
      },
    };
    
  } catch (error) {
    console.error('Create post error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Update an existing post
 * 
 * @param postId - ID of post to update
 * @param input - Updated post data
 * @returns Result with success status
 */
export async function updatePost(
  postId: string,
  input: Partial<CreatePostInput>
): Promise<CreatePostResult> {
  try {
    // 1. Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to update posts',
        },
      };
    }
    
    const supabase = await createServerSupabaseClient();
    
    // 2. Verify ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('author_id, cover_image')
      .eq('id', postId)
      .single();
    
    if (fetchError || !existingPost) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found',
        },
      };
    }
    
    const isAuthorized = await isAuthorizedUser(user.id);
    if (existingPost.author_id !== user.id && !isAuthorized) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this post',
        },
      };
    }

    if (input.status === 'published') {
      const { canPublishDirectly } = await import('@/lib/publish/canPublishDirectly');
      if (!(await canPublishDirectly(user.id))) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Direct publishing is limited to administrators. Use Submit for review or ask an administrator.',
          },
        };
      }
    }

    // 3. Handle cover image update
    let coverUrl = existingPost.cover_image;
    if (input.cover_image && input.cover_image instanceof File) {
      const uploadResult = await uploadCoverImage(input.cover_image, user.id);
      if (uploadResult.error) {
        return {
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: `Failed to upload cover image: ${uploadResult.error}`,
          },
        };
      }
      coverUrl = uploadResult.url;
    } else if (typeof input.cover_image === 'string') {
      coverUrl = input.cover_image;
    }
    
    // 4. Build update data
    const updateData: PostUpdate = {};
    if (input.title) updateData.title = input.title.trim();
    if (input.content) updateData.content = input.content;
    if (input.summary !== undefined) updateData.summary = input.summary?.trim() || null;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.user_category_id !== undefined) {
      (updateData as Record<string, unknown>).user_category_id = input.user_category_id;
    }
    if (input.is_paid !== undefined) updateData.is_paid = input.is_paid;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.status) updateData.status = input.status;
    if (coverUrl !== existingPost.cover_image) updateData.cover_image = coverUrl;
    
    // 5. Update post
    const { error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId);
    
    if (updateError) {
      console.error('Post update error:', updateError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update post',
          details: updateError.message,
        },
      };
    }
    
    // 6. Revalidate paths
    revalidatePath('/posts');
    revalidatePath('/');
    revalidatePath(`/posts/${postId}`);
    revalidatePath(`/profile/${user.id}`);
    revalidatePath('/profile/drafts');
    revalidatePath('/admin/review');
    if (input.category_id) {
      const { data: catData } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', input.category_id)
        .single();
      if (catData?.slug) {
        revalidatePath(`/category/${catData.slug}`);
      }
    }

    return {
      success: true,
      data: {
        post_id: postId,
        cover_url: coverUrl || undefined,
      },
    };
  } catch (error) {
    console.error('Update post error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Delete a post
 * 
 * @param postId - ID of post to delete
 * @returns Result with success status
 */
export async function deletePost(postId: string): Promise<CreatePostResult> {
  try {
    // 1. Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to delete posts',
        },
      };
    }
    
    const supabase = await createServerSupabaseClient();
    
    // 2. Verify ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('author_id, cover_image')
      .eq('id', postId)
      .single();
    
    if (fetchError || !existingPost) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found',
        },
      };
    }
    
    const isAuthorized = await isAuthorizedUser(user.id);
    if (existingPost.author_id !== user.id && !isAuthorized) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this post',
        },
      };
    }
    
    // 3. Delete cover image from storage if exists
    if (existingPost.cover_image) {
      try {
        const coverUrl = existingPost.cover_image;
        let storagePath: string | null = null;
        try {
          const parsed = new URL(coverUrl);
          const match = parsed.pathname.match(/\/public\/covers\/(.+)$/);
          storagePath = match ? match[1] : null;
        } catch {
          const parts = coverUrl.split('/covers/');
          storagePath = parts.length > 1 ? parts[1] : null;
        }
        if (storagePath) {
          await supabase.storage.from('covers').remove([storagePath]);
        } else {
          console.warn('Could not parse cover storage path from URL:', coverUrl);
        }
      } catch (error) {
        console.error('Failed to delete cover image:', error);
      }
    }
    
    // 4. Delete post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    
    if (deleteError) {
      console.error('Post delete error:', deleteError);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete post',
          details: deleteError.message,
        },
      };
    }
    
    // 5. Revalidate paths
    revalidatePath('/posts');
    revalidatePath(`/profile/${user.id}`);
    revalidatePath('/profile/drafts');
    revalidatePath('/admin/review');

    return {
      success: true,
      data: {
        post_id: postId,
      },
    };
  } catch (error) {
    console.error('Delete post error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Publish a draft post
 * 
 * @param postId - ID of post to publish
 * @returns Result with success status
 */
export async function publishPost(postId: string): Promise<CreatePostResult> {
  return updatePost(postId, { status: 'published' });
}

/**
 * Unpublish a post (set to draft)
 * 
 * @param postId - ID of post to unpublish
 * @returns Result with success status
 */
export async function unpublishPost(postId: string): Promise<CreatePostResult> {
  return updatePost(postId, { status: 'draft' });
}

// ---------------------------------------------------------------------------
// Draft save / submit for review / load for edit
// ---------------------------------------------------------------------------

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

async function assertWriterGates(
  user: CurrentUser,
  opts: { isPaid: boolean; userCategoryId?: string | null }
): Promise<CreatePostResult | null> {
  const gateStatus = await getProfileGateStatus(user.id);
  if (!gateStatus.basic_complete) {
    return {
      success: false,
      error: {
        code: 'PROFILE_INCOMPLETE',
        message: 'Please complete the 3-question onboarding profile first.',
      },
    };
  }
  if (isUpgradedRole(gateStatus.role) && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    return {
      success: false,
      error: {
        code: 'UPGRADE_PROFILE_INCOMPLETE',
        message: 'Please verify email and complete upgrade profile before using upgraded features.',
      },
    };
  }
  if (opts.isPaid && (!gateStatus.upgrade_complete || !user.email_confirmed_at)) {
    return {
      success: false,
      error: {
        code: 'PAID_PROFILE_REQUIRED',
        message: 'Paid content requires verified email and completed upgrade profile.',
      },
    };
  }
  if (opts.userCategoryId) {
    const isAuthorized = await isAuthorizedUser(user.id);
    if (!isAuthorized) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only authorized users can post to custom categories',
        },
      };
    }
    const supabase = await createServerSupabaseClient();
    const { data: userCategory } = await supabase
      .from('user_categories')
      .select('user_id')
      .eq('id', opts.userCategoryId)
      .single();
    const uc = userCategory as { user_id: string } | null;
    if (!uc || uc.user_id !== user.id) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'This category does not belong to you',
        },
      };
    }
  }
  return null;
}

export type AuthorEditablePost = {
  id: string;
  title: string;
  summary: string | null;
  content: PostContent;
  category_id: string | null;
  user_category_id: string | null;
  cover_image: string | null;
  is_paid: boolean;
  price: number;
  status: string;
  review_state: PostContent['review_state'] | null;
  review_reason: string | null;
};

export async function getPostForAuthorEdit(
  postId: string
): Promise<{ ok: true; post: AuthorEditablePost } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'You must be signed in.' };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, summary, content, category_id, user_category_id, cover_image, is_paid, price, author_id, status')
    .eq('id', postId)
    .single();

  if (error || !data) return { ok: false, error: 'Article not found.' };
  const row = data as Record<string, unknown>;
  if (row.author_id !== user.id) return { ok: false, error: 'You cannot edit this article.' };
  if (row.status === 'published') {
    return { ok: false, error: 'Published articles are edited elsewhere.' };
  }

  const pc = ((row.content as PostContent) || {}) as PostContent;

  return {
    ok: true,
    post: {
      id: row.id as string,
      title: row.title as string,
      summary: (row.summary as string | null) ?? null,
      content: pc,
      category_id: (row.category_id as string | null) ?? null,
      user_category_id: (row.user_category_id as string | null) ?? null,
      cover_image: (row.cover_image as string | null) ?? null,
      is_paid: Boolean(row.is_paid),
      price: Number(row.price ?? 0),
      status: String(row.status),
      review_state: pc.review_state ?? null,
      review_reason: pc.review_reason ?? null,
    },
  };
}

export async function savePublishDraft(input: SavePublishDraftInput): Promise<CreatePostResult> {
  try {
    const validation = validateSaveDraftInput(input);
    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: validation.error },
      };
    }
    const d = validation.data;
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be logged in to save drafts.' },
      };
    }

    const gate = await assertWriterGates(user, {
      isPaid: d.is_paid || false,
      userCategoryId: d.user_category_id || null,
    });
    if (gate) return gate;

    const titleForDb = d.title.trim() || 'Untitled';
    const supabase = await createServerSupabaseClient();
    let coverUrl: string | null = null;
    if (d.cover_image instanceof File) {
      const uploadResult = await uploadCoverImage(d.cover_image, user.id);
      if (uploadResult.error) {
        return {
          success: false,
          error: { code: 'UPLOAD_ERROR', message: `Failed to upload cover image: ${uploadResult.error}` },
        };
      }
      coverUrl = uploadResult.url;
    } else if (typeof d.cover_image === 'string') {
      coverUrl = d.cover_image;
    }

    const postId = input.post_id?.trim() || null;

    if (postId) {
      const { data: existing, error: fetchErr } = await supabase
        .from('posts')
        .select('author_id, content, cover_image')
        .eq('id', postId)
        .single();

      if (fetchErr || !existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Draft not found.' } };
      }
      const ex = existing as { author_id: string; content: unknown; cover_image: string | null };
      if (ex.author_id !== user.id) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'You cannot update this draft.' } };
      }

      const prev = (ex.content || {}) as PostContent;
      if (prev.review_state === 'pending') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'This article is awaiting review and cannot be edited until the review finishes.',
          },
        };
      }
      const nextContent: PostContent = { ...prev, ...d.content };
      let nextCover = ex.cover_image;
      if (coverUrl !== null) nextCover = coverUrl;

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: titleForDb,
          content: nextContent,
          summary: d.summary?.trim() || null,
          category_id: d.category_id || null,
          user_category_id: d.user_category_id || null,
          is_paid: d.is_paid || false,
          price: d.price || 0,
          status: 'draft',
          cover_image: nextCover,
        } as PostUpdate & { user_category_id?: string | null })
        .eq('id', postId);

      if (updateError) {
        console.error('savePublishDraft update', updateError);
        return {
          success: false,
          error: { code: 'DATABASE_ERROR', message: 'Failed to save draft.', details: updateError.message },
        };
      }

      revalidatePath('/profile/drafts');
      revalidatePath('/admin/review');
      return { success: true, data: { post_id: postId, cover_url: coverUrl || undefined } };
    }

    const postData = {
      title: titleForDb,
      content: d.content as PostContent,
      summary: d.summary?.trim() || null,
      cover_image: coverUrl,
      category_id: d.category_id || null,
      user_category_id: d.user_category_id || null,
      author_id: user.id,
      is_paid: d.is_paid || false,
      price: d.price || 0,
      status: 'draft' as const,
    } as PostInsert & { user_category_id?: string | null };

    const { data: post, error: insertError } = await supabase.from('posts').insert(postData).select('id').single();

    if (insertError || !post) {
      console.error('savePublishDraft insert', insertError);
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to create draft.', details: insertError?.message },
      };
    }

    const newId = (post as { id: string }).id;
    revalidatePath('/profile/drafts');
    return { success: true, data: { post_id: newId, cover_url: coverUrl || undefined } };
  } catch (e) {
    console.error('savePublishDraft', e);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: e instanceof Error ? e.message : 'Unexpected error',
      },
    };
  }
}

export async function submitPostForReview(input: SubmitPostForReviewInput): Promise<CreatePostResult> {
  const postId = input.post_id?.trim() || null;

  if (!postId) {
    const content = { ...input.content, review_state: 'pending' as const, review_reason: null };
    return createPost({
      ...input,
      status: 'draft',
      content,
    });
  }

  const validation = validatePostInput({ ...input, status: 'draft' });
  if (!validation.valid) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } };
  }
  const v = validation.data;

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in.' } };
  }

  const gate = await assertWriterGates(user, {
    isPaid: v.is_paid || false,
    userCategoryId: v.user_category_id || null,
  });
  if (gate) return gate;

  const supabase = await createServerSupabaseClient();
  const { data: row, error: fetchErr } = await supabase
    .from('posts')
    .select('author_id, content, cover_image')
    .eq('id', postId)
    .single();

  if (fetchErr || !row) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Draft not found.' } };
  }
  const existing = row as { author_id: string; content: unknown; cover_image: string | null };
  if (existing.author_id !== user.id) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You cannot submit this article.' } };
  }

  const prev = (existing.content || {}) as PostContent;
  if (prev.review_state === 'pending') {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'This article is already waiting for review.' },
    };
  }

  let coverUrl: string | null = existing.cover_image;
  if (v.cover_image instanceof File) {
    const uploadResult = await uploadCoverImage(v.cover_image, user.id);
    if (uploadResult.error) {
      return {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: `Failed to upload cover image: ${uploadResult.error}` },
      };
    }
    coverUrl = uploadResult.url;
  } else if (typeof v.cover_image === 'string') {
    coverUrl = v.cover_image;
  }

  const mergedContent: PostContent = {
    ...prev,
    ...v.content,
    review_state: 'pending',
    review_reason: null,
  };

  const { error: updateError } = await supabase
    .from('posts')
    .update({
      title: v.title.trim(),
      content: mergedContent,
      summary: v.summary?.trim() || null,
      category_id: v.category_id || null,
      user_category_id: v.user_category_id || null,
      is_paid: v.is_paid || false,
      price: v.price || 0,
      status: 'draft',
      cover_image: coverUrl,
    } as PostUpdate & { user_category_id?: string | null })
    .eq('id', postId);

  if (updateError) {
    console.error('submitPostForReview', updateError);
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to submit for review.', details: updateError.message },
    };
  }

  void queueReviewSubmissionEmails(supabase, user.id, user.email, v.title.trim(), postId);
  revalidatePath('/profile/drafts');
  revalidatePath('/admin/review');
  return { success: true, data: { post_id: postId, cover_url: coverUrl || undefined } };
}

async function getUserRole(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  // Role mapping if needed, e.g., 'admin' -> 100
  if (data?.role === 'admin') return 100;
  return 0;
}

/**
 * Admin action to update a post (content, title, status)
 */
export async function adminUpdatePost(postId: string, data: PostUpdate): Promise<CreatePostResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } };

  // Permission check
  const isAuthorized = await isAuthorizedUser(user.id);
  const roleLevel = await getUserRole(user.id);
  if (!isAuthorized && roleLevel < 80) { // Assuming 80+ is admin
    return { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('posts')
    .update(data)
    .eq('id', postId);

  if (error) {
    console.error('Admin update error:', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  revalidatePath('/admin/review');
  revalidatePath(`/posts/${postId}`);
  revalidatePath('/');
  return { success: true, data: { post_id: postId } };
}
