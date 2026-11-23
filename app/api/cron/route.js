// 자동 알림 (Vercel이 매일 두 번 부른다)
// 아침 8시: 오늘 일정·숙제 안내 / 저녁 8시: 오늘 숙제를 아직 안 한 분께만 다시 알림
import { readAllParticipants, writeJson, pPath, readSchedule } from '../../lib/store';
import { pushToPeople } from '../../lib/push';
import { kstToday, inRange, hasHomework, missedDays } from '../../lib/dates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function short(t, n = 60) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const slot = new URL(req.url).searchParams.get('slot') === 'evening' ? 'evening' : 'morning';
  const today = kstToday();
  if (!inRange(today)) return Response.json({ ok: true, skipped: 'out of range', today });

  const s = await readSchedule();
  const day = s.days?.[today];
  const people = (await readAllParticipants()).filter((p) => !p.blocked);
  const writeBack = (rec) => writeJson(pPath(rec.phone), rec);

  let r;
  if (slot === 'morning') {
    if (!day || (!day.event && !hasHomework(day) && !(day.videos || []).length)) return Response.json({ ok: true, skipped: 'nothing today', today });
    let body = '새 녹화본 영상이 올라왔어요.';
    if (hasHomework(day)) body = `오늘의 숙제: ${short(day.homework)}`;
    else if (day.event) body = `오늘 일정: ${short(day.event)}`;
    r = await pushToPeople(people, () => ({ title: `☀️ ${s.title}`, body, url: '/?d=' + today, tag: 'morning-' + today }), writeBack);
  } else {
    if (!hasHomework(day)) return Response.json({ ok: true, skipped: 'no homework today', today });
    r = await pushToPeople(people, (rec) => {
      const done = rec.done || {};
      if (done[today]) return null;
      const missed = missedDays(s, done, today).length;
      return {
        title: `🌙 ${rec.name} 님, 오늘 숙제 아직이에요`,
        body: missed > 1 ? `오늘 숙제를 포함해 안 한 숙제가 ${missed}개 있어요. 눌러서 확인해 보세요.` : `오늘의 숙제: ${short(day.homework)}`,
        url: '/?d=' + today,
        tag: 'evening-' + today,
      };
    }, writeBack);
  }
  return Response.json({ ok: true, slot, today, ...r });
}
