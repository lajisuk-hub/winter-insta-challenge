'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, VideoView, RichText } from './components';
import InstallGuide from './InstallGuide';
import { kstToday, prettyDate, hasHomework, missedDays, homeworkDaysUntil, inRange, START, allDays } from './lib/dates';
import {
  api, LOGIN_KEY, registerSW, enablePush, currentSub, pushSupported,
  isIOS, isStandalone, inAppBrowser, openInExternalBrowser,
} from './lib/client';

const ORG = '영유아교육디자인연구소';
const GUIDE_KEY = 'winter-challenge.guide.seen.v1';

const KAKAO_URL = 'https://open.kakao.com/o/shPvD6Xi';
const DOCS_URL = 'https://wmentor-receipt.vercel.app/?c=usj9zx';

function QuickLinks({ docs = true }) {
  return (
    <section className="card quick-links">
      <a className="ql kakao" href={KAKAO_URL} target="_blank" rel="noopener noreferrer">
        <span className="ql-ico">💬</span><span><b>카톡 상담하기</b><small>궁금한 점을 카카오톡 오픈채팅으로 물어보세요</small></span><span className="ql-go">›</span>
      </a>
      {docs && (
        <a className="ql docs" href={DOCS_URL} target="_blank" rel="noopener noreferrer">
          <span className="ql-ico">🧾</span><span><b>거래명세서 · 수료증 받기</b><small>필요한 서류를 바로 받을 수 있어요</small></span><span className="ql-go">›</span>
        </a>
      )}
    </section>
  );
}

