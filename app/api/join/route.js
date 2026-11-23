// 참여자 입장: 이름+전화번호로 들어오면 기록을 만들거나 불러온다.
import { readJson, writeJson, pPath, phoneDigits, publicRec, sameName } from '../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkPhone(digits) {
  if (!/^0\d{8,10}$/.test(digits)) return '전화번호를 다시 확인해 주세요. (예: 010-1234-5678)';
  if (digits.startsWith('010') && digits.length !== 11) return '010 번호는 숫자 11자리예요. 한 자리가 빠지거나 더 들어갔는지 확인해 주세요.';
  return '';
}

function mask(name) {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

export async function POST(req) {
  try {
    const b = await req.json();
    const name = String(b.name || '').trim().slice(0, 30);
    const digits = phoneDigits(b.phone);
    if (!name) return Response.json({ error: '이름을 적어 주세요.' }, { status: 400 });
    const bad = checkPhone(digits);
    if (bad) return Response.json({ error: bad }, { status: 400 });

    let rec = await readJson(pPath(digits));
    if (rec) {
      if (!sameName(rec.name, name)) {
        return Response.json({ error: `이 전화번호는 「${mask(rec.name)}」 님 이름으로 이미 등록되어 있어요. 처음 입장할 때 적은 이름 그대로 적어 주세요.` }, { status: 409 });
      }
      return Response.json({ ok: true, me: publicRec(rec) });
    }
    rec = { name, phone: digits, createdAt: new Date().toISOString(), done: {}, subs: [] };
    await writeJson(pPath(digits), rec);
    return Response.json({ ok: true, me: publicRec(rec), created: true });
  } catch (err) {
    return Response.json({ error: '잠시 후 다시 시도해 주세요. (' + String(err?.message || err).slice(0, 80) + ')' }, { status: 500 });
  }
}
