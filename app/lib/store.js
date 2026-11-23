// 보관함(Vercel Blob) 읽기·쓰기 도우미 — 서버에서만 쓴다.
// 내 컴퓨터에서 시험할 때는 DATA_PREFIX(dev/)를 붙여 진짜 자료와 섞이지 않게 한다.
import { put, head, list, del } from '@vercel/blob';

const PREFIX = process.env.DATA_PREFIX || '';
let blobOrigin = '';

export const phoneDigits = (p) => String(p || '').replace(/\D/g, '');
export const pPath = (digits) => `p/${digits}.json`;
export const SCHEDULE_PATH = 'config/schedule.json';

async function fetchJson(url) {
  try {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function readJson(path) {
  const full = PREFIX + path;
  if (blobOrigin) {
    const rec = await fetchJson(`${blobOrigin}/${full}`);
    if (rec) return rec;
  }
  let info;
  try {
    info = await head(full);
  } catch (err) {
    return null;
  }
  blobOrigin = new URL(info.url).origin;
  return fetchJson(info.url);
}

export async function writeJson(path, obj) {
  await put(PREFIX + path, JSON.stringify(obj), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

// 참여자 전체 읽기 (관리자 화면·자동 알림에서만)
export async function readAllParticipants() {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX + 'p/', cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  if (blobs[0]) blobOrigin = new URL(blobs[0].url).origin;
  const out = [];
  for (let i = 0; i < blobs.length; i += 20) {
    const part = await Promise.all(blobs.slice(i, i + 20).map((b) => fetchJson(b.url)));
    out.push(...part.filter(Boolean));
  }
  return out;
}

export async function removeParticipant(digits) {
  const r = await list({ prefix: PREFIX + pPath(digits), limit: 5 });
  if (r.blobs.length) await del(r.blobs.map((b) => b.url));
}

export async function readSchedule() {
  const s = await readJson(SCHEDULE_PATH);
  return {
    title: '인스타그램 챌린지',
    intro: '12월 1일부터 1월 31일까지, 매일 조금씩 함께해요!',
    days: {},
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
