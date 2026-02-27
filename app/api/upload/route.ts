import { NextResponse } from 'next/server';

/**
 * Mock 图片上传接口
 *
 * 前端会以 multipart/form-data 方式提交：
 * - file: File
 *
 * 这里暂时不做真实存储，只返回一个模拟的 CDN URL。
 * 后续可以接入实际的云存储（如 R2 / S3 / Supabase Storage）。
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  // 模拟生成一个图片地址
  const fileName = file?.name || 'image';
  const mockUrl = `https://cdn.example.com/uploads/${Date.now()}-${encodeURIComponent(
    fileName,
  )}`;

  return NextResponse.json(
    {
      url: mockUrl,
    },
    {
      status: 200,
    },
  );
}

