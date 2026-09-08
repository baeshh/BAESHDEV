/* ============================================================
   BAESHDEV Landing Page — section demos + nav
   ============================================================ */
'use strict';

/* ── 내비 스크롤 ─────────────────────────────────────────── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });


/* ══════════════════════════════════════════════════════════
   섹션 A — AI 채팅 인터랙션
   ══════════════════════════════════════════════════════════ */
const SEC_A_CONTENT = {
  reservation: {
    messages: [
      { role:'user', text:'예약 버튼을 추가해줘.' },
      { role:'ai',   text:'예약 버튼을 추가할게요.', status:'working' },
      { role:'ai',   text:'완료했어요. "예약하기" 버튼이 시설 카드 하단에 추가됐어요.', status:'done' },
    ],
    preview: `<div style="font-family:var(--font);">
      <div style="font-weight:600;font-size:1.05rem;margin-bottom:16px;letter-spacing:-.03em;">FIT CENTER</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:#F3F2ED;border:1px solid #DDDBD3;border-radius:4px;padding:14px;">
          <div style="font-weight:500;margin-bottom:6px;">헬스장</div>
          <div style="font-size:.78rem;color:#6E6E68;margin-bottom:10px;">전문 트레이닝 시설</div>
          <button style="width:100%;padding:7px;background:#161615;color:#F3F2ED;border:none;border-radius:4px;font-weight:500;font-size:.8rem;cursor:pointer;">예약하기</button>
        </div>
        <div style="background:#F3F2ED;border:1px solid #DDDBD3;border-radius:4px;padding:14px;">
          <div style="font-weight:500;margin-bottom:6px;">수영장</div>
          <div style="font-size:.78rem;color:#6E6E68;margin-bottom:10px;">25m 레인 8개</div>
          <button style="width:100%;padding:7px;background:#161615;color:#F3F2ED;border:none;border-radius:4px;font-weight:500;font-size:.8rem;cursor:pointer;">예약하기</button>
        </div>
      </div>
    </div>`,
  },
  mobile: {
    messages: [
      { role:'user', text:'모바일 화면을 보여줘.' },
      { role:'ai',   text:'모바일 미리보기로 전환했어요. 320px 기준으로 확인할 수 있어요.', status:'done' },
    ],
    preview: `<div style="max-width:220px;margin:0 auto;font-family:var(--font);border:1px solid #DDDBD3;border-radius:6px;padding:16px;">
      <div style="font-weight:600;font-size:.95rem;margin-bottom:12px;text-align:center;letter-spacing:-.02em;">FIT CENTER</div>
      <div style="background:#F3F2ED;border:1px solid #DDDBD3;border-radius:4px;padding:12px;margin-bottom:8px;">
        <div style="font-weight:500;font-size:.85rem;">헬스장</div>
        <button style="width:100%;margin-top:8px;padding:6px;background:#161615;color:#F3F2ED;border:none;border-radius:4px;font-weight:500;font-size:.78rem;">예약하기</button>
      </div>
      <div style="background:#F3F2ED;border:1px solid #DDDBD3;border-radius:4px;padding:12px;">
        <div style="font-weight:500;font-size:.85rem;">수영장</div>
        <button style="width:100%;margin-top:8px;padding:6px;background:#161615;color:#F3F2ED;border:none;border-radius:4px;font-weight:500;font-size:.78rem;">예약하기</button>
      </div>
    </div>`,
  },
  color: {
    messages: [
      { role:'user', text:'버튼 색상을 짙은 파란색으로 바꿔줘.' },
      { role:'ai',   text:'버튼 색상을 #1D4ED8로 변경할게요.', status:'working' },
      { role:'ai',   text:'완료했어요. 모든 버튼이 짙은 파란색으로 변경됐어요.', status:'done' },
    ],
    preview: `<div style="font-family:var(--font);">
      <div style="font-weight:600;font-size:1.05rem;margin-bottom:16px;letter-spacing:-.03em;">FIT CENTER</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:#F3F2ED;border:1px solid #DDDBD3;border-radius:4px;padding:14px;">
          <div style="font-weight:500;margin-bottom:6px;">헬스장</div>
          <button style="width:100%;padding:7px;background:#1A47C4;color:#fff;border:none;border-radius:4px;font-weight:500;font-size:.8rem;cursor:pointer;">예약하기</button>
        </div>
        <div style="background:#F3F2ED;border:1px solid #DDDBD3;border-radius:4px;padding:14px;">
          <div style="font-weight:500;margin-bottom:6px;">수영장</div>
          <button style="width:100%;padding:7px;background:#1A47C4;color:#fff;border:none;border-radius:4px;font-weight:500;font-size:.8rem;cursor:pointer;">예약하기</button>
        </div>
      </div>
    </div>`,
  },
};

