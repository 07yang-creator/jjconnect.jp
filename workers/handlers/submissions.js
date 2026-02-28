/**
 * Submission route handlers: submit, get submissions, update submission
 */

import { jsonResponse, errorResponse } from '../lib/http.js';
import { extractToken, verifyToken } from '../lib/auth.js';
import { submitFormSchema, updateSubmissionSchema, getSubmissionsQuerySchema } from '../lib/schemas.js';
import { sendSubmissionNotification } from '../lib/email.js';
import { uploadToR2, getFileUrl } from '../lib/storage.js';

/** @param {Request} request @param {object} env @param {object} data @param {FormData} formData */
export async function handleSubmit(request, env, data, formData) {
  try {
    const { name, email, relation_type, content } = data;
    const mediaFile = formData.get('media');

    let mediaKey = null;
    let mediaFilename = null;
    let mediaSize = null;
    let mediaType = null;

    if (mediaFile && mediaFile instanceof File) {
      const uploadResult = await uploadToR2(mediaFile, env);
      if (!uploadResult.success) {
        return errorResponse(`文件上传失败: ${uploadResult.error}`, 400);
      }
      mediaKey = uploadResult.key;
      mediaFilename = uploadResult.filename;
      mediaSize = uploadResult.size;
      mediaType = uploadResult.type;
    }

    const token = extractToken(request);
    let userId = null;
    if (token) {
      try {
        const payload = verifyToken(token, env);
        if (payload?.userId) userId = payload.userId;
      } catch {
        /* anonymous submission */
      }
    }

    if (!env.DB) return errorResponse('数据库绑定 (env.DB) 不存在', 500);

    let insertResult;
    try {
      insertResult = await env.DB.prepare(
        `INSERT INTO submissions 
         (user_id, user_name, user_email, relation_type, content, 
          media_key, media_filename, media_size, media_type, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          userId,
          name,
          email,
          relation_type || null,
          content || null,
          mediaKey,
          mediaFilename,
          mediaSize,
          mediaType,
          'pending'
        )
        .run();
    } catch (dbError) {
      if (dbError.message?.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}`, 500);
      }
      if (dbError.message?.includes('no such column')) {
        return errorResponse(`数据库字段不存在: ${dbError.message}`, 500);
      }
      return errorResponse(`数据库插入失败: ${dbError.message}`, 500);
    }

    if (!insertResult?.success) {
      return errorResponse(`提交失败: ${insertResult?.error || 'unknown'}`, 500);
    }

    const submissionId = insertResult.meta.last_row_id;

    try {
      const emailResult = await sendSubmissionNotification({
        user_name: name,
        user_email: email,
        relation_type: relation_type,
        content: content,
        media_url: mediaKey ? getFileUrl(mediaKey) : null,
        media_filename: mediaFilename,
      });
      if (!emailResult.success) {
        console.error('⚠️ Failed to send notification email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('⚠️ Email notification error:', emailError);
    }

    return jsonResponse(
      {
        success: true,
        message: '提交成功!已发送至 support@jjconnect.jp 并存入后台',
        submission_id: submissionId,
        media_uploaded: !!mediaKey,
      },
      201
    );
  } catch (error) {
    console.error('Submission error:', error);
    return errorResponse(`提交失败: ${error.message}`, 500);
  }
}

/** @param {Request} request @param {object} env @param {{ status?: string; limit: number }} data */
export async function handleGetSubmissions(request, env, data) {
  try {
    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      return errorResponse(`Token 验证失败: ${tokenError.message}`, 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);
    if (payload.role < 2)
      return errorResponse('权限不足:只有管理员可以查看提交记录', 403);

    const { status, limit } = data;

    let query = 'SELECT * FROM submissions';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    let results;
    try {
      const queryResult = await env.DB.prepare(query).bind(...params).all();
      results = queryResult.results;
    } catch (dbError) {
      if (dbError.message?.includes('no such table')) {
        return errorResponse(`数据库表不存在: ${dbError.message}`, 500);
      }
      return errorResponse(`数据库查询失败: ${dbError.message}`, 500);
    }

    return jsonResponse({
      success: true,
      submissions: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    return errorResponse(`获取提交记录失败: ${error.message}`, 500);
  }
}

/** @param {Request} request @param {object} env @param {{ status?: string; notes?: string }} body */
export async function handleUpdateSubmission(request, env, body) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const submissionId = pathParts[pathParts.length - 1];

    if (!submissionId || isNaN(parseInt(submissionId))) {
      return errorResponse('无效的提交 ID', 400);
    }

    const token = extractToken(request);
    if (!token) return errorResponse('需要登录', 401);

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (tokenError) {
      return errorResponse(`Token 验证失败: ${tokenError.message}`, 401);
    }
    if (!payload) return errorResponse('Token 无效或已过期', 401);
    if (payload.role < 2)
      return errorResponse('权限不足:只有管理员可以更新提交状态', 403);

    const { status, notes } = body;

    const updateFields = [];
    const params = [];

    if (status) {
      updateFields.push('status = ?');
      params.push(status);
      if (status === 'reviewed' || status === 'resolved') {
        updateFields.push('reviewed_at = ?');
        params.push(new Date().toISOString());
        updateFields.push('reviewed_by = ?');
        params.push(payload.userId);
      }
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }

    if (updateFields.length === 0) return errorResponse('没有提供要更新的字段', 400);

    params.push(submissionId);

    const updateQuery = `UPDATE submissions SET ${updateFields.join(', ')} WHERE id = ?`;
    let updateResult;
    try {
      updateResult = await env.DB.prepare(updateQuery).bind(...params).run();
    } catch (dbError) {
      return errorResponse(`数据库更新失败: ${dbError.message}`, 500);
    }

    if (!updateResult?.success) return errorResponse('更新失败', 500);
    if (updateResult.meta.changes === 0) return errorResponse('提交记录不存在', 404);

    return jsonResponse({
      success: true,
      message: '提交状态已更新',
      submission_id: parseInt(submissionId),
      updated_by: payload.userId,
    });
  } catch (error) {
    console.error('Update submission error:', error);
    return errorResponse(`更新提交失败: ${error.message}`, 500);
  }
}
