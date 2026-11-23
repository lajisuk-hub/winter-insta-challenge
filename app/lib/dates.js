// 챌린지 기간과 날짜 도우미 — 화면과 서버가 함께 쓴다. 날짜는 모두 한국 시간 기준 'YYYY-MM-DD'.
export const START = '2026-12-01';
export const END = '2027-01-31';
export const MONTHS = [
  { y: 2026, m: 12, label: '2026년 12월' },
  { y: 2027, m: 1, label: '2027년 1월' },
];

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// 한국 시간으로 오늘 날짜
export function kstToday() {
  // 내 컴퓨터에서 시험할 때만: 날짜를 바꿔 볼 수 있게
  if (typeof window !== 'undefined' && location.hostname === 'localhost') {
    try { const t = localStorage.getItem('debug.today'); if (t) return t; } catch (e) { /* 무시 */ }
  }
  if (typeof window === 'undefined' && process.env.DEBUG_TODAY) return process.env.DEBUG_TODAY;
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function allDays() {
  const out = [];
  for (const { y, m } of MONTHS) {
    const n = new Date(y, m, 0).getDate();
    for (let d = 1; d <= n; d += 1) out.push(ymd(y, m, d));
  }
  return out;
}

export const inRange = (date) => date >= START && date <= END;

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export function prettyDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  const w = WEEK[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${w})`;
}

// 숙제가 있는 날인지
export const hasHomework = (day) => !!(day && String(day.homework || '').trim());

// 오늘까지 숙제가 있었던 날 중 안 한 날
export function missedDays(schedule, done, today = kstToday()) {
  const days = schedule?.days || {};
  return allDays().filter((d) => d <= today && hasHomework(days[d]) && !done?.[d]);
}

export function homeworkDaysUntil(schedule, today = kstToday()) {
  const days = schedule?.days || {};
  return allDays().filter((d) => d <= today && hasHomework(days[d]));
}
