// 화면(브라우저)에서만 쓰는 도우미: 알림 켜기, 앱 설치, 영상 주소 알아보기
export const VAPID_PUBLIC_KEY = 'BFOSZXiPc4rd0xMt5NEWUBaWYKuQsfqgTZY1PNS68fIAUudc-IRWGgtZ1hCQtKFozuRT14OjifGy_zFxrWJjG5I';

export async function api(path, body) {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* 빈 응답 */ }
  if (!r.ok) throw new Error(j.error || '잠시 후 다시 시도해 주세요.');
  return j;
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
}

// 카카오톡·인스타·네이버 등 앱 안의 브라우저(여기선 알림·설치가 안 됨)
export function inAppBrowser() {
  if (typeof window === 'undefined') return '';
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return 'kakao';
  if (/Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i.test(ua)) return 'other';
  return '';
}

export function openInExternalBrowser() {
  const url = location.href;
  if (inAppBrowser() === 'kakao') {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    return true;
  }
  if (/Android/i.test(navigator.userAgent)) {
    location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    return true;
  }
  return false;
}

function keyBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch (e) { return null; }
}

// 이 기기가 이미 알림을 받고 있는지
export async function currentSub() {
  if (!pushSupported() || Notification.permission !== 'granted') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// 알림 허락 받고 이 기기 알림 주소 만들기 (실패하면 이유를 담아 throw)
export async function enablePush() {
  if (!pushSupported()) {
    if (isIOS() && !isStandalone()) throw new Error('아이폰은 먼저 「홈 화면에 추가」로 앱을 설치한 뒤, 설치된 앱에서 알림을 켤 수 있어요.');
    throw new Error('이 브라우저는 알림을 지원하지 않아요. 크롬(안드로이드)이나 사파리(아이폰)로 열어 주세요.');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림이 「차단」되어 있어요. 휴대폰 설정 → 앱(또는 크롬) → 알림에서 허용으로 바꾼 뒤 다시 눌러 주세요.');
  const reg = (await registerSW()) || (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  return sub.toJSON();
}

// 영상 주소 알아보기: 유튜브 / 보관함에 올린 영상 파일 / 그 밖의 주소
export function videoKind(url) {
  const u = String(url || '').trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return { type: 'youtube', id: yt[1] };
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) || /blob\.vercel-storage\.com\//i.test(u)) return { type: 'file' };
  const gd = u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (gd) return { type: 'gdrive', id: gd[1] };
  return { type: 'link' };
}

export const LOGIN_KEY = 'winter-challenge.me.v1';
