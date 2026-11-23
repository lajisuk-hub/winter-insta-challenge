// 관리자가 지금 바로 알림 보내기 (전체 / 오늘 숙제 안 한 분만)
import { readAllParticipants, writeJson, pPath, checkAdmin, readSchedule } from '../../lib/store';
import { pushToPeople } from '../../lib/push';
import { kstToday } from '../../lib/dates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const b = await req.json();
    if (!checkAdmin(b.pw)) return Response.json({ error: '관리자 비밀번호가 맞지 않아요.' }, { status: 401 });
    const title = String(b.title || '').trim().slice(0, 60);
    const body = String(b.body || '').trim().slice(0, 200);
    if (!title && !body) return Response.json({ error: '알림 내용을 적어 주세요.' }, { status: 400 });
    const s = await readSchedule();
    const today = kstToday();
    let people = await readAllParticipants();
    if (b.target === 'notDoneToday') people = people.filter((p) => !(p.done || {})[today]);
    const r = await pushToPeople(
      people,
      () => ({ title: title || s.title, body, url: '/', tag: 'admin-' + Date.now() }),
      (rec) => writeJson(pPath(rec.phone), rec),
    );
    const withPush = people.filter((p) => (p.subs || []).length).length;
    return Response.json({ ok: true, ...r, targets: people.length, withPush });
  } catch (err) {
    return Response.json({ error: '보내지 못했어요: ' + String(err?.message || err).slice(0, 100) }, { status: 500 });
  }
}
