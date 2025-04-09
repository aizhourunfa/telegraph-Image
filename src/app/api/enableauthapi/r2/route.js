import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

export async function POST(request) {
  const { env } = getRequestContext();
  const req_url = new URL(request.url);
  const Referer = request.headers.get('Referer') || "Referer";
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.socket?.remoteAddress;
  const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file.name !== 'string') {
      return new Response('No file uploaded', { status: 400 });
    }

    // 生成格式为 YYYYMMDDHHMMSS 的时间戳作为文件名
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    // 获取扩展名
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const filename = `${timestamp}.${ext}`;

    // 上传到 R2
    const object = await env.IMGRS.put(filename, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    if (!object) {
      return Response.json({
        status: 500,
        message: 'Failed to upload file to R2',
        success: false,
      }, { status: 500 });
    }

    // 返回带时间戳的文件链接
    const data = {
      url: `${req_url.origin}/api/rfile/${filename}`,
      code: 200,
      name: filename,
    };

    return Response.json(data, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
