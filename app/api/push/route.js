// 참여자가 「알림 켜기」를 누르면 이 기기를 등록한다. test:true면 시험 알림도 보낸다.
import { BLOCKED_MSG, readJson, writeJson, pPath, phoneDigits, sameName } from '../../lib/store';
import { okSub, mergeSubs, sendPush } from '../../lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const b = await req.json();
    if (!okSub(b.sub)) return Response.json({ error: '알림 정보가 올바르지 않아요.' }, { status: 400 });
    const digits = phoneDigits(b.phone);
    const rec = await readJson(pPath(digits));
    if (!rec || !sameName(rec.name, b.name)) return Response.json({ error: '참여자 정보를 찾지 못했어요. 다시 입장해 주세요.' }, { status: 404 });
    if (rec.blocked) return Response.json({ error: BLOCKED_MSG, blocked: true }, { status: 403 });
    const subs = mergeSubs(rec.subs || [], [b.sub]);
    // 화면이 알고 있는 완료 목록도 합쳐 저장(막 저장한 완료 표시가 지워지지 않게)
    const known = b.known && typeof b.known === 'object' ? b.known : {};
    const done = { ...known, ...(rec.done || {}) };
    await writeJson(pPath(digits), { ...rec, done, subs });
    let sent = 0;
    if (b.test) {
      const r = await sendPush([b.sub], {
        title: '🔔 알림이 켜졌어요',
        body: `${rec.name} 님, 매일 아침 오늘의 숙제와 저녁에 안 한 숙제를 알려 드릴게요.`,
        url: '/',
        tag: 'challenge-test',
      });
      sent = r.sent;
    }
    return Response.json({ ok: true, sent });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
