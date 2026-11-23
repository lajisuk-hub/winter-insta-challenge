// 일정·숙제·녹화본: 누구나 읽고, 관리자만 저장
import { readSchedule, writeJson, SCHEDULE_PATH, checkAdmin } from '../../lib/store';
import { inRange } from '../../lib/dates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await readSchedule();
  return Response.json(s, { headers: { 'Cache-Control': 'no-store' } });
}

function clean(s) {
  const days = {};
  for (const [d, v] of Object.entries(s?.days || {})) {
    if (!inRange(d) || !v) continue;
    const day = {
      event: String(v.event || '').slice(0, 300),
      homework: String(v.homework || '').slice(0, 3000),
      notice: String(v.notice || '').slice(0, 3000),
      videos: (Array.isArray(v.videos) ? v.videos : [])
        .map((x) => ({ title: String(x?.title || '').slice(0, 100), url: String(x?.url || '').trim().slice(0, 1000) }))
        .filter((x) => x.url)
        .slice(0, 10),
    };
    if (day.event || day.homework || day.notice || day.videos.length) days[d] = day;
  }
  return {
    title: String(s?.title || '인스타그램 챌린지').slice(0, 60),
    intro: String(s?.intro || '').slice(0, 1000),
    days,
    savedAt: new Date().toISOString(),
  };
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (!checkAdmin(b.pw)) return Response.json({ error: '관리자 비밀번호가 맞지 않아요.' }, { status: 401 });
    const s = clean(b.schedule);
    await writeJson(SCHEDULE_PATH, s);
    return Response.json({ ok: true, schedule: s });
  } catch (err) {
    return Response.json({ error: '저장하지 못했어요: ' + String(err?.message || err).slice(0, 100) }, { status: 500 });
  }
}