function renderSecA(key) {
  const data = SEC_A_CONTENT[key];
  if (!data) return;

  // 메시지
  const msgEl = document.getElementById('sec-a-messages');
  msgEl.innerHTML = '';
  data.messages.forEach((m, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'mock-msg ' + m.role;
      let statusHtml = '';
      if (m.status === 'working') statusHtml = '<div class="mock-status working"><div style="width:10px;height:10px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;"></div>수정 중...</div>';
      if (m.status === 'done')    statusHtml = '<div class="mock-status done">완료</div>';
      div.innerHTML = `<div class="mock-av ${m.role}">${m.role==='ai'?'AI':'U'}</div><div><div class="mock-bub">${m.text}</div>${statusHtml}</div>`;
      msgEl.appendChild(div);
      msgEl.scrollTop = msgEl.scrollHeight;
    }, i * 700);
  });

  // 미리보기
  setTimeout(() => {
    const prev = document.getElementById('sec-a-preview-content');
    if (prev) prev.innerHTML = data.preview;
  }, data.messages.length * 700);
}

// 초기 렌더 + 버튼 이벤트
renderSecA('reservation');
document.querySelectorAll('.sug-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sug-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSecA(btn.dataset.sug);
  });
});

/* ══════════════════════════════════════════════════════════
   섹션 B — 인프라 지도
   ══════════════════════════════════════════════════════════ */
const infraDetail = document.getElementById('sec-b-detail');
const topoMap = document.getElementById('sec-b-map');
const topoSvg = document.getElementById('topo-wires');

const MINI_EDGES = [
  { a: 'domain', b: 'frontend', confirmed: true },
  { a: 'frontend', b: 'api', confirmed: true },
  { a: 'api', b: 'db', confirmed: true },
  { a: 'api', b: 'auth', confirmed: true },
  { a: 'api', b: 'email', confirmed: false },
];

const MINI_DETAILS = {
  domain:   { kicker: '도메인', title: '도메인 / HTTPS', desc: '사용자가 접속하는 주소입니다. HTTPS로 연결됩니다.', status: '정상', provider: 'Vercel 자동 발급', cost: '₩0', next: [] },
  frontend: { kicker: '프론트', title: '프론트엔드', desc: '사용자가 보는 화면입니다. 버튼, 폼, 페이지를 담당합니다.', status: '정상', provider: 'Vercel', cost: '₩0', next: [] },
  api:      { kicker: 'API', title: 'API 서버', desc: '프론트와 데이터베이스 사이에서 요청을 처리합니다.', status: '정상', provider: 'Vercel Serverless', cost: '₩0', next: [] },
  db:       { kicker: 'DB', title: '데이터베이스', desc: '회원 정보와 예약 내역을 저장합니다.', status: '확인 필요', provider: 'Supabase PostgreSQL', cost: '₩0 (무료 플랜)', next: ['외부 IP 접근 제한 설정'] },
  auth:     { kicker: '인증', title: '인증 서비스', desc: '로그인, 회원가입, 비밀번호 재설정을 처리합니다.', status: '정상', provider: 'Supabase Auth', cost: '₩0', next: [] },
  email:    { kicker: '이메일', title: '이메일 발송', desc: '예약 확인, 알림 메일을 보냅니다. 아직 연결되지 않았습니다.', status: '연결 필요', provider: '미연결', cost: '알 수 없음', next: ['Resend 또는 SendGrid 연결'] },
};

function topoCenter(id) {
  const el = topoMap?.querySelector(`.topo-node[data-id="${id}"]`);
  if (!el || !topoMap) return null;
  const mr = topoMap.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - mr.left, y: r.top + r.height / 2 - mr.top };
}

