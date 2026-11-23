'use client';
import { useEffect, useMemo, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { Calendar, VideoView } from '../components';
import { kstToday, prettyDate, hasHomework, homeworkDaysUntil, allDays, START } from '../lib/dates';
import { api } from '../lib/client';

const PW_KEY = 'winter-challenge.admin.pw';
const empty = { event: '', homework: '', notice: '', videos: [] };

export default function Admin() {
  const [pw, setPw] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('plan');
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    let saved = '';
    try { saved = sessionStorage.getItem(PW_KEY) || ''; } catch (e) { /* 없음 */ }
    if (saved) tryLogin(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryLogin(p) {
    setErr('');
    try {
      await api('/api/admin', { pw: p, checkOnly: true });
      try { sessionStorage.setItem(PW_KEY, p); } catch (e) { /* 무시 */ }
      setPw(p);
      setOk(true);
      setSchedule(await api('/api/schedule'));
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!ok) {
    return (
      <main className="wrap">
        <form className="card login" onSubmit={(e) => { e.preventDefault(); tryLogin(pw); }}>
          <h2>🔐 관리자 입장</h2>
          <label>관리자 비밀번호<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
          {err && <p className="err">{err}</p>}
          <button className="btn primary big">들어가기</button>
        </form>
      </main>
    );
  }

  if (!schedule) return <div className="center-load">불러오는 중…</div>;

  return (
    <main className="wrap admin">
      <header className="top">
        <div>
          <div className="top-title">관리자 · {schedule.title}</div>
          <div className="top-hello">참여자 주소: <a href="/" target="_blank">{typeof window !== 'undefined' ? location.origin : ''}</a></div>
        </div>
      </header>
      <nav className="tabs">
        <button className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>📅 일정·숙제</button>
        <button className={tab === 'refs' ? 'on' : ''} onClick={() => setTab('refs')}>📚 참고영상</button>
        <button className={tab === 'people' ? 'on' : ''} onClick={() => setTab('people')}>👥 참여자</button>
        <button className={tab === 'push' ? 'on' : ''} onClick={() => setTab('push')}>🔔 알림</button>
        <button className={tab === 'set' ? 'on' : ''} onClick={() => setTab('set')}>⚙️ 기본</button>
      </nav>
      {tab === 'plan' && <PlanTab pw={pw} schedule={schedule} setSchedule={setSchedule} />}
      {tab === 'refs' && <RefsTab pw={pw} schedule={schedule} setSchedule={setSchedule} />}
      {tab === 'people' && <PeopleTab pw={pw} schedule={schedule} />}
      {tab === 'push' && <PushTab pw={pw} />}
      {tab === 'set' && <SettingsTab pw={pw} schedule={schedule} setSchedule={setSchedule} />}
    </main>
  );
}

async function saveSchedule(pw, next) {
  const j = await api('/api/schedule', { pw, schedule: next });
  return j.schedule;
}

function PlanTab({ pw, schedule, setSchedule }) {
  const today = kstToday();
  const [sel, setSel] = useState(today >= START && today <= '2027-01-31' ? today : START);
  const [draft, setDraft] = useState(empty);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [upPct, setUpPct] = useState(null);

  useEffect(() => {
    const d = schedule.days?.[sel];
    setDraft(d ? { ...empty, ...d, videos: (d.videos || []).map((v) => ({ ...v })) } : { ...empty, videos: [] });
    setDirty(false);
    setMsg('');
  }, [sel, schedule]);

  const set = (k, v) => { setDraft((p) => ({ ...p, [k]: v })); setDirty(true); };
  const setVideo = (i, k, v) => { setDraft((p) => ({ ...p, videos: p.videos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })); setDirty(true); };

  function pick(d) {
    if (dirty && !confirm('저장하지 않은 내용이 있어요. 저장하지 않고 다른 날로 갈까요?')) return;
    setSel(d);
  }

  async function save(nextDay) {
    setBusy(true);
    setMsg('');
    try {
      const days = { ...(schedule.days || {}) };
      if (nextDay) days[sel] = nextDay; else delete days[sel];
      const s = await saveSchedule(pw, { ...schedule, days });
      setSchedule(s);
      setMsg('✅ 저장했어요. 참여자 화면에 바로 반영돼요.');
    } catch (e) {
      setMsg('❌ ' + e.message);
    }
    setBusy(false);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUpPct(0);
    setMsg('');
    try {
      const safe = file.name.replace(/[^\w.\-가-힣]/g, '_');
      const blob = await upload(`videos/${sel}/${safe}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: pw,
        multipart: file.size > 50 * 1024 * 1024,
        onUploadProgress: (p) => setUpPct(Math.round(p.percentage)),
      });
      setDraft((p) => ({ ...p, videos: [...p.videos, { title: file.name.replace(/\.[^.]+$/, ''), url: blob.url }] }));
      setDirty(true);
      setMsg('영상이 올라갔어요. 아래 「이 날 저장하기」를 꼭 눌러 주세요.');
    } catch (err) {
      setMsg('❌ 영상 올리기 실패: ' + err.message);
    }
    setUpPct(null);
  }

  const days = schedule.days || {};
  return (
    <div className="plan">
      <section className="card">
        <p className="hint">날짜를 누르면 오른쪽(휴대폰은 아래)에서 그날의 일정·숙제·녹화본을 적을 수 있어요.</p>
        <Calendar
          today={today}
          selected={sel}
          onPick={pick}
          dayInfo={(d) => {
            const day = days[d];
            if (!day) return {};
            return { cls: 'has', mark: (hasHomework(day) ? '✏️' : '') + ((day.videos || []).length ? '🎬' : ''), label: day.event ? day.event.slice(0, 8) : '' };
          }}
        />
      </section>
      <section className="card editor">
        <h3>{prettyDate(sel)} {dirty && <small className="pink">· 저장 안 됨</small>}</h3>
        <label>📌 일정 <small>(한 줄, 달력에 앞 글자가 보여요)</small>
          <input value={draft.event} onChange={(e) => set('event', e.target.value)} placeholder="예) 1주차 줌 강의 밤 9시" />
        </label>
        <label>✏️ 숙제 <small>(적으면 참여자가 완료 표시를 해야 하는 날이 돼요)</small>
          <textarea rows={5} value={draft.homework} onChange={(e) => set('homework', e.target.value)} placeholder="예) 우리 원 소개 릴스 1개 올리고 #겨울챌린지 태그 달기" />
        </label>
        <label>💡 안내 <small>(선택: 참고 링크, 준비물 등)</small>
          <textarea rows={3} value={draft.notice} onChange={(e) => set('notice', e.target.value)} />
        </label>
        <div className="sect-t">🎬 녹화본 영상</div>
        <p className="hint">유튜브(일부 공개) 주소를 붙여 넣는 방법을 추천해요. 영상 파일을 바로 올릴 수도 있어요.</p>
        {draft.videos.map((v, i) => (
          <div key={i} className="video-edit">
            <input value={v.title} onChange={(e) => setVideo(i, 'title', e.target.value)} placeholder="영상 제목" />
            <input value={v.url} onChange={(e) => setVideo(i, 'url', e.target.value)} placeholder="https://youtu.be/…" />
            <button className="link-btn" onClick={() => { setDraft((p) => ({ ...p, videos: p.videos.filter((_, j) => j !== i) })); setDirty(true); }}>삭제</button>
            {v.url && <VideoView v={v} />}
          </div>
        ))}
        <div className="row">
          <button className="btn ghost" onClick={() => { setDraft((p) => ({ ...p, videos: [...p.videos, { title: '', url: '' }] })); setDirty(true); }}>＋ 영상 주소 넣기</button>
          <label className="btn ghost file-btn">
            {upPct === null ? '⬆ 영상 파일 올리기' : `올리는 중 ${upPct}%`}
            <input type="file" accept="video/*" onChange={onFile} disabled={upPct !== null} hidden />
          </label>
        </div>
        {msg && <p className={msg.startsWith('❌') ? 'err' : 'okmsg'}>{msg}</p>}
        <div className="row end">
          {days[sel] && <button className="link-btn" disabled={busy} onClick={() => { if (confirm(`${prettyDate(sel)} 내용을 모두 지울까요?`)) save(null); }}>이 날 내용 지우기</button>}
          <button className="btn primary" disabled={busy || upPct !== null} onClick={() => save(draft)}>{busy ? '저장 중…' : '💾 이 날 저장하기'}</button>
        </div>
      </section>
    </div>
  );
}

// 날짜와 상관없이 언제든 보는 참고 영상 강의
function RefsTab({ pw, schedule, setSchedule }) {
  const [refs, setRefs] = useState(() => (schedule.refs || []).map((r) => ({ memo: '', ...r })));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [upPct, setUpPct] = useState(null);

  const edit = (i, k, v) => { setRefs((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x))); setDirty(true); };
  const move = (i, dir) => {
    setRefs((p) => {
      const n = [...p];
      const j = i + dir;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    setDirty(true);
  };

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      const s = await saveSchedule(pw, { ...schedule, refs });
      setSchedule(s);
      setRefs((s.refs || []).map((r) => ({ memo: '', ...r })));
      setDirty(false);
      setMsg('✅ 저장했어요. 참여자 화면 「강의·녹화본」 아래쪽에 보여요.');
    } catch (e) {
      setMsg('❌ ' + e.message);
    }
    setBusy(false);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUpPct(0);
    setMsg('');
    try {
      const safe = file.name.replace(/[^\w.\-가-힣]/g, '_');
      const blob = await upload(`videos/refs/${safe}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: pw,
        multipart: file.size > 50 * 1024 * 1024,
        onUploadProgress: (p) => setUpPct(Math.round(p.percentage)),
      });
      setRefs((p) => [...p, { title: file.name.replace(/\.[^.]+$/, ''), url: blob.url, memo: '' }]);
      setDirty(true);
      setMsg('영상이 올라갔어요. 아래 「저장하기」를 꼭 눌러 주세요.');
    } catch (err) {
      setMsg('❌ 영상 올리기 실패: ' + err.message);
    }
    setUpPct(null);
  }

  return (
    <section className="card editor">
      <h3>📚 참고 영상 강의 {dirty && <small className="pink">· 저장 안 됨</small>}</h3>
      <p className="hint">날짜와 상관없이 참여자가 언제든 볼 수 있는 영상이에요. 유튜브 주소를 붙여 넣거나 영상 파일을 올리세요. 위에 있는 것이 먼저 보여요.</p>
      {refs.map((v, i) => (
        <div key={i} className="ref-edit">
          <input value={v.title} onChange={(e) => edit(i, 'title', e.target.value)} placeholder="영상 제목 (예: 릴스 잘 찍는 법)" />
          <input value={v.url} onChange={(e) => edit(i, 'url', e.target.value)} placeholder="https://youtu.be/…" />
          <span className="row" style={{ marginTop: 0 }}>
            <button className="link-btn" onClick={() => move(i, -1)} title="위로">▲</button>
            <button className="link-btn" onClick={() => move(i, 1)} title="아래로">▼</button>
            <button className="link-btn danger" onClick={() => { setRefs((p) => p.filter((_, j) => j !== i)); setDirty(true); }}>삭제</button>
          </span>
          <textarea rows={2} value={v.memo} onChange={(e) => edit(i, 'memo', e.target.value)} placeholder="설명 (선택)" />
          {v.url && <VideoView v={v} />}
        </div>
      ))}
      {!refs.length && <p className="muted">아직 참고 영상이 없어요.</p>}
      <div className="row">
        <button className="btn ghost" onClick={() => { setRefs((p) => [...p, { title: '', url: '', memo: '' }]); setDirty(true); }}>＋ 영상 주소 넣기</button>
        <label className="btn ghost file-btn">
          {upPct === null ? '⬆ 영상 파일 올리기' : `올리는 중 ${upPct}%`}
          <input type="file" accept="video/*" onChange={onFile} disabled={upPct !== null} hidden />
        </label>
      </div>
      {msg && <p className={msg.startsWith('❌') ? 'err' : 'okmsg'}>{msg}</p>}
      <div className="row end">
        <button className="btn primary" disabled={busy || upPct !== null} onClick={save}>{busy ? '저장 중…' : '💾 저장하기'}</button>
      </div>
    </section>
  );
}

function PeopleTab({ pw, schedule }) {
  const [people, setPeople] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState('');
  const [q, setQ] = useState('');
  const today = kstToday();
  const hwDays = useMemo(() => homeworkDaysUntil(schedule, today), [schedule, today]);

  async function load() {
    setErr('');
    try { setPeople((await api('/api/admin', { pw })).people); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function remove(p) {
    if (!confirm(`${p.name}(${fmtPhone(p.phone)}) 님을 삭제할까요? 완료 기록도 함께 지워지고 되돌릴 수 없어요.`)) return;
    try { await api('/api/admin', { pw, del: p.phone }); setPeople((list) => list.filter((x) => x.phone !== p.phone)); } catch (e) { alert(e.message); }
  }

  function csv() {
    const all = allDays().filter((d) => hasHomework(schedule.days?.[d]));
    const head = ['이름', '전화번호', '알림', '완료수', ...all];
    const rows = (people || []).map((p) => [p.name, fmtPhone(p.phone), p.push ? '켬' : '', all.filter((d) => p.done[d]).length, ...all.map((d) => (p.done[d] ? (p.done[d].link || 'O') : ''))]);
    const text = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = `챌린지_참여현황_${today}.csv`;
    a.click();
  }

  if (err) return <section className="card"><p className="err">{err}</p><button className="btn ghost" onClick={load}>다시 불러오기</button></section>;
  if (!people) return <section className="card"><p className="muted">참여자를 불러오는 중…</p></section>;

  const list = people.filter((p) => !q || p.name.includes(q) || p.phone.includes(q.replace(/\D/g, '') || '@@'));
  const todayDone = hasHomework(schedule.days?.[today]) ? people.filter((p) => p.done[today]).length : null;

  return (
    <section className="card">
      <div className="row between">
        <div>
          참여자 <b>{people.length}</b>명 · 알림 켠 분 <b>{people.filter((p) => p.push).length}</b>명
          {todayDone !== null && <> · 오늘 숙제 완료 <b className="pink">{todayDone}</b>명</>}
        </div>
        <div className="row">
          <button className="btn ghost" onClick={load}>🔄 새로고침</button>
          <button className="btn ghost" onClick={csv}>⬇ 엑셀(CSV) 받기</button>
        </div>
      </div>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름이나 전화번호로 찾기" />
      <div className="table">
        <div className="tr th"><span>이름</span><span>전화번호</span><span>완료</span><span>안 한 숙제</span><span>알림</span></div>
        {list.map((p) => {
          const missed = hwDays.filter((d) => !p.done[d]);
          return (
            <div key={p.phone}>
              <button className="tr" onClick={() => setOpen(open === p.phone ? '' : p.phone)}>
                <span><b>{p.name}</b></span>
                <span>{fmtPhone(p.phone)}</span>
                <span>{hwDays.length - missed.length}/{hwDays.length}</span>
                <span className={missed.length ? 'pink' : ''}>{missed.length ? `${missed.length}개` : '없음'}</span>
                <span>{p.push ? '🔔' : '–'}</span>
              </button>
              {open === p.phone && (
                <div className="detail">
                  {missed.length > 0 && <p><b>안 한 날:</b> {missed.map(prettyDate).join(', ')}</p>}
                  <p><b>완료한 날:</b></p>
                  <ul>
                    {Object.keys(p.done).sort().map((d) => (
                      <li key={d}>{prettyDate(d)} {p.done[d].link && <a href={p.done[d].link} target="_blank" rel="noreferrer">게시물 보기</a>}</li>
                    ))}
                    {!Object.keys(p.done).length && <li className="muted">아직 없어요</li>}
                  </ul>
                  <button className="link-btn danger" onClick={() => remove(p)}>이 참여자 삭제</button>
                </div>
              )}
            </div>
          );
        })}
        {!list.length && <p className="muted">아직 참여자가 없어요.</p>}
      </div>
    </section>
  );
}

function PushTab({ pw }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim()) { setMsg('❌ 알림 내용을 적어 주세요.'); return; }
    if (!confirm('지금 바로 알림을 보낼까요?')) return;
    setBusy(true);
    setMsg('');
    try {
      const j = await api('/api/notify', { pw, title, body, target });
      setMsg(`✅ 보냈어요. 대상 ${j.targets}명 중 알림을 켠 ${j.withPush}명에게 보냈고, ${j.people}명에게 도착 처리됐어요.`);
    } catch (e) {
      setMsg('❌ ' + e.message);
    }
    setBusy(false);
  }

  return (
    <section className="card editor">
      <h3>🔔 지금 바로 알림 보내기</h3>
      <p className="hint">자동 알림: 매일 <b>아침 8시</b>에 그날 일정·숙제, <b>저녁 8시</b>에 오늘 숙제를 아직 안 한 분께 알림이 가요(12/1~1/31). 따로 보낼 말이 있을 때만 여기서 보내세요.</p>
      <label>제목 <small>(비우면 챌린지 이름)</small><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 오늘 밤 9시 줌 강의!" /></label>
      <label>내용<textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="예) 링크는 앱에서 확인해 주세요." /></label>
      <div className="row">
        <label className="radio"><input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} /> 전체</label>
        <label className="radio"><input type="radio" checked={target === 'notDoneToday'} onChange={() => setTarget('notDoneToday')} /> 오늘 숙제 안 한 분만</label>
      </div>
      {msg && <p className={msg.startsWith('❌') ? 'err' : 'okmsg'}>{msg}</p>}
      <button className="btn primary" disabled={busy} onClick={send}>{busy ? '보내는 중…' : '보내기'}</button>
    </section>
  );
}

function SettingsTab({ pw, schedule, setSchedule }) {
  const [title, setTitle] = useState(schedule.title);
  const [intro, setIntro] = useState(schedule.intro);
  const [msg, setMsg] = useState('');
  async function save() {
    try {
      setSchedule(await saveSchedule(pw, { ...schedule, title, intro }));
      setMsg('✅ 저장했어요.');
    } catch (e) { setMsg('❌ ' + e.message); }
  }
  return (
    <section className="card editor">
      <h3>⚙️ 기본 설정</h3>
      <label>챌린지 이름<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>첫 화면 안내글<textarea rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} /></label>
      {msg && <p className={msg.startsWith('❌') ? 'err' : 'okmsg'}>{msg}</p>}
      <button className="btn primary" onClick={save}>💾 저장</button>
    </section>
  );
}

function fmtPhone(d) {
  const s = String(d || '');
  if (s.length === 11) return `${s.slice(0, 3)}-${s.slice(3, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
  return s;
}