export default function Home() {
  const [showGuide, setShowGuide] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [me, setMe] = useState(null);
  const [booting, setBooting] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [openDay, setOpenDay] = useState('');
  const [showMissed, setShowMissed] = useState(false);
  const [tab, setTab] = useState('cal');
  const today = kstToday();

  // 처음 열 때: 일정 불러오기 + 이 기기에서 입장한 적 있으면 바로 들어가기
  useEffect(() => {
    registerSW();
    try { if (!isStandalone() && !localStorage.getItem(GUIDE_KEY)) setShowGuide(true); } catch (e) { /* 무시 */ }
    (async () => {
      try { setSchedule(await api('/api/schedule')); } catch (e) { setSchedule({ title: '인스타그램 챌린지', intro: '', days: {} }); }
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(LOGIN_KEY) || 'null'); } catch (e) { /* 없음 */ }
      if (saved?.name && saved?.phone) {
        setForm(saved);
        try {
          const j = await api('/api/join', saved);
          setMe(j.me);
          afterLogin();
        } catch (e) { setMsg(e.message); }
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function afterLogin() {
    const d = new URLSearchParams(location.search).get('d');
    if (d && inRange(d)) setOpenDay(d);
    else setShowMissed(true);
  }

  async function join(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() };
      const j = await api('/api/join', body);
      try { localStorage.setItem(LOGIN_KEY, JSON.stringify(body)); } catch (err) { /* 기억 못 해도 입장은 됨 */ }
      setMe(j.me);
      afterLogin();
    } catch (err) {
      setMsg(err.message);
    }
    setBusy(false);
  }

  function closeGuide() {
    setShowGuide(false);
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) { /* 무시 */ }
  }

  function logout() {
    if (!confirm('이 기기에서 나가시겠어요? (기록은 그대로 남아요)')) return;
    try { localStorage.removeItem(LOGIN_KEY); } catch (e) { /* 무시 */ }
    setMe(null);
    setShowMissed(false);
  }

  const days = schedule?.days || {};
  const done = me?.done || {};
  const missed = useMemo(() => (me ? missedDays(schedule, done, today) : []), [schedule, done, today, me]);
  const pastMissed = missed.filter((d) => d < today);
  const todayHasHw = hasHomework(days[today]);
  const hwSoFar = homeworkDaysUntil(schedule, today);
  const doneCount = hwSoFar.filter((d) => done[d]).length;
  const videos = allDays().flatMap((d) => (days[d]?.videos || []).map((v) => ({ ...v, date: d })));
  const lectureDays = allDays().filter((d) => days[d]?.event || (days[d]?.videos || []).length);
  const refs = schedule?.refs || [];

  const saveDone = useCallback(async (date, isDone, link) => {
    const j = await api('/api/done', { name: me.name, phone: me.phone, date, done: isDone, link, known: me.done });
    setMe(j.me);
  }, [me]);

  if (booting || !schedule) return <div className="center-load">불러오는 중…</div>;

  if (!me) {
    return (
      <main className="wrap">
        <header className="hero">
          <div className="org-badge">{ORG}</div>
          <h1><span className="insta">{schedule.title}</span></h1>
          <div className="hero-badge">📸 2026. 12. 1 – 2027. 1. 31</div>
          <img className="hero-chars" src="/chars/all4.webp" alt="우리아이들 친구들" />
          {schedule.intro && <p className="hero-intro">{schedule.intro}</p>}
        </header>
        <form className="card login" onSubmit={join}>
          <h2>입장하기</h2>
          <label>이름<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예) 홍길동" autoComplete="name" /></label>
          <label>전화번호<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="예) 010-1234-5678" inputMode="tel" autoComplete="tel" /></label>
          {msg && <p className="err">{msg}</p>}
          <button className="btn primary big" disabled={busy}>{busy ? '확인 중…' : '입장하기'}</button>
          <p className="hint">처음이면 자동으로 등록돼요. 다음부터는 같은 이름·전화번호로 들어오시면 기록이 이어져요.</p>
        </form>
        <button className="guide-link" onClick={() => setShowGuide(true)}>📲 휴대폰에 앱으로 설치하는 법 보기</button>
        <QuickLinks docs={false} />
        <footer className="foot">{ORG}에서 진행하는 인스타그램 챌린지</footer>
        {showGuide && <InstallGuide videoUrl={schedule.installVideo} onClose={closeGuide} />}
      </main>
    );
  }

  return (
    <main className="wrap">
      <header className="top">
        <img className="top-char" src="/chars/boy.webp" alt="" />
        <div className="top-text">
          <div className="top-org">{ORG}</div>
          <div className="top-title">{schedule.title}</div>
          <div className="top-hello">{me.name} 님, 반가워요 👋</div>
        </div>
        <button className="link-btn" onClick={logout}>나가기</button>
      </header>

      <section className="card progress">
        <img className="prog-char" src="/chars/giroki.webp" alt="" />
        <div className="prog-cheer">{cheer(hwSoFar.length, doneCount)}</div>
        <div className="prog-row">
          <span>지금까지 숙제 <b>{hwSoFar.length}</b>개 중 <b className="pink">{doneCount}</b>개 완료</span>
          {missed.length > 0 && <button className="chip warn" onClick={() => setShowMissed(true)}>안 한 숙제 {missed.length}</button>}
        </div>
        <div className="bar"><i style={{ width: hwSoFar.length ? `${(doneCount / hwSoFar.length) * 100}%` : '0%' }} /></div>
      </section>

      <AlarmCard me={me} onGuide={() => setShowGuide(true)} />

      {inRange(today) ? (
        <section className="card today-card" onClick={() => setOpenDay(today)}>
          <div className="today-head">오늘 · {prettyDate(today)}</div>
          {days[today]?.event && <div className="today-event">📌 {days[today].event}</div>}
          {todayHasHw ? (
            <div className="today-hw">
              <RichText text={days[today].homework} />
              <div className={'today-state ' + (done[today] ? 'ok' : '')}>{done[today] ? <><img className="mini-char" src="/chars/baby.webp" alt="" />✅ 오늘 숙제 완료! 최고예요</> : '👉 눌러서 숙제하고 완료 표시하기'}</div>
            </div>
          ) : <div className="muted">오늘은 숙제가 없어요.</div>}
        </section>
      ) : today < START ? (
        <section className="card today-card"><div className="today-head">🎉 챌린지는 12월 1일에 시작해요</div><div className="muted">아래 달력에서 미리 일정을 볼 수 있어요.</div></section>
      ) : (
        <section className="card today-card"><div className="today-head">🏁 챌린지가 끝났어요. 함께해 주셔서 고마워요!</div></section>
      )}

      <QuickLinks />

      <nav className="tabs">
        <button className={tab === 'cal' ? 'on' : ''} onClick={() => setTab('cal')}>📅 달력</button>
        <button className={tab === 'video' ? 'on' : ''} onClick={() => setTab('video')}>🎬 강의·녹화본 {videos.length + refs.length ? `(${videos.length + refs.length})` : ''}</button>
      </nav>

      {tab === 'cal' && (
        <section className="card">
          <Calendar
            today={today}
            onPick={setOpenDay}
            dayInfo={(d) => {
              const day = days[d];
              if (!day) return {};
              const hw = hasHomework(day);
              let cls = 'has';
              let mark = '';
              if (hw && done[d]) { cls += ' done'; mark = '✅'; }
              else if (hw && d < today) { cls += ' miss'; mark = '❗'; }
              else if (hw) mark = '✏️';
              if ((day.videos || []).length) mark += '🎬';
              let label = hw ? '숙제' : '';
              if (day.event) {
                const times = day.event.match(/\d{1,2}시/g);
                const isLecture = /강의/.test(day.event);
                if (isLecture) mark = '🎓' + mark;
                label = times ? times.map((t) => t.replace('시', '')).join('·') + '시' : isLecture ? '강의' : day.event.slice(0, 6);
              }
              return { cls, mark, label };
            }}
          />
          <div className="legend"><span>✅ 완료</span><span>❗ 안 함</span><span>✏️ 숙제</span><span>🎓 강의</span><span>🎬 녹화본</span></div>
        </section>
      )}

      {tab === 'video' && (
        <>
          <section className="card">
            <h3 className="sec-h">📅 강의 일정과 녹화본</h3>
            {lectureDays.length === 0 && <p className="muted">아직 등록된 강의가 없어요.</p>}
            {lectureDays.map((d) => (
              <div key={d} className={'video-item' + (d === today ? ' is-today' : '')}>
                <div className="video-date">{prettyDate(d)}{d === today ? ' · 오늘' : ''}</div>
                {days[d].event && <div className="lec-title">{days[d].event}</div>}
                {(days[d].videos || []).length
                  ? days[d].videos.map((v, i) => <VideoView key={i} v={v} />)
                  : <p className="muted small">{d < today ? '녹화본을 준비하고 있어요.' : '강의가 끝나면 이곳에 녹화본이 올라와요.'}</p>}
              </div>
            ))}
          </section>
          <section className="card">
            <h3 className="sec-h">📚 참고 영상 강의</h3>
            {refs.length === 0 && <p className="muted">아직 올라온 참고 영상이 없어요.</p>}
            {refs.map((v, i) => (
              <div key={i} className="video-item">
                <VideoView v={v} />
                {v.memo && <RichText text={v.memo} />}
              </div>
            ))}
          </section>
        </>
      )}

      {openDay && (
        <DayModal
          date={openDay}
          day={days[openDay]}
          doneInfo={done[openDay]}
          isFuture={openDay > today}
          onClose={() => setOpenDay('')}
          onSave={saveDone}
        />
      )}

      {showGuide && <InstallGuide videoUrl={schedule.installVideo} onClose={closeGuide} />}

      <footer className="foot">{ORG}에서 진행하는 인스타그램 챌린지</footer>

      {showMissed && !openDay && !showGuide && (
        <MissedPopup
          missed={pastMissed}
          todayPending={todayHasHw && !done[today]}
          today={today}
          days={days}
          onPick={(d) => { setShowMissed(false); setOpenDay(d); }}
          onClose={() => setShowMissed(false)}
        />
      )}
    </main>
  );
}

