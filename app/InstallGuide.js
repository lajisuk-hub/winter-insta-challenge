'use client';
// 처음 들어오면 뜨는 「휴대폰에 앱으로 설치하는 법」 안내 영상(움직이는 그림)
// 관리자가 설치 안내 영상 주소를 넣어 두면 그 영상을 먼저 보여 준다.
import { useEffect, useState } from 'react';
import { VideoView } from './components';
import { isIOS } from './lib/client';

const STEPS = {
  android: [
    { screen: 'kakao', cap: '카카오톡으로 받은 링크를 눌렀다면, 아래 「크롬으로 열기」를 눌러요' },
    { screen: 'abar', cap: '크롬 맨 위 오른쪽 끝 ⋮ (점 세 개)를 눌러요' },
    { screen: 'amenu', cap: '메뉴가 열리면 손가락으로 위로 쓸어 올려 아래쪽까지 내려요' },
    { screen: 'amenu2', cap: '「읽기 모드 표시」 아래 「설치 및 바로가기 만들기」를 눌러요' },
    { screen: 'asheet', cap: '위쪽 「설치」를 눌러요 (아래 「바로가기 만들기」 말고!)' },
    { screen: 'home', cap: '홈 화면에 생긴 「인스타챌린지」 아이콘을 눌러 들어와요' },
    { screen: 'notify', cap: '「🔔 알림 켜기」 → 「허용」을 누르면 끝! 숙제 알림이 와요' },
  ],
  ios: [
    { screen: 'kakao', cap: '카카오톡으로 받은 링크를 눌렀다면, 아래 「Safari로 열기」를 눌러요' },
    { screen: 'browser', cap: '사파리 아래쪽 가운데 공유 단추(□↑)를 눌러요' },
    { screen: 'menu', cap: '목록을 내려 「홈 화면에 추가」를 눌러요' },
    { screen: 'dialog', cap: '오른쪽 위 「추가」를 눌러요' },
    { screen: 'home', cap: '홈 화면에 생긴 「인스타챌린지」 아이콘으로 들어와요 (꼭 아이콘으로!)' },
    { screen: 'notify', cap: '「🔔 알림 켜기」 → 「허용」을 누르면 끝! 숙제 알림이 와요' },
  ],
};

export default function InstallGuide({ videoUrl, onClose }) {
  const [os, setOs] = useState('android');
  const [step, setStep] = useState(0);
  const [play, setPlay] = useState(true);
  useEffect(() => { setOs(isIOS() ? 'ios' : 'android'); }, []);
  useEffect(() => {
    if (!play) return undefined;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS[os].length), 3600);
    return () => clearTimeout(t);
  }, [step, play, os]);

  const steps = STEPS[os];
  const cur = steps[step];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal guide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>📲 휴대폰에 앱으로 설치하기</h3>
          <button className="x" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        {videoUrl && <div className="guide-video"><VideoView v={{ title: '설치 안내 영상', url: videoUrl }} /></div>}
        <div className="seg">
          <button className={os === 'android' ? 'on' : ''} onClick={() => { setOs('android'); setStep(0); setPlay(true); }}>안드로이드(갤럭시)</button>
          <button className={os === 'ios' ? 'on' : ''} onClick={() => { setOs('ios'); setStep(0); setPlay(true); }}>아이폰</button>
        </div>
        <div className="guide-stage">
          <Phone os={os} screen={cur.screen} key={os + step} />
          <img className="guide-char" src="/chars/giroki.webp" alt="" />
        </div>
        <div className="guide-cap"><b>{step + 1}</b> {cur.cap}</div>
        <div className="dots">
          {steps.map((_, i) => <button key={i} className={i === step ? 'on' : ''} onClick={() => { setStep(i); setPlay(false); }} aria-label={`${i + 1}단계`} />)}
        </div>
        <div className="row center">
          <button className="btn ghost" onClick={() => { setStep((s) => (s - 1 + steps.length) % steps.length); setPlay(false); }}>◀ 이전</button>
          <button className="btn ghost" onClick={() => setPlay((p) => !p)}>{play ? '⏸ 멈춤' : '▶ 재생'}</button>
          <button className="btn ghost" onClick={() => { setStep((s) => (s + 1) % steps.length); setPlay(false); }}>다음 ▶</button>
        </div>
        <button className="btn primary big" onClick={onClose}>알겠어요!</button>
      </div>
    </div>
  );
}

