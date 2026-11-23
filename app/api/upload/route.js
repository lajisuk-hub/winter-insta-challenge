// 녹화본 영상 파일 올리기 창구 — 파일은 브라우저에서 보관함으로 곧장 올라간다(서버를 거치지 않음).
import { handleUpload } from '@vercel/blob/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!process.env.ADMIN_PASSWORD || clientPayload !== process.env.ADMIN_PASSWORD) throw new Error('올릴 권한이 없어요.');
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'],
          maximumSizeInBytes: 3 * 1024 * 1024 * 1024, // 한 파일 3GB까지
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
