import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request) {
  const { env } = getRequestContext();
  const req_url = new URL(request.url);
  const Referer = request.headers.get('Referer') || "Referer";
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.socket.remoteAddress;
  const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    // 生成带时间戳的文件名
    const timestamp = Date.now(); // 当前时间戳
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'unknown'; // 处理无扩展名情况
    const filename = `${timestamp}.${extension}`; // 使用时间戳作为文件名

    // 上传到 R2
    const object = await env.IMGRS.put(filename, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    if (!object) {
      console.error('Failed to upload file to R2');
      return new Response('Failed to upload file to R2', { status: 500 });
    }

    // 返回带时间戳的文件链接
    const data = {
      url: `${req_url.origin}/api/rfile/${filename}`,
      code: 200,
      name: filename,
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders || {}, // 确保 corsHeaders 已定义
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response('Internal Server Error', { status: 500 });
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
