import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request) {
  const { env, cf, ctx } = getRequestContext();
  const req_url = new URL(request.url);
  const Referer = request.headers.get('Referer') || "Referer";
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.socket.remoteAddress;
  const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Content-Type': 'application/json',
  };

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    // 生成带时间戳的文件名
    const originalFileName = file.name || 'image';
    const timestamp = Date.now(); // 当前时间戳
    const extension = originalFileName.split('.').pop(); // 获取文件扩展名
    const filename = `${originalFileName.split('.')[0]}_${timestamp}.${extension}`; // 拼接新文件名

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
    return Response.json({
      status: 500,
      message: error.message,
      success: false,
    }, { status: 500 });
  }
}

async function insertImageData(env, src, referer, ip, rating, time) {
  try {
    const instdata = await env.prepare(
      `INSERT INTO imginfo (url, referer, ip, rating, total, time)
           VALUES ('${src}', '${referer}', '${ip}', ${rating}, 1, '${time}')`
    ).run();
  } catch (error) {

  }
}

async function get_nowTime() {
  const options = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const timedata = new Date();
  const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);

  return formattedDate;
}

async function getRating(env, url) {
  try {
    const apikey = env.ModerateContentApiKey;
    const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : "";

    const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;

    if (ratingApi) {
      const res = await fetch(`${ratingApi}url=${url}`);
      const data = await res.json();
      const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;

      return rating_index;
    } else {
      return 0;
    }
  } catch (error) {
    return error;
  }
}
