/**
 * R2 file storage utilities for JJConnect Worker
 */

import { errorResponse } from './http.js';

/**
 * Generate unique file key for R2 storage
 * Format: YYYY/MM/DD/timestamp-randomId.ext
 */
export function generateFileKey(filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);

  const ext = filename.split('.').pop().toLowerCase();

  return `${year}/${month}/${day}/${timestamp}-${randomId}.${ext}`;
}

/**
 * Generate avatar file key: avatars/userId/timestamp-random.ext
 */
export function generateAvatarKey(userId, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `avatars/${userId}/${Date.now()}-${randomId}.${ext}`;
}

export const AVATAR_MAX_SIZE = 500 * 1024; // 500KB
export const AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate file type (images and videos only)
 */
export function isValidFileType(mimeType) {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/3gpp',
  ];

  return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Upload file to R2 storage
 * @param {File} file - The file object from form-data
 * @param {Env} env - Worker environment with MY_BUCKET binding
 * @returns {Promise<object>} - { success, key, filename, size, type } or { success: false, error }
 */
export async function uploadToR2(file, env) {
  try {
    if (!env.MY_BUCKET) {
      throw new Error('R2 bucket (MY_BUCKET) not configured in wrangler.toml');
    }

    if (!isValidFileType(file.type)) {
      throw new Error(`不支持的文件类型: ${file.type}。仅支持图片和视频文件。`);
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大允许 50MB。`);
    }

    const key = generateFileKey(file.name);

    await env.MY_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalFilename: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`✓ File uploaded to R2: ${key} (${(file.size / 1024).toFixed(2)} KB)`);

    return {
      success: true,
      key,
      filename: file.name,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get file URL from R2
 * Note: In production, configure R2 public access or use signed URLs
 */
export function getFileUrl(key) {
  return `/api/files/${key}`;
}

/**
 * Serve file from R2
 * GET /api/files/:key
 */
export async function handleGetFile(request, env) {
  try {
    const url = new URL(request.url);
    const key = url.pathname.replace('/api/files/', '');

    if (!key) {
      return errorResponse('文件 Key 不能为空', 400);
    }

    const object = await env.MY_BUCKET.get(key);

    if (!object) {
      return errorResponse('文件不存在', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Get file error:', error);
    return errorResponse(`获取文件失败: ${error.message}`, 500);
  }
}