// 갤럭시 크롬 메뉴 순서 (원장님 휴대폰 화면 그대로)
const GX_MENU = [
  ['⊕', '새 탭'], ['🕶', '새 시크릿 탭'], ['▦', '새 그룹에 탭 추가'], '-',
  ['🕘', '방문 기록'], ['🗑', '인터넷 사용 기록 삭제'], ['⚙', '사이트 제어'], '-',
  ['✓', '다운로드'], ['★', '북마크'], ['▭', '최근 탭'], '-',
  ['⤴', '공유…'], ['✦', 'Gemini에게 물어보기'], ['🔍', '페이지에서 찾기'], ['文', '번역…'], ['▤', '읽기 모드 표시'],
  ['⤓', '설치 및 바로가기 만들기'], ['🖥', '데스크톱 사이트'], '-', ['⚙', '설정'], ['?', '고객센터'],
];

function AndroidTop() {
  return (
    <div className="gx-top">
      <div className="gx-status"><span>SKT 11:56</span><span>📶 100</span></div>
      <div className="gx-bar"><span>⌂</span><span className="gx-url">challenge.vercel.app</span><span>✦</span><span className="gx-tabs">5</span><span className="gx-dots">⋮</span></div>
    </div>
  );
}

function Finger({ x, y }) {
  return <span className="finger" style={{ left: x, top: y }}><i className="ripple" />👆</span>;
}