function MissedPopup({ missed, todayPending, today, days, onPick, onClose }) {
  if (!missed.length && !todayPending) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal small" onClick={(e) => e.stopPropagation()}>
          <img className="pop-char" src="/chars/baby.webp" alt="" />
          <h3>밀린 숙제가 하나도 없어요!</h3>
          <p className="muted">정말 잘하고 계세요.</p>
          <button className="btn primary" onClick={onClose}>좋아요</button>
        </div>
      </div>
    );
  }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        <img className="pop-char" src="/chars/girl.webp" alt="" />
        <h3>아직 안 한 숙제가 있어요</h3>
        <ul className="miss-list">
          {todayPending && (
            <li><button onClick={() => onPick(today)}><b className="pink">오늘</b> {prettyDate(today)}<span>{oneLine(days[today]?.homework)}</span></button></li>
          )}
          {missed.slice().reverse().map((d) => (
            <li key={d}><button onClick={() => onPick(d)}><b>{prettyDate(d)}</b><span>{oneLine(days[d]?.homework)}</span></button></li>
          ))}
        </ul>
        <p className="hint">누르면 그날 숙제로 가요. 지난 숙제도 지금 해서 완료 표시할 수 있어요.</p>
        <button className="btn ghost" onClick={onClose}>나중에 할게요</button>
      </div>
    </div>
  );
}

