// 숙제 완료 표시(또는 취소) + 인스타 게시물 주소 저장
import { BLOCKED_MSG, readJson, writeJson, pPath, phoneDigits, publicRec, sameName } from '../../lib/store';
import { inRange } from '../../lib/dates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const b = await req.json();
    const digits = phoneDigits(b.phone);
    const rec = await readJson(pPath(digits));
    if (!rec || !sameName(rec.name, b.name)) return Response.json({ error: '참여자 정보를 찾지 못했어요. 다시 입장해 주세요.' }, { status: 404 });
    if (rec.blocked) return Response.json({ error: BLOCKED_MSG, blocked: true }, { status: 403 });
    if (!inRange(String(b.date || ''))) return Response.json({ error: '챌린지 기간이 아니에요.' }, { status: 400 });

    // 막 저장한 내용이 보관함에서 늦게 보일 수 있어, 화면이 알고 있는 완료 목록도 함께 합친다
    const done = { ...(rec.done || {}) };
    if (b.known && typeof b.known === 'object') {
      for (const [d, v] of Object.entries(b.known)) if (inRange(d) && v && !done[d]) done[d] = v;
    }
    if (b.done) {
      done[b.date] = { at: new Date().toISOString(), link: String(b.link || '').trim().slice(0, 500) };
    } else {
      delete done[b.date];
    }
    const next = { ...rec, done };
    await writeJson(pPath(digits), next);
    return Response.json({ ok: true, me: publicRec(next) });
  } catch (err) {
    return Response.json({ error: '저장하지 못했어요. 잠시 후 다시 눌러 주세요.' }, { status: 500 });
  }
}