// 휴대폰 화면을 간단한 그림으로 흉내 낸다
function Phone({ os, screen }) {
  const ios = os === 'ios';
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        {/* ── 안드로이드: 원장님 휴대폰(갤럭시 크롬) 화면을 그대로 따라 그림 ── */}
        {(screen === 'abar' || screen === 'amenu' || screen === 'amenu2' || screen === 'asheet') && <AndroidTop />}
        {screen === 'abar' && (
          <>
            <div className="ph-page"><div className="ph-mini-hero">인스타그램 챌린지</div><div className="ph-lines" /></div>
            <Finger x="88%" y="5%" />
          </>
        )}
        {(screen === 'amenu' || screen === 'amenu2') && (
          <>
            <div className="ph-page dim"><div className="ph-mini-hero">인스타그램 챌린지</div><div className="ph-lines" /></div>
            <div className="gx-menu">
              <div className={'gx-list ' + (screen === 'amenu' ? 'scrolling' : 'scrolled')}>
                <div className="gx-icons"><span>←</span><span>→</span><span>☆</span><span>⤓</span><span>⟳</span></div>
                {GX_MENU.map((t, i) => (t === '-'
                  ? <hr key={i} />
                  : <div key={i} className={'gx-item' + (screen === 'amenu2' && t[1] === '설치 및 바로가기 만들기' ? ' hl' : '')}><i>{t[0]}</i>{t[1]}</div>))}
              </div>
            </div>
            {screen === 'amenu' ? <span className="swipe">👆</span> : <Finger x="58%" y="74%" />}
          </>
        )}
        {screen === 'asheet' && (
          <>
            <div className="ph-page dim"><div className="ph-mini-hero">인스타그램 챌린지</div><div className="ph-lines" /></div>
            <div className="gx-sheet">
              <div className="gx-sheet-t">설치 및 바로가기 만들기</div>
              <div className="gx-rows">
                <div className="gx-row hl"><img src="/icon-192.png" alt="" /><b>설치</b><span>›</span></div>
                <div className="gx-row"><img src="/icon-192.png" alt="" /><div><b>바로가기 만들기</b><small>Chrome에서 바로가기 열기</small></div><span>›</span></div>
              </div>
            </div>
            <Finger x="45%" y="74%" />
          </>
        )}
        {screen === 'kakao' && (
          <>
            <div className="ph-bar kakao">카카오톡 <span>⋯</span></div>
            <div className="ph-page"><div className="ph-mini-hero">인스타그램 챌린지</div><div className="ph-lines" /></div>
            <div className="ph-banner">⚠ 카톡 안에서는 알림이 안 돼요<button className="ph-btn">{ios ? 'Safari로 열기' : '크롬으로 열기'}</button></div>
            <Finger x="62%" y="83%" />
          </>
        )}
        {screen === 'browser' && (
          <>
            {!ios && <div className="ph-bar">🔒 winter-insta…<span className="ph-dots">⋮</span></div>}
            <div className="ph-page"><div className="ph-mini-hero">인스타그램 챌린지</div><div className="ph-lines" /></div>
            {ios && <div className="ph-bottom"><span>‹</span><span>›</span><span className="ph-share">⬆</span><span>📖</span><span>⧉</span></div>}
            <Finger x={ios ? '46%' : '84%'} y={ios ? '88%' : '6%'} />
          </>
        )}
        {ios && screen === 'menu' && (
          <>
            <div className="ph-page dim"><div className="ph-mini-hero">인스타그램 챌린지</div></div>
            <div className="ph-menu sheet">
              {['복사', '읽기 목록에 추가', '책갈피 추가', '홈 화면에 추가 ⊞', '페이지에서 찾기'].map((t) => (
                <div key={t} className={t.startsWith('홈 화면에 추가') ? 'hl' : ''}>{t}</div>
              ))}
            </div>
            <Finger x="40%" y="74%" />
          </>
        )}
        {!ios && (screen === 'menu' || screen === 'menu2') && (
          <>
            <div className="ph-bar">🔒 winter-insta…<span className="ph-dots">⋮</span></div>
            <div className="ph-page dim"><div className="ph-mini-hero">인스타그램 챌린지</div></div>
            <div className="ph-menu tall">
              <div className={'ph-menu-list ' + (screen === 'menu' ? 'scrolling' : 'scrolled')}>
                {['새 탭', '새 시크릿 탭', '방문 기록', '다운로드', '북마크', '최근 탭', '공유…', '페이지에서 찾기', '번역…', '읽기 모드 표시', '설치 및 바로가기 만들기', '데스크톱 사이트', '설정'].map((t) => (
                  <div key={t} className={screen === 'menu2' && t === '설치 및 바로가기 만들기' ? 'hl' : ''}>{t}</div>
                ))}
              </div>
            </div>
            {screen === 'menu' ? <span className="swipe">👆</span> : <Finger x="70%" y="80%" />}
          </>
        )}        {screen === 'dialog' && (
          <>
            <div className="ph-page dim"><div className="ph-mini-hero">인스타그램 챌린지</div></div>
            <div className="ph-dialog">
              <img src="/icon-192.png" alt="" />
              <b>인스타챌린지</b>
              <div className="ph-dialog-btns">
                <span>취소</span><span className="hl">{ios ? '추가' : '설치'}</span>
              </div>
            </div>
            <Finger x="66%" y="60%" />
          </>
        )}
        {screen === 'home' && (
          <>
            <div className="ph-home">
              {['📞', '💬', '📷', '🗓', '⚙️', '🎵', '🗺', ''].map((e, i) => (
                <div key={i} className="ph-app">{e ? <span>{e}</span> : <img src="/icon-192.png" alt="" />}<small>{e ? '' : '인스타챌린지'}</small></div>
              ))}
            </div>
            <Finger x="78%" y="38%" />
          </>
        )}
        {screen === 'notify' && (
          <>
            <div className="ph-page"><div className="ph-mini-hero">인스타그램 챌린지</div><div className="ph-alarm">🔔 알림 켜기</div></div>
            <div className="ph-dialog small">
              <b>인스타챌린지에서 알림을 보내려고 해요</b>
              <div className="ph-dialog-btns"><span>차단</span><span className="hl">허용</span></div>
            </div>
            <Finger x="66%" y="60%" />
          </>
        )}
      </div>
    </div>
  );
}
