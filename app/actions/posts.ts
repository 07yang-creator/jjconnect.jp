'use server';

/**
 * Server Actions for Post Management
 * Handles creating, updating, and publishing posts
 */

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, getCurrentUser, isAuthorizedUser } from '@/lib/supabase/server';
import type { PostInsert, PostContent } from '@/types/database';
import { createPostSchema, parseSafe, type CreatePostInput as SchemaCreatePostInput } from '@/lib/schemas';
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

export interface CreatePostResult {
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
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
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
  if (parsed.success) return { valid: true, data: parsed.data };
  const firstIssue = parsed.error.issues[0];
  const msg = firstIssue?.message || 'Invalid post input';
  return { valid: false, error: msg };
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
      
      if (!userCategory || userCategory.user_id !== user.id) {
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
    const postData: PostInsert = {
      title: validatedInput.title.trim(),
      content: validatedInput.content,
      summary: validatedInput.summary?.trim() || null,
      cover_image: coverUrl,
      category_id: validatedInput.category_id || null,
      author_id: user.id,
      is_paid: validatedInput.is_paid || false,
      price: validatedInput.price || 0,
      status: validatedInput.status || 'draft',
    };
    
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

    // 6b. If submitted for review (review_state === 'pending'), send emails
    const contentWithReview = validatedInput.content as Record<string, unknown> | undefined;
    if (contentWithReview?.review_state === 'pending' && user.email) {
      const authorEmail = user.email;
      let authorDisplayName: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        authorDisplayName = profile?.display_name ?? null;
      } catch {
        // ignore
      }
      const reviewPayload = {
        postTitle: validatedInput.title.trim(),
        authorEmail,
        postId: post.id,
        authorDisplayName,
      };
      Promise.all([
        sendPostSubmittedConfirmationToAuthor(authorEmail),
        sendPostSubmittedNotificationToAdmin(reviewPayload),
      ]).then(([userResult, adminResult]) => {
        if (!userResult.success) console.error('Review confirmation email failed:', userResult.error);
        if (!adminResult.success) console.error('Review notification to admin failed:', adminResult.error);
      }).catch((err) => console.error('Review emails error:', err));
    }

    // 7. Revalidate relevant paths
    revalidatePath('/posts');
    revalidatePath(`/profile/${user.id}`);
    if (validatedInput.category_id) {
      revalidatePath(`/category/${validatedInput.category_id}`);
    }
    
    // 8. Return success
    return {
      success: true,
      data: {
        post_id: post.id,
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
    const updateData: any = {};
    if (input.title) updateData.title = input.title.trim();
    if (input.content) updateData.content = input.content;
    if (input.summary !== undefined) updateData.summary = input.summary?.trim() || null;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
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
    revalidatePath(`/posts/${postId}`);
    revalidatePath(`/profile/${user.id}`);
    
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
        const path = existingPost.cover_image.split('/covers/')[1];
        if (path) {
          await supabase.storage.from('covers').remove([path]);
        }
      } catch (error) {
        console.error('Failed to delete cover image:', error);
        // Continue with post deletion even if image deletion fails
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
