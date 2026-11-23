'use client';
// 참여자 화면과 관리자 화면이 함께 쓰는 달력·영상 보기
import { MONTHS, ymd } from './lib/dates';
import { videoKind } from './lib/client';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function Calendar({ dayInfo, onPick, selected, today }) {
  return (
    <div className="cal-wrap">
      {MONTHS.map(({ y, m, label }) => {
        const first = new Date(y, m - 1, 1).getDay();
        const n = new Date(y, m, 0).getDate();
        const cells = [];
        for (let i = 0; i < first; i += 1) cells.push(null);
        for (let d = 1; d <= n; d += 1) cells.push(ymd(y, m, d));
        return (
          <div className="cal" key={label}>
            <div className="cal-title">{label}</div>
            <div className="cal-grid">
              {WEEK.map((w, i) => <div key={w} className={'cal-w' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{w}</div>)}
              {cells.map((date, i) => {
                if (!date) return <div key={'e' + i} />;
                const info = dayInfo(date) || {};
                const dow = (first + Number(date.slice(8)) - 1) % 7;
                return (
                  <button
                    type="button"
                    key={date}
                    className={['cal-d', info.cls || '', date === today ? 'today' : '', date === selected ? 'sel' : '', dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''].join(' ')}
                    onClick={() => onPick(date)}
                  >
                    <span className="num">{Number(date.slice(8))}</span>
                    {info.mark && <span className="mark">{info.mark}</span>}
                    {info.label && <span className="lbl">{info.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VideoView({ v }) {
  const k = videoKind(v.url);
  return (
    <div className="video">
      {v.title && <div className="video-title">🎬 {v.title}</div>}
      {k.type === 'youtube' && (
        <div className="frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${k.id}?rel=0&playsinline=1`}
            title={v.title || '녹화본'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      )}
      {k.type === 'gdrive' && (
        <div className="frame">
          <iframe src={`https://drive.google.com/file/d/${k.id}/preview`} title={v.title || '녹화본'} allow="autoplay; fullscreen" allowFullScreen />
        </div>
      )}
      {k.type === 'file' && <video src={v.url} controls playsInline preload="metadata" />}
      {k.type === 'link' && (
        <a className="btn ghost" href={v.url} target="_blank" rel="noreferrer">▶ 영상 보러 가기</a>
      )}
    </div>
  );
}

// 줄바꿈을 살리고, 글 속 인터넷 주소는 눌러서 열 수 있게
export function RichText({ text }) {
  const parts = String(text || '').split(/(https?:\/\/[^\s]+)/g);
  return (
    <div className="rich">
      {parts.map((p, i) => (/^https?:\/\//.test(p)
        ? <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>
        : <span key={i}>{p}</span>))}
    </div>
  );
}