function cheer(total, done) {
  if (!total) return '곧 첫 숙제가 열려요. 함께 시작해요!';
  if (done === total) return '숙제를 모두 해냈어요! 정말 멋져요 🎉';
  if (done / total >= 0.7) return '거의 다 왔어요! 조금만 더 힘내요 💪';
  if (done === 0) return '오늘 첫 숙제부터 시작해 볼까요?';
  return '차근차근 잘하고 있어요 😊';
}

const oneLine = (t) => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length > 40 ? s.slice(0, 40) + '…' : s;
};

function DayModal({ date, day, doneInfo, isFuture, onClose, onSave }) {
  const [link, setLink] = useState(doneInfo?.link || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setLink(doneInfo?.link || ''); }, [date, doneInfo]);
  const hw = hasHomework(day);

  async function toggle(isDone) {
    setBusy(true);
    setErr('');
    try { await onSave(date, isDone, link); } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{prettyDate(date)}</h3>
          <button className="x" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {!day && <p className="muted">이 날은 아직 등록된 일정이 없어요.</p>}
        {day?.event && <div className="sect"><div className="sect-t">📌 일정</div><RichText text={day.event} /></div>}
        {hw && <div className="sect hw"><div className="sect-t">✏️ 숙제</div><RichText text={day.homework} /></div>}
        {day?.notice && <div className="sect"><div className="sect-t">💡 안내</div><RichText text={day.notice} /></div>}
        {(day?.videos || []).length > 0 && (
          <div className="sect"><div className="sect-t">🎬 녹화본</div>{day.videos.map((v, i) => <VideoView key={i} v={v} />)}</div>
        )}
        {hw && (
          <div className="done-box">
            {isFuture ? (
              <p className="muted">이 숙제는 {prettyDate(date)}에 할 수 있어요.</p>
            ) : (
              <>
                <label>인스타 게시물 주소 <small>(선택)</small>
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/p/…" inputMode="url" />
                </label>
                {err && <p className="err">{err}</p>}
                {doneInfo ? (
                  <div className="done-row">
                    <div className="done-ok">✅ 완료했어요!</div>
                    <button className="btn ghost" disabled={busy} onClick={() => toggle(true)}>주소 다시 저장</button>
                    <button className="link-btn" disabled={busy} onClick={() => toggle(false)}>완료 취소</button>
                  </div>
                ) : (
                  <button className="btn primary big" disabled={busy} onClick={() => toggle(true)}>{busy ? '저장 중…' : '✅ 숙제 완료했어요'}</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 휴대폰 알림 켜기 + 앱 설치 안내
function AlarmCard({ me, onGuide }) {
  const [state, setState] = useState('checking'); // checking | on | off
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);
  const [env, setEnv] = useState({ ios: false, standalone: false, inapp: '', supported: true });

  useEffect(() => {
    setEnv({ ios: isIOS(), standalone: isStandalone(), inapp: inAppBrowser(), supported: pushSupported() });
    currentSub().then((s) => setState(s && me.push ? 'on' : 'off')).catch(() => setState('off'));
    const h = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, [me.push]);

  async function turnOn() {
    setBusy(true);
    setMsg('');
    try {
      const sub = await enablePush();
      const j = await api('/api/push', { name: me.name, phone: me.phone, sub, test: true, known: me.done });
      setState('on');
      setMsg(j.sent ? '시험 알림을 보냈어요. 알림이 왔는지 확인해 보세요!' : '알림을 켰어요.');
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice.catch(() => {});
    setInstallEvt(null);
  }

  if (state === 'checking') return null;

  if (env.inapp) {
    return (
      <section className="card alarm">
        <div className="alarm-t">🔔 휴대폰 알림을 받으려면</div>
        <p>지금은 {env.inapp === 'kakao' ? '카카오톡' : '다른 앱'} 안에서 열려 있어서 알림·앱 설치가 안 돼요.</p>
        <button className="btn primary" onClick={() => { if (!openInExternalBrowser()) setMsg('오른쪽 위(또는 아래) ⋯ 단추 → 「다른 브라우저로 열기」 또는 「Safari로 열기」를 눌러 주세요.'); }}>
          {env.ios ? 'Safari로 열기' : '크롬으로 열기'}
        </button>
        {msg && <p className="hint">{msg}</p>}
      </section>
    );
  }

  if (state === 'on') {
    return (
      <section className="card alarm on">
        <div className="alarm-t">🔔 알림 켜짐</div>
        <p className="muted small">매일 아침 9시 반 오늘의 숙제, 저녁 8시 아직 안 한 숙제를 알려 드려요.</p>
        {!env.standalone && (installEvt
          ? <button className="btn ghost" onClick={install}>📲 휴대폰에 앱으로 설치하기</button>
          : <button className="guide-link inline" onClick={onGuide}>📲 앱으로 설치하는 법 보기</button>)}
        {msg && <p className="hint">{msg}</p>}
      </section>
    );
  }

  return (
    <section className="card alarm">
      <div className="alarm-t">🔔 숙제 알림 받기</div>
      <p className="small">아침 9시 반엔 오늘의 숙제를, 저녁 8시엔 아직 안 한 숙제를 휴대폰으로 알려 드려요.</p>
      {env.ios && !env.standalone ? (
        <div className="ios-guide">
          <b>아이폰은 먼저 앱으로 설치해 주세요</b>
          <ol>
            <li>사파리 아래쪽 가운데 <b>공유 단추(□↑)</b>를 눌러요</li>
            <li><b>「홈 화면에 추가」</b>를 누르고 오른쪽 위 <b>「추가」</b></li>
            <li>홈 화면에 생긴 <b>인스타챌린지</b> 아이콘으로 들어와서 이 단추를 눌러요</li>
          </ol>
          <button className="guide-link inline" onClick={onGuide}>▶ 그림으로 보기</button>
        </div>
      ) : (
        <>
          <button className="btn primary" disabled={busy} onClick={turnOn}>{busy ? '켜는 중…' : '🔔 알림 켜기'}</button>
          {!env.standalone && (installEvt
            ? <button className="btn ghost" onClick={install}>📲 휴대폰에 앱으로 설치하기</button>
            : <button className="guide-link inline" onClick={onGuide}>📲 앱으로 설치하는 법 보기</button>)}
        </>
      )}
      {msg && <p className="hint">{msg}</p>}
    </section>
  );
}
