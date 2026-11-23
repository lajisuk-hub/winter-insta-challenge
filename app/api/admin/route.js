// 관리자: 참여자 목록 보기 / 참여자 삭제
import { readAllParticipants, removeParticipant, checkAdmin, phoneDigits, readJson, writeJson, pPath } from '../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const b = await req.json();
    if (!checkAdmin(b.pw)) return Response.json({ error: '관리자 비밀번호가 맞지 않아요.' }, { status: 401 });
    if (b.del) {
      await removeParticipant(phoneDigits(b.del));
      return Response.json({ ok: true });
    }
    if (b.block) {
      const digits = phoneDigits(b.block);
      const rec = await readJson(pPath(digits));
      if (!rec) return Response.json({ error: '참여자를 찾지 못했어요.' }, { status: 404 });
      const next = { ...rec, blocked: !!b.blocked, blockedAt: b.blocked ? new Date().toISOString() : null };
      if (b.blocked) next.subs = []; // 차단하면 알림도 끊는다
      await writeJson(pPath(digits), next);
      return Response.json({ ok: true });
    }
    if (b.checkOnly) return Response.json({ ok: true });
    const people = await readAllParticipants();
    return Response.json({
      ok: true,
      people: people
        .map((p) => ({ name: p.name, phone: p.phone, createdAt: p.createdAt, lastSeen: p.lastSeen || p.createdAt, blocked: !!p.blocked, done: p.done || {}, push: (p.subs || []).length }))
        .sort((a, c) => String(a.createdAt).localeCompare(String(c.createdAt))),
    });
  } catch (err) {
    return Response.json({ error: '불러오지 못했어요: ' + String(err?.message || err).slice(0, 100) }, { status: 500 });
  }
}
