// 휴대폰·컴퓨터로 알림 보내기(웹 푸시) — 서버에서만 쓴다.
import webpush from 'web-push';

let ready = false;
function setup() {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const pri = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !pri) return false;
  webpush.setVapidDetails('https://winter-insta-challenge.vercel.app', pub, pri);
  ready = true;
  return true;
}

export function okSub(s) {
  return !!(s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth);
}

// 같은 기기는 한 번만, 한 사람당 최대 5대
export function mergeSubs(...lists) {
  const map = new Map();
  lists.flat().filter(okSub).forEach((s) => map.set(s.endpoint, { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }));
  return [...map.values()].slice(-5);
}

// 보내고, 더 이상 없는 기기(404·410) 목록을 돌려준다
export async function sendPush(subs, payload) {
  if (!setup() || !subs?.length) return { sent: 0, dead: [] };
  const dead = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(s, JSON.stringify(payload), { TTL: 60 * 60 * 12, timeout: 8000 });
      sent += 1;
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
      else console.error('알림 실패', err?.statusCode, String(err?.body || err?.message || '').slice(0, 200));
    }
  }));
  return { sent, dead };
}

// 여러 사람에게 보내고, 없어진 기기는 기록에서 지운다
export async function pushToPeople(people, makePayload, writeBack) {
  let sent = 0;
  let people_ = 0;
  for (let i = 0; i < people.length; i += 10) {
    await Promise.all(people.slice(i, i + 10).map(async (rec) => {
      const subs = rec.subs || [];
      if (!subs.length) return;
      const payload = makePayload(rec);
      if (!payload) return;
      const r = await sendPush(subs, payload);
      sent += r.sent;
      if (r.sent) people_ += 1;
      if (r.dead.length && writeBack) {
        await writeBack({ ...rec, subs: subs.filter((s) => !r.dead.includes(s.endpoint)) });
      }
    }));
  }
  return { sent, people: people_ };
}
