// 보관함(Vercel Blob) 읽기·쓰기 도우미 — 서버에서만 쓴다.
//
// ⚠ 같은 이름으로 덮어쓰면 보관함 앞단(CDN)이 1분 넘게 예전 내용을 돌려준다(주소 뒤에 ?t= 를 붙여도 소용없음).
//    그래서 저장할 때마다 「시각이 들어간 새 파일」로 쓰고, 읽을 때는 목록에서 가장 최신 파일을 고른다.
//    최근 6개는 남겨 두어 사고가 나도 되돌릴 수 있게 한다(그보다 오래된 것은 지움).
// 내 컴퓨터에서 시험할 때는 DATA_PREFIX(dev/)를 붙여 진짜 자료와 섞이지 않게 한다.
import { put, list, del } from '@vercel/blob';

const PREFIX = process.env.DATA_PREFIX || '';
const KEEP = 6;

export const phoneDigits = (p) => String(p || '').replace(/\D/g, '');
export const pPath = (digits) => `p/${digits}`;
export const SCHEDULE_PATH = 'config/schedule';

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

// 파일 이름(시각) 순으로 최신이 앞에 오게
const newestFirst = (a, b) => (a.pathname < b.pathname ? 1 : -1);

// 가장 최신 파일부터 읽어 보고, 막 올라가 아직 안 읽히면 그 앞 것을 읽는다
async function readNewest(versions) {
  for (const v of versions.slice(0, 3)) {
    const rec = await fetchJson(v.url);
    if (rec) return rec;
  }
  return null;
}

export async function readJson(key) {
  const versions = (await listAll(`${PREFIX}${key}/`)).sort(newestFirst);
  if (!versions.length) return null;
  return readNewest(versions);
}

export async function writeJson(key, obj) {
  const stamp = String(Date.now()).padStart(14, '0') + '-' + Math.random().toString(36).slice(2, 6);
  await put(`${PREFIX}${key}/${stamp}.json`, JSON.stringify(obj), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  try {
    const versions = (await listAll(`${PREFIX}${key}/`)).sort(newestFirst);
    const old = versions.slice(KEEP).map((v) => v.url);
    if (old.length) await del(old);
  } catch (err) { /* 정리는 다음 저장 때 다시 */ }
}

// 참여자 전체 읽기 (관리자 화면·자동 알림에서만)
export async function readAllParticipants() {
  const blobs = await listAll(`${PREFIX}p/`);
  const groups = new Map();
  for (const b of blobs) {
    const folder = b.pathname.slice(0, b.pathname.lastIndexOf('/'));
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(b);
  }
  const lists = [...groups.values()].map((v) => v.sort(newestFirst));
  const out = [];
  for (let i = 0; i < lists.length; i += 20) {
    const part = await Promise.all(lists.slice(i, i + 20).map(readNewest));
    out.push(...part.filter(Boolean));
  }
  return out;
}

export async function removeParticipant(digits) {
  if (!digits) return;
  const blobs = await listAll(`${PREFIX}${pPath(digits)}/`);
  if (blobs.length) await del(blobs.map((b) => b.url));
}

export async function readSchedule() {
  const s = await readJson(SCHEDULE_PATH);
  return {
    title: '인스타그램 챌린지',
    intro: '12월 1일부터 1월 31일까지, 매일 조금씩 함께해요!',
    days: {},
    refs: [],
    ...(s || {}),
  };
}

// 화면에 보낼 참여자 정보(알림 주소는 빼고)
export function publicRec(rec) {
  return { name: rec.name, phone: rec.phone, done: rec.done || {}, push: (rec.subs || []).length > 0 };
}

export function checkAdmin(pw) {
  const real = process.env.ADMIN_PASSWORD;
  return !!real && String(pw || '') === real;
}

// 이름 비교는 띄어쓰기 무시
export const sameName = (a, b) => String(a || '').replace(/\s/g, '') === String(b || '').replace(/\s/g, '');