function drawTopoWires() {
  if (!topoSvg || !topoMap) return;
  const { width, height } = topoMap.getBoundingClientRect();
  if (width < 8 || height < 8) return;
  topoSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  topoSvg.innerHTML = MINI_EDGES.map(e => {
    const a = topoCenter(e.a);
    const b = topoCenter(e.b);
    if (!a || !b) return '';
    const dash = e.confirmed ? '' : 'stroke-dasharray="5 4"';
    const color = e.confirmed ? 'rgba(22,22,21,.42)' : 'rgba(138,90,0,.7)';
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="1.25" ${dash} />`;
  }).join('');
}

function showInfraDetail(id) {
  const d = MINI_DETAILS[id];
  if (!d || !infraDetail) return;
  document.querySelectorAll('.topo-node').forEach(n => n.classList.toggle('on', n.dataset.id === id));
  const tone = { '정상': 'var(--green)', '확인 필요': 'var(--amber)', '연결 필요': 'var(--amber)' }[d.status] || 'var(--muted)';
  infraDetail.innerHTML = `
    <div class="spec-kicker">${d.kicker}</div>
    <div class="spec-title">${d.title}</div>
    <p class="spec-desc">${d.desc}</p>
    <div class="spec-row"><span>상태</span><strong style="color:${tone}">${d.status}</strong></div>
    <div class="spec-row"><span>제공</span><strong>${d.provider}</strong></div>
    <div class="spec-row"><span>비용</span><strong>${d.cost}</strong></div>
    ${d.next.length ? `<div class="spec-next">다음 작업 · ${d.next.join(', ')}</div>` : ''}`;
}

if (topoMap) {
  topoMap.querySelectorAll('.topo-node').forEach(btn => {
    btn.addEventListener('click', () => showInfraDetail(btn.dataset.id));
  });
  showInfraDetail('frontend');
  const redraw = () => requestAnimationFrame(drawTopoWires);
  redraw();
  window.addEventListener('resize', redraw);
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(topoMap);
}


/* ══════════════════════════════════════════════════════════
   섹션 C — 배포 준비 진단
   ══════════════════════════════════════════════════════════ */
const DIAG_ITEMS = [
  { id:'email', status:'fail', title:'이메일 서비스 미연결', desc:'예약 확인 알림이 발송되지 않아요.', detail:'이메일 발송 코드가 있지만 서비스가 연결되지 않았어요. Resend, SendGrid 중 하나를 선택해 API 키를 등록하면 돼요.', impact:'예약 확인, 비밀번호 재설정 이메일이 발송되지 않아요.', resolution:'연결 관리에서 이메일 서비스를 추가하세요.', auto:true },
  { id:'env',   status:'fail', title:'환경변수 2개 누락', desc:'API 요청이 실패할 수 있어요.', detail:'NEXT_PUBLIC_API_URL, RESEND_API_KEY가 운영 환경에 설정되지 않았어요. 배포 전에 반드시 추가해야 해요.', impact:'API 요청 실패, 이메일 발송 오류가 발생할 수 있어요.', resolution:'환경변수 설정에서 값을 직접 추가하거나 AI에게 안내를 요청하세요.', auto:false },
  { id:'db',    status:'warn', title:'DB 마이그레이션 미실행 (추정)', desc:'배포 후 일부 기능이 오동작할 수 있어요.', detail:'migrations/ 폴더에 실행되지 않은 스키마 변경이 있어 보여요. 이 항목은 추정이에요 — 실제 실행 여부를 직접 확인해 주세요.', impact:'배포 후 일부 기능이 정상 작동하지 않을 수 있어요.', resolution:'pnpm db:migrate 를 실행하거나 AI에게 요청하세요.', auto:true, estimated:true },
  { id:'build', status:'ok',   title:'빌드 설정 정상', desc:'package.json 빌드 스크립트가 확인됐어요.', detail:'next build 스크립트가 정상 설정되어 있어요.', impact:'없음.', resolution:'없음.', auto:false },
  { id:'https', status:'ok',   title:'HTTPS 자동 발급', desc:'Vercel에서 인증서가 자동으로 적용돼요.', detail:'Vercel 배포 시 HTTPS가 자동으로 설정돼요.', impact:'없음.', resolution:'없음.', auto:false },
];

function renderSecC() {
  const list   = document.getElementById('sec-c-list');
  const detail = document.getElementById('sec-c-detail');
  if (!list || !detail) return;

  const icons = { fail:'✗', warn:'!', ok:'✓' };
  list.innerHTML = DIAG_ITEMS.map(d => `
    <div class="diag-item ${d.status}" data-diag="${d.id}">
        <div class="di-icon" style="color:${d.status==='fail'?'#B42318':d.status==='warn'?'#8A5A00':'#1B6B3A'}">${icons[d.status]}</div>
      <div class="di-body">
        <div class="di-title">${d.title}${d.estimated?'<span style="font-family:var(--font-mono);font-size:.62rem;letter-spacing:.04em;text-transform:uppercase;border:1px solid #8A5A00;color:#8A5A00;padding:1px 6px;border-radius:2px;margin-left:8px;">추정</span>':''}</div>
        <div class="di-desc">${d.desc}</div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.diag-item').forEach(el => {
    el.addEventListener('click', () => {
      list.querySelectorAll('.diag-item').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      const d = DIAG_ITEMS.find(i => i.id === el.dataset.diag);
      if (!d) return;
      const stColor = { fail:'#B42318', warn:'#8A5A00', ok:'#1B6B3A' }[d.status];
      detail.innerHTML = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:${stColor};margin-bottom:8px;">${{fail:'미해결',warn:'확인 권장',ok:'통과'}[d.status]}</div>
        <div style="font-size:1.05rem;font-weight:600;color:#161615;margin-bottom:12px;letter-spacing:-.03em;">${d.title}</div>
        <div style="font-size:.875rem;color:#3C3C37;line-height:1.65;margin-bottom:20px;">${d.detail}</div>
        <div style="border-top:1px solid #DDDBD3;padding-top:14px;margin-bottom:14px;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#6E6E68;margin-bottom:6px;">영향</div>
          <div style="font-size:.82rem;color:#3C3C37;">${d.impact}</div>
        </div>
        <div style="font-size:.82rem;color:#3C3C37;margin-bottom:16px;"><strong>해결</strong> ${d.resolution}</div>
        ${d.auto && d.status !== 'ok' ? '<a href="app.html" style="display:inline-flex;padding:8px 14px;background:#161615;color:#F3F2ED;border-radius:4px;font-size:.8125rem;font-weight:500;">콘솔에서 해결</a>' : ''}`;
    });
  });

  // 첫 번째 자동 선택
  list.querySelector('.diag-item')?.click();
}
renderSecC();

/* ══════════════════════════════════════════════════════════
   섹션 D — 비용 계산기
   ══════════════════════════════════════════════════════════ */
const costState = { users: 200, storage: 0.2, email: 500 };

function calcCost() {
  const vercel     = costState.users > 1000 ? Math.round(20 * 1350) : 0;
  const supabase   = costState.storage > 0.5 ? Math.round(25 * 1350) : 0;
  const emailCost  = costState.email > 3000 ? Math.ceil((costState.email-3000)/1000)*Math.round(1.5*1350) : 0;
  const aiUsage    = Math.round(costState.users * 0.01 * 1350);
  const platform   = Math.round(9 * 1350);
  const total      = vercel + supabase + emailCost + aiUsage + platform;

  document.getElementById('cost-total').textContent = '₩' + total.toLocaleString('ko-KR');

  const bd = document.getElementById('cost-breakdown');
  if (!bd) return;
  const rows = [
    { name:'Vercel (서버/CDN)', val: vercel === 0 ? '₩0 (무료 플랜)' : '₩'+vercel.toLocaleString('ko-KR'), free: vercel===0 },
    { name:'Supabase (데이터베이스)', val: supabase === 0 ? '₩0 (무료 플랜)' : '₩'+supabase.toLocaleString('ko-KR'), free: supabase===0 },
    { name:'AI 모델 사용', val: '₩'+aiUsage.toLocaleString('ko-KR'), free:false },
    { name:'BAESHDEV 플랫폼 이용료', val: '₩'+platform.toLocaleString('ko-KR'), free:false },
    { name:'이메일 서비스', val: '알 수 없음 (미연결)', unknown:true },
    { name:'파일 저장소', val: '알 수 없음 (미연결)', unknown:true },
  ];
  bd.innerHTML = rows.map(r => `
    <div class="cost-row">
      <span class="cost-row-name">${r.name}</span>
      <span class="cost-row-val${r.unknown?' unknown':''}" style="${r.free?'color:#16A34A;':''}">${r.val}</span>
    </div>`).join('');
}

function bindSlider(id, stateKey, formatFn) {
  const el = document.getElementById(id);
  const valEl = document.getElementById('cost-val-' + id.replace('sl-',''));
  if (!el) return;
  el.addEventListener('input', () => {
    costState[stateKey] = +el.value;
    if (valEl) valEl.textContent = formatFn(+el.value);
    calcCost();
  });
}

bindSlider('sl-users',   'users',   v => v.toLocaleString('ko-KR') + '명');
bindSlider('sl-storage', 'storage', v => v + 'GB');
bindSlider('sl-email',   'email',   v => v.toLocaleString('ko-KR') + '건');
calcCost();

/* ══════════════════════════════════════════════════════════
   섹션 E — AI 오류 분석 토글
   ══════════════════════════════════════════════════════════ */
window.showSecEAnalysis = function() {
  const panel = document.getElementById('sec-e-analysis');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

/* CSS 애니메이션 추가 */
const style = document.createElement('style');
style.textContent = `
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
`;
document.head.appendChild(style);

const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');
hamburger?.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
mobileNav?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileNav.classList.remove('open'));
});
