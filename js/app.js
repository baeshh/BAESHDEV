/* ============================================================
   BAESHDEV Platform — Main Application JS
   ============================================================ */
'use strict';

/* ── 유틸 ────────────────────────────────────────────────── */
const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt   = n  => (+n).toLocaleString('ko-KR');

function showToast(msg, type = 'info') {
  const c = $('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'success' ? ' success' : type === 'error' ? ' error' : type === 'warning' ? ' warning' : '');
  const icon = { success:'✓', error:'✗', warning:'!', info:'i' }[type] || 'i';
  el.innerHTML = `<span style="font-weight:900;">${icon}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
window.showToast = showToast;

const SESSION_KEY = 'baeshdev.session';
const ACCOUNTS_KEY = 'baeshdev.accounts';
const PROJECT_KEY = 'baeshdev.project';
const GYM_PROMPT = '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.';

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}
function getSession() { return loadJson(SESSION_KEY, null); }
function setSession(user) { saveJson(SESSION_KEY, user); }
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PROJECT_KEY);
}

function getAccounts() { return loadJson(ACCOUNTS_KEY, []); }
function saveAccounts(list) { saveJson(ACCOUNTS_KEY, list); }

function ensureDemoAccount() {
  const list = getAccounts();
  if (!list.some((a) => a.email === 'demo@baesh.dev')) {
    list.push({ name: '데모', email: 'demo@baesh.dev', password: 'baeshdev' });
    saveAccounts(list);
  }
}

function platformSignup(name, email, password) {
  email = (email || '').trim().toLowerCase();
  if (!name || name.trim().length < 2) return '이름을 입력해 주세요.';
  if (!email.includes('@')) return '이메일을 확인해 주세요.';
  if (!password || password.length < 4) return '비밀번호는 4자 이상이에요.';
  const list = getAccounts();
  if (list.some((a) => a.email === email)) return '이미 있는 계정이에요. 로그인해 주세요.';
  const user = { name: name.trim(), email, password };
  list.push(user);
  saveAccounts(list);
  setSession({ name: user.name, email: user.email });
  return '';
}

function platformLogin(email, password) {
  email = (email || '').trim().toLowerCase();
  const acc = getAccounts().find((a) => a.email === email);
  if (!acc) return '계정이 없어요. 먼저 만들어 주세요.';
  if (acc.password !== password) return '비밀번호가 달라요.';
  setSession({ name: acc.name, email: acc.email });
  return '';
}

function openModal(id)  { $(id)?.classList.add('open'); }
function closeModal(id) { $(id)?.classList.remove('open'); }
window.closeModal = closeModal;

function svgIcon(path, size = 16) {
  return `<svg style="width:${size}px;height:${size}px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;" viewBox="0 0 24 24">${path}</svg>`;
}

/* ── 라우터 ──────────────────────────────────────────────── */
const SCREENS = ['overview','connections','infra','diagnostics','security','cost','deploy','monitor','history'];
let currentScreen = 'overview';

function navigate(id) {
  if (id === 'workspace') { openWorkspace(); return; }
  currentScreen = id;
  SCREENS.forEach(s => $('screen-' + s)?.classList.remove('active'));
  $('screen-' + id)?.classList.add('active');
  $$('.nav-item[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === id));
  const renders = {
    overview:    renderOverview,
    connections: renderConnections,
    infra:       renderInfra,
    diagnostics: renderDiagnostics,
    security:    renderSecurity,
    cost:        renderCost,
    deploy:      renderDeploy,
    monitor:     renderMonitor,
    history:     renderHistory,
  };
  renders[id]?.();
}
window.navigate = navigate;

/* ── 프로젝트 초기화 ─────────────────────────────────────── */
let wsInitialized = false;

function initProject(project, opts) {
  opts = opts || {};
  AppState.setProject(project);
  saveJson(PROJECT_KEY, project);
  wsInitialized = false;
  const msgs = $('chat-messages');
  if (msgs) { msgs.innerHTML = ''; delete msgs.dataset.initialized; }

  if (window.FitPreview && !opts.keepPreview) {
    FitPreview.reset({ auth: false, booking: true });
  }

  $('login-screen')?.classList.remove('active');
  $('new-project-screen').style.display = 'none';
  $('new-project-screen').classList.remove('active');
  $('app-shell').style.display = 'grid';
  paintUser();

  $('hdr-proj-name').textContent = project.name;
  updateEnvBadge();
  navigate('overview');
  openWorkspace();
  if (!opts.keepPreview) showToast('미리보기에서 사이트를 만들고 다듬을 수 있어요', 'info');
}

function backToNew() {
  $('app-shell').style.display = 'none';
  $('new-project-screen').style.display = 'flex';
  $('new-project-screen').classList.add('active');
}
window.backToNew = backToNew;

function paintUser() {
  const user = getSession();
  const name = user ? (user.name || user.email) : '';
  const hdr = $('hdr-user');
  const hdrName = $('hdr-user-name');
  const npUser = $('np-user');
  if (hdr) hdr.hidden = !user;
  if (hdrName) hdrName.textContent = name;
  if (npUser) npUser.textContent = user ? (name + ' · ' + user.email) : '';
}

function showLogin() {
  $('login-screen').classList.add('active');
  $('new-project-screen').classList.remove('active');
  $('new-project-screen').style.display = 'none';
  $('app-shell').style.display = 'none';
}

function showNewProject() {
  $('login-screen').classList.remove('active');
  $('new-project-screen').classList.add('active');
  $('new-project-screen').style.display = 'flex';
  $('app-shell').style.display = 'none';
  paintUser();
  const input = $('natural-input');
  if (input && !input.value.trim()) input.value = GYM_PROMPT;
}

function logout() {
  clearSession();
  if (window.FitPreview) FitPreview.reset({ auth: false, booking: true });
  showLogin();
  showToast('나갔어요', 'info');
}
window.logout = logout;

function updateEnvBadge() {
  const envMap = { production: ['운영', ''], staging: ['스테이징', 'staging'], dev: ['개발', 'dev'] };
  const [label, cls] = envMap[AppState.currentEnv] || ['운영', ''];
  [$('hdr-env-badge'), $('ws-env-badge')].forEach(el => {
    if (!el) return;
    el.textContent = label;
    el.className = 'env-badge' + (cls ? ' ' + cls : '');
  });
}

/* ── 배지 갱신 ───────────────────────────────────────────── */
function refreshBadges() {
  const diagFail = DIAGNOSTIC_ITEMS.filter(d => ['fail','warn'].includes(d.status) && !d.fixedNow).length;
  const secHigh  = SECURITY_ISSUES.filter(s => ['critical','high'].includes(s.severity) && !s.fixed).length;
  const disconn  = CONNECTION_SERVICES.filter(s => s.status !== 'connected').length;
  $('badge-conn')?.textContent && ($('badge-conn').textContent = disconn);
  $('badge-diag')?.textContent && ($('badge-diag').textContent = diagFail);
  $('badge-sec')?.textContent  && ($('badge-sec').textContent  = secHigh);
  $('badge-mon')?.textContent  && ($('badge-mon').textContent  = MONITOR_DATA.errorsToday);
}

/* ══════════════════════════════════════════════════════════
   개요 화면
   ══════════════════════════════════════════════════════════ */
function renderOverview() {
  const p = AppState.currentProject;
  if (!p) return;
  $('ov-title').textContent = p.name;
  $('ov-sub').textContent   = p.description;

  // 흐름 단계
  const steps = [
    { label:'아이디어 설명', done:true },
    { label:'서비스 개발',   done:true },
    { label:'인프라 연결',   active:true, nav:'connections' },
    { label:'배포 전 점검',  nav:'diagnostics' },
    { label:'배포',          nav:'deploy' },
    { label:'운영 및 개선',  nav:'monitor' },
  ];
  $('flow-bar').innerHTML = steps.map(s => `
    <div class="flow-step ${s.done?'done':s.active?'active':''}" onclick="navigate('${s.nav||'overview'}')">
      <div class="flow-step-num">${s.done ? '완료' : s.active ? '진행 중' : '대기'}</div>
      <div class="flow-step-name">${s.label}</div>
    </div>`).join('');

  // 상태 카드
  const nodes = Object.values(AppState.infraNodes);
  const connected = nodes.filter(n => n.connected).length;
  const issues    = nodes.filter(n => ['warn','error','missing'].includes(n.status)).length;
  const secUnfixed = SECURITY_ISSUES.filter(s => !s.fixed).length;
  const diagFail  = DIAGNOSTIC_ITEMS.filter(d => d.status === 'fail' && !d.fixedNow).length;

  $('ov-stats').innerHTML = [
    statCard('서비스 상태', '정상', '마지막 확인 5분 전', 'var(--green)'),
    statCard('인프라 연결', `${connected}/${nodes.length}`, issues > 0 ? issues + '개 확인 필요' : '모두 정상', issues > 0 ? 'var(--amber)' : 'var(--green)'),
    statCard('보안 이슈',   secUnfixed + '건', '미수정 항목', secUnfixed > 0 ? 'var(--red)' : 'var(--green)'),
    statCard('배포 준비',   diagFail + '개 미해결', '배포 전 확인 필요', diagFail > 0 ? 'var(--amber)' : 'var(--green)'),
  ].join('');

  // 알림
  const alerts = [];
  if (!AppState.infraNodes.email?.connected)
    alerts.push({ cls:'ib-amber', text:'이메일 서비스가 연결되지 않아 예약 확인 이메일이 발송되지 않아요.', btn:'연결하기', nav:'connections' });
  if (secUnfixed > 0)
    alerts.push({ cls:'ib-amber', text:`수정되지 않은 보안 이슈가 ${secUnfixed}건 있어요. 배포 전 확인하세요.`, btn:'보안 점검', nav:'security' });
  if (diagFail > 0)
    alerts.push({ cls:'ib-amber', text:`배포 준비 항목 ${diagFail}건이 미해결 상태예요.`, btn:'진단 보기', nav:'diagnostics' });

  $('ov-alerts').innerHTML = alerts.map(a => `
    <div class="info-box ${a.cls} mb-8" style="justify-content:space-between;">
      <span>${a.text}</span>
      <button class="btn btn-secondary btn-sm" style="flex-shrink:0;" onclick="navigate('${a.nav}')">${a.btn}</button>
    </div>`).join('');

  // 최근 활동
  $('ov-log').innerHTML = AppState.changeLog.slice(0,5).map(cl => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.84rem;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;margin-bottom:1px;color:var(--title);">${cl.title}</div>
        <div style="color:var(--muted);font-size:.75rem;">${cl.time} · ${cl.actor}</div>
      </div>
      <span class="tag ${cl.status === 'success' ? 'tag-green' : 'tag-red'}">${cl.status === 'success' ? '성공' : '실패'}</span>
    </div>`).join('');

  // 할 일
  const todos = [
    !AppState.infraNodes.email?.connected && { text:'이메일 서비스를 연결해야 예약 알림이 발송돼요.', btn:'연결하기', nav:'connections' },
    DIAGNOSTIC_ITEMS.find(d => d.status === 'fail' && !d.fixedNow && d.id === 'diag-002') && { text:'운영 환경 환경변수 2개가 누락됐어요.', btn:'진단 보기', nav:'diagnostics' },
    SECURITY_ISSUES.find(s => s.severity === 'critical' && !s.fixed) && { text:'심각한 보안 이슈 1건을 먼저 수정하세요.', btn:'수정하기', nav:'security' },
    { text:'모든 점검이 완료되면 운영 환경에 배포하세요.', btn:'배포 준비', nav:'deploy' },
  ].filter(Boolean);

  $('ov-todo').innerHTML = todos.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;font-size:.84rem;color:var(--body);">${t.text}</div>
      <button class="btn btn-secondary btn-sm" onclick="navigate('${t.nav}')">${t.btn}</button>
    </div>`).join('');
}

function statCard(label, value, sub, color) {
  return `<div class="stat-card">
    <div class="stat-label">${label}</div>
    <div class="stat-value" style="color:${color};font-size:1.35rem;">${value}</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════
   워크스페이스
   ══════════════════════════════════════════════════════════ */
function openWorkspace() {
  const ws = $('ws-overlay');
  ws.style.display = 'flex';
  if (!wsInitialized) { buildWorkspace(); wsInitialized = true; }
  else renderWsInfra();
}
function closeWorkspace() { $('ws-overlay').style.display = 'none'; }
window.closeWorkspace = closeWorkspace;

function buildWorkspace() {
  const p = AppState.currentProject;
  $('ws-proj-name').textContent = p ? p.name : '';
  $('chat-proj').textContent = p ? p.name : '';
  updateEnvBadge();

  // 탭 전환
  $$('.ws-tab', $('ws-tabs')).forEach(tab => {
    tab.onclick = () => {
      $$('.ws-tab').forEach(t => t.classList.remove('active'));
      $$('.ws-panel').forEach(pp => pp.classList.remove('active'));
      tab.classList.add('active');
      $('ws-' + tab.dataset.panel)?.classList.add('active');
    };
  });

  // 채팅 토글
  $('ws-chat-toggle').onclick = () => {
    const chat = $('chat-panel');
    const body = $('ws-body');
    const hide = chat.style.display !== 'none';
    chat.style.display = hide ? 'none' : 'flex';
    body.style.gridTemplateColumns = hide ? '1fr' : '1fr var(--chat-w)';
  };

  buildPreview();
  buildFileTree();
  renderWsInfra();
  buildLogs();
  initChat();
}

function buildPreview() {
  const url = $('ws-preview-url');
  const p = AppState.currentProject;
  if (url) url.textContent = (p && p.url) ? p.url.replace(/^https?:\/\//, '') : 'hangangfit.baesh.dev';
  if (window.FitPreview) FitPreview.mount($('ws-preview-body'));
}

const FILE_SAMPLES = {
  '[id].ts': `// pages/api/reservations/[id].ts\n// 수정됨: undefined 체크 추가\nimport { requireAuth } from '@/middleware/auth'\n\nexport default requireAuth(async (req, res) => {\n  const { id } = req.query\n  const reservation = await db.reservations.findById(id)\n  if (!reservation) {\n    return res.status(404).json({ error: 'Not found' })\n  }\n  await db.reservations.delete(id)\n  res.json({ success: true })\n})`,
  'users.ts': `// pages/api/admin/users.ts\n// ⚠️ 보안: 인증 미들웨어 없음\nexport default async function handler(req, res) {\n  const users = await db.query("SELECT * FROM users")\n  res.json(users)\n}`,
  'config.ts': `// lib/config.ts\n// ❌ 심각 보안: 하드코딩된 시크릿\nexport const STRIPE_KEY = "sk_live_aBcDeFgH..."\nexport const DB_PASS = "mypassword123"`,
  'middleware.ts': `// middleware.ts\nimport { NextResponse } from 'next/server'\nimport { verifyToken } from '@/lib/auth'\n\nexport async function middleware(req) {\n  if (req.nextUrl.pathname.startsWith('/admin')) {\n    const token = req.cookies.get('auth-token')?.value\n    if (!token || !await verifyToken(token))\n      return NextResponse.redirect(new URL('/login', req.url))\n  }\n  return NextResponse.next()\n}`,
};

function buildFileTree() {
  const files = [
    { name:'pages', type:'dir', children:[
      { name:'api', type:'dir', children:[
        { name:'reservations', type:'dir', children:[{ name:'index.ts', changed:true },{ name:'[id].ts', changed:true }]},
        { name:'admin', type:'dir', children:[{ name:'users.ts', issue:true },{ name:'dashboard.ts', changed:true }]},
        { name:'auth', type:'dir', children:[{ name:'callback.ts' }]},
      ]},
      { name:'login.tsx' },{ name:'signup.tsx' },{ name:'index.tsx', changed:true },
    ]},
    { name:'lib', type:'dir', children:[
      { name:'auth.ts', changed:true },{ name:'config.ts', issue:true },{ name:'supabase.ts' },
    ]},
    { name:'middleware.ts', changed:true },
    { name:'.env.local', secret:true },
    { name:'package.json' },
  ];

  function build(nodes, depth = 0) {
    return nodes.map(n => {
      if (n.type === 'dir') return `
        <div style="padding-left:${depth*12+8}px;">
          <div style="padding:3px 8px;font-size:.78rem;font-weight:700;color:#475569;cursor:pointer;display:flex;align-items:center;gap:4px;" onclick="this.nextSibling.style.display=this.nextSibling.style.display==='none'?'block':'none'">
            ${svgIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',12)} ${n.name}
          </div>
          <div>${build(n.children||[], depth+1)}</div>
        </div>`;
      const badges = (n.changed ? '<span style="width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block;flex-shrink:0;"></span>' : '') +
                     (n.issue  ? '<span style="width:5px;height:5px;border-radius:50%;background:var(--red);display:inline-block;flex-shrink:0;"></span>' : '') +
                     (n.secret ? '<span style="font-size:.6rem;color:var(--muted);">●</span>' : '');
      return `<div onclick="loadFile('${n.name}')" style="padding:3px 8px 3px ${depth*12+20}px;font-size:.78rem;cursor:pointer;display:flex;align-items:center;gap:5px;color:var(--ink-2);border-radius:4px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <span style="flex:1;">${n.name}</span>${badges}</div>`;
    }).join('');
  }
  $('file-tree').innerHTML = build(files);
}

window.loadFile = function(name) {
  const code = FILE_SAMPLES[name] || `// ${name}\n// 전체 내용은 데모에서 표시되지 않아요.`;
  const viewer = $('code-viewer');
  if (viewer) viewer.innerHTML = `<div style="font-family:'SF Mono','Fira Code',monospace;font-size:.8rem;color:#E2E8F0;line-height:1.8;white-space:pre-wrap;">${escHtml(code)}</div>`;
};

function renderWsInfra() {
  const nodes = Object.values(AppState.infraNodes);
  $('ws-infra-body').innerHTML = `<div class="grid-2" style="gap:8px;">${nodes.map(n => `
    <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fff;border:1.5px solid var(--border);border-radius:var(--r-sm);">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:.82rem;color:var(--title);">${n.label}</div>
        <div style="font-size:.72rem;color:var(--muted);">${n.provider}</div>
      </div>
      <span class="dot ${n.status==='ok'?'dot-ok':n.status==='missing'?'dot-idle':'dot-warn'}"></span>
    </div>`).join('')}</div>`;
}

function buildLogs() {
  const logs = [
    { t:'11:42:03', lv:'INFO',    m:'Build completed: 2.4s' },
    { t:'11:42:09', lv:'SUCCESS', m:'Deployment completed — v0.4.1' },
    { t:'11:22:05', lv:'ERROR',   m:'TypeError: Cannot read properties of undefined at /api/reservations/cancel' },
    { t:'11:22:05', lv:'INFO',    m:'POST /api/reservations/cancel 500 (42ms)' },
    { t:'10:45:12', lv:'WARN',    m:'GET /api/admin/stats 404' },
    { t:'10:30:01', lv:'INFO',    m:'GET /api/reservations 200 (18ms)' },
  ];
  const colors = { INFO:'#64748B', ERROR:'#F87171', SUCCESS:'#34D399', WARN:'#FBB024' };
  $('log-content').innerHTML = logs.map(l =>
    `<div><span style="color:#475569;">[${l.t}]</span> <span style="font-weight:700;color:${colors[l.lv]||'#64748B'};">[${l.lv}]</span> ${escHtml(l.m)}</div>`
  ).join('\n');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── AI 채팅 ─────────────────────────────────────────────── */
let chatBusy = false;
const AI_SCRIPTS = {
  login: [
    { role:'ai', text:'현재 프로젝트를 확인했어요. 인증 서비스를 붙여 로그인·가입이 되게 만들게요.' },
    { role:'ai', text:'pages/login.tsx, pages/signup.tsx, middleware.ts 파일을 수정할게요.', status:'working' },
    { role:'ai', text:'완료했어요.\n\n미리보기에서 바로 가입하고 로그인할 수 있어요.\n\n**변경된 내용:**\n• /login 로그인 폼\n• /signup 회원가입 폼\n• 예약은 로그인한 사람만 가능', status:'done', previewSwitch:'login' },
  ],
  book: [
    { role:'ai', text:'수업 예약 화면을 미리보기에 붙일게요.', status:'working' },
    { role:'ai', text:'완료했어요. 수업 카드를 고르고 시간을 고르면 예약이 확정됩니다. 로그인이 아직이면 먼저 로그인을 추가해 주세요.', status:'done', previewSwitch:'book' },
  ],
  mobile: [
    { role:'ai', text:'모바일 화면 레이아웃 문제를 확인할게요.', status:'analyzing' },
    { role:'ai', text:'styles/mobile.css에서 overflow 설정을 수정할게요.', status:'working' },
    { role:'ai', text:'완료했어요. 버튼 컨테이너의 overflow와 패딩을 조정했어요.', status:'done' },
  ],
  error: [
    { role:'ai', text:'로그와 최근 변경 내역을 함께 분석할게요.', status:'analyzing' },
    { role:'ai', text:'**확인된 사실:**\n• /api/reservations/cancel 에서 발생\n• 최근 배포(cl-008) 이후 처음 나타남\n\n**추정 원인:**\n존재하지 않는 예약 ID 요청 시 undefined 반환 → .id 접근 오류\n\n**추가 확인 필요:**\n• 실제 요청 파라미터 값\n• 해당 ID가 DB에 존재하는지\n\n수정할까요?', status:'done' },
  ],
  cost: [
    { role:'ai', text:'연결된 서비스를 기준으로 월 비용을 계산했어요.\n\n**확인된 항목:**\n• Vercel Hobby: ₩0\n• Supabase Free: ₩0 (500MB 초과 시 유료)\n\n**미연결로 알 수 없는 항목:**\n• 이메일 서비스 (미연결)\n• 파일 저장소 (미연결)\n\n비용 탭에서 상세 예측을 확인하세요.', status:'done' },
  ],
  default: [
    { role:'ai', text:'요청을 분석하고 있어요.', status:'analyzing' },
    { role:'ai', text:'미리보기에서 로그인·예약을 직접 눌러 볼 수 있어요.\n\n이렇게 말해 보세요.\n• 로그인 기능 추가해줘\n• 예약 붙여줘\n• 최근 오류 원인 설명해줘', status:'done' },
  ],
};

function initChat() {
  const msgs = $('chat-messages');
  if (msgs.dataset.initialized) return;
  msgs.dataset.initialized = '1';

  addMsg('ai', '안녕하세요. 한강핏 미리보기가 열려 있어요.\n\n채팅으로 기능을 붙이면 왼쪽에서 바로 로그인하고 예약해 볼 수 있어요.');

  $('chat-sugs').innerHTML = [
    '로그인 기능 추가해줘',
    '예약 붙여줘',
    '최근 오류 원인 설명해줘',
    '이번 달 운영비 알려줘',
  ].map(s => `<button class="chat-sug" onclick="sendChat('${s}')">${s}</button>`).join('');

  $('chat-send').onclick = () => {
    const v = $('chat-input').value.trim();
    if (v) sendChat(v);
  };
  $('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('chat-send').click(); }
  });
  $('chat-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 110) + 'px';
  });
}

function addMsg(role, text, status) {
  const msgs = $('chat-messages');
  const div  = document.createElement('div');
  div.className = 'chat-msg ' + role;

  const html = text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  let statusHtml = '';
  if (status) {
    const labels = { analyzing:'분석 중...', working:'수정 중...', done:'완료', failed:'실패' };
    const spinnerOrNot = (status === 'analyzing' || status === 'working')
      ? '<div class="spinner"></div>' : (status === 'done' ? '✓' : '✗');
    const cls = { analyzing:'cs-analyzing', working:'cs-working', done:'cs-done', failed:'cs-failed' }[status];
    statusHtml = `<div class="chat-status ${cls}">${spinnerOrNot} ${labels[status]}</div>`;
  }
  div.innerHTML = `
    <div class="chat-av ${role}">${role==='ai'?'AI':'U'}</div>
    <div><div class="chat-bubble">${html}</div>${statusHtml}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

async function sendChat(text) {
  if (chatBusy) return;
  chatBusy = true;
  $('chat-input').value = '';
  $('chat-input').style.height = 'auto';
  addMsg('user', text);

  let key = 'default';
  if (/로그인|회원가입|auth/i.test(text))      key = 'login';
  else if (/예약|수업|잡아/i.test(text))         key = 'book';
  else if (/모바일|버튼|잘림/i.test(text))      key = 'mobile';
  else if (/오류|에러|원인|이유/i.test(text))   key = 'error';
  else if (/비용|요금|얼마/i.test(text))        key = 'cost';

  const script = AI_SCRIPTS[key] || AI_SCRIPTS.default;
  for (let i = 0; i < script.length; i++) {
    await sleep(i === 0 ? 700 : 1100);
    const m = script[i];
    addMsg('ai', m.text, m.status || null);
    if (m.status === 'working' && key === 'login') await showCodeDiff();
    if (m.previewSwitch === 'login') {
      if (window.FitPreview) FitPreview.enableAuth();
      AppState.changeLog.unshift({
        id:'cl-ws-'+Date.now(), type:'code', actor:'AI',
        title:'로그인 / 회원가입 기능 추가',
        detail:'pages/login.tsx, signup.tsx, middleware.ts 추가. 미리보기에서 가입·로그인이 됩니다.',
        time:new Date().toLocaleString('ko-KR'), status:'success',
        reversible:true, files:['pages/login.tsx','pages/signup.tsx','middleware.ts'], env:'production',
      });
      if (AppState.infraNodes.auth) {
        AppState.updateNode('auth', { status: 'ok', connected: true, provider: 'Supabase Auth' });
      }
    }
    if (m.previewSwitch === 'book') {
      if (window.FitPreview) FitPreview.enableBooking();
      AppState.changeLog.unshift({
        id:'cl-ws-'+Date.now(), type:'code', actor:'AI',
        title:'수업 예약 추가',
        detail:'수업 선택·시간 선택·예약 확정이 미리보기에서 동작합니다.',
        time:new Date().toLocaleString('ko-KR'), status:'success',
        reversible:true, files:['pages/book.tsx','pages/api/reservations/index.ts'], env:'production',
      });
    }
  }
  chatBusy = false;
}
window.sendChat = sendChat;

async function showCodeDiff() {
  const msgs = $('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg ai';
  div.innerHTML = `
    <div class="chat-av ai">AI</div>
    <div style="max-width:92%;">
      <div style="font-size:.73rem;font-weight:700;color:var(--muted);margin-bottom:3px;">pages/login.tsx</div>
      <div class="code-block" style="max-height:130px;overflow-y:auto;">
        <span class="c-cmt">// 새로 추가된 파일</span>
        <span class="c-key">import</span> { supabase } <span class="c-key">from</span> <span class="c-str">'@/lib/supabase'</span>
        <span class="c-key">export default function</span> <span class="c-fn">LoginPage</span>() {
          <span class="c-key">const</span> handleLogin = <span class="c-key">async</span> (email, pw) => {
            <span class="c-key">const</span> { error } = <span class="c-key">await</span> supabase.auth.signInWithPassword({ email, password: pw })
            <span class="c-key">if</span> (!error) router.push(<span class="c-str">'/dashboard'</span>)
          }
          <span class="c-key">return</span> &lt;LoginForm onSubmit={handleLogin} /&gt;
        }
      </div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

/* ══════════════════════════════════════════════════════════
   연결 관리
   ══════════════════════════════════════════════════════════ */
function renderConnections() {
  const groups = {};
  CONNECTION_SERVICES.forEach(s => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  });

  let html = '';
  Object.entries(groups).forEach(([, svcs]) => {
    html += `<div style="font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 6px;">${svcs[0].categoryLabel}</div>`;
    svcs.forEach(s => { html += connCard(s); });
  });
  $('conn-list').innerHTML = html;
  refreshBadges();
}

function connCard(s) {
  const stMap = { connected:['tag-green','연결됨'], disconnected:['tag-gray','미연결'], error:['tag-red','오류'] };
  const [stTag, stLabel] = stMap[s.status] || ['tag-gray','알 수 없음'];
  const accLabel = { readwrite:'읽기 + 변경', readonly:'읽기 전용' }[s.access] || '';
  return `
    <div class="conn-card ${s.status}">
      <div class="conn-icon">${s.icon}</div>
      <div class="conn-body">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:2px;">
          <span class="conn-name">${s.name}</span>
          <span class="tag ${stTag}">${stLabel}</span>
          ${s.status==='connected'&&accLabel ? `<span class="tag tag-blue" style="font-size:.64rem;">${accLabel}</span>` : ''}
        </div>
        <div class="conn-desc">${s.description}</div>
        ${s.status==='connected' ? `<div class="conn-meta">계정: <strong>${s.account}</strong> · 워크스페이스: <strong>${s.workspace}</strong> · 권한: ${s.permissions.join(', ')} · 확인: ${s.lastChecked}</div>` : '<div class="conn-meta">연결된 계정 없음</div>'}
      </div>
      <div class="conn-actions">
        ${s.status==='connected'
          ? `<button class="btn btn-secondary btn-sm" onclick="checkConn('${s.id}')">확인</button><button class="btn btn-secondary btn-sm" onclick="disconnectSvc('${s.id}')">해제</button>`
          : `<button class="btn btn-primary btn-sm" onclick="connectSvc('${s.id}')">연결</button>`}
      </div>
    </div>`;
}

window.connectSvc = function(id) {
  const svc = CONNECTION_SERVICES.find(s => s.id === id);
  if (!svc) return;
  $('conn-modal-title').textContent = svc.name + ' 연결';
  $('conn-modal-body').innerHTML = `
    <div class="info-box ib-amber mb-12">
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:var(--amber);fill:none;stroke-width:2;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
      <span>데모 모드예요. 실제 연결이 이루어지지 않아요.</span>
    </div>
    <div class="form-group">
      <label class="form-label">API 키 / 액세스 토큰</label>
      <input class="form-input" type="password" placeholder="입력한 키는 암호화되어 저장돼요" value="demo-key-****">
      <div class="form-hint">인증 정보는 채팅·로그에 노출되지 않아요.</div>
    </div>
    <div class="form-group">
      <label class="form-label">접근 권한</label>
      <select class="form-select"><option value="readonly">읽기 전용 (권장)</option><option value="readwrite">읽기 + 변경</option></select>
    </div>`;
  $('conn-confirm').onclick = () => {
    svc.status = 'connected'; svc.account = 'demo'; svc.workspace = 'demo-project';
    svc.permissions = ['읽기']; svc.lastChecked = '방금 전'; svc.access = 'readonly';
    closeModal('modal-conn');
    renderConnections();
    if (id === 'resend') AppState.updateNode('email', { status:'ok', connected:true, provider:'Resend' });
    if (id === 'aws')    AppState.updateNode('storage', { status:'ok', connected:true, provider:'AWS S3' });
    showToast(svc.name + ' 연결 완료 (데모)', 'success');
    refreshBadges();
  };
  openModal('modal-conn');
};

window.disconnectSvc = function(id) {
  const svc = CONNECTION_SERVICES.find(s => s.id === id);
  if (!svc) return;
  if (!confirm(`${svc.name} 연결을 해제할까요? (데모)`)) return;
  svc.status = 'disconnected'; svc.account = null; svc.workspace = null;
  svc.permissions = []; svc.lastChecked = null; svc.access = null;
  renderConnections();
  showToast(svc.name + ' 연결 해제 (데모)', 'warning');
  refreshBadges();
};

window.checkConn = function(id) {
  showToast(CONNECTION_SERVICES.find(s=>s.id===id)?.name + ' 연결 확인 중...', 'info');
  setTimeout(() => showToast('정상 연결 확인됨 (데모)', 'success'), 1200);
};

/* ══════════════════════════════════════════════════════════
   인프라 지도
   ══════════════════════════════════════════════════════════ */
let infraMode = '2d';

function renderInfra() {
  const canvas = $('infra-canvas');
  drawInfra2D(canvas);
  renderNodeList();

  $('map-toggle').onclick = () => {
    infraMode = infraMode === '2d' ? '3d' : '2d';
    $('map-toggle').textContent = infraMode === '2d' ? '3D 뷰' : '2D 지도';
    infraMode === '3d' ? drawInfra3D(canvas) : drawInfra2D(canvas);
  };
}

function drawInfra2D(container) {
  const nodes = AppState.infraNodes;
  const edges = buildEdges(nodes);

  // SVG 라인
  const svgLines = edges.map(([a, b]) => {
    const na = nodes[a], nb = nodes[b];
    if (!na || !nb) return '';
    const x1 = na.x + 55, y1 = na.y + 40, x2 = nb.x + 55, y2 = nb.y + 40;
    const confirmed = na.connected && nb.connected;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="infra-edge${confirmed?' confirmed':''}"/>`;
  }).join('');

  // 노드 HTML
  const nodesHtml = Object.values(nodes).map(n => `
    <div class="infra-node ${n.status}${!n.connected?' missing':''}"
      style="left:${n.x}px;top:${n.y}px;min-width:110px;"
      onclick="showNodeDetail('${n.id}')">
      <div class="infra-node-icon">${n.icon}</div>
      <div class="infra-node-label">${n.label}</div>
      <div class="infra-node-status">${n.provider}</div>
      ${n.issues?.length ? '<div style="font-size:.64rem;color:var(--amber);margin-top:2px;">확인 필요</div>' : ''}
      ${!n.connected ? '<div style="font-size:.64rem;color:var(--muted);margin-top:2px;">연결 필요</div>' : ''}
    </div>`).join('');

  container.innerHTML = `
    <svg class="infra-svg">${svgLines}</svg>
    ${nodesHtml}
    <div class="infra-detail" id="infra-detail"></div>`;
}

function drawInfra3D(container) {
  const nodes = Object.values(AppState.infraNodes);
  container.style.background = 'var(--bg-sub)';
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;perspective:1200px;">
      <div style="position:relative;width:520px;height:380px;transform-style:preserve-3d;">
        ${nodes.map((n, i) => {
          const cols = 4, x = (i%cols)*130+20, y = Math.floor(i/cols)*130+20, z = i%2===0?40:-40;
          return `<div style="position:absolute;left:${x}px;top:${y}px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:12px;padding:12px;text-align:center;width:110px;transform:rotateX(28deg) rotateY(-12deg) translateZ(${z}px);box-shadow:0 ${z>0?12:4}px ${z>0?28:10}px rgba(15,23,42,${z>0?.12:.06});cursor:pointer;transition:.3s;font-size:.78rem;" onclick="showNodeDetail('${n.id}')" onmouseover="this.style.transform='rotateX(28deg) rotateY(-12deg) translateZ(${z+18}px) scale(1.04)'" onmouseout="this.style.transform='rotateX(28deg) rotateY(-12deg) translateZ(${z}px)'">
            <div style="font-size:1.2rem;margin-bottom:4px;">${n.icon}</div>
            <div style="font-weight:700;color:var(--title);">${n.label}</div>
            <div style="color:var(--muted);font-size:.68rem;margin-top:2px;">${n.provider}</div>
            <span class="dot ${n.status==='ok'?'dot-ok':n.status==='missing'?'dot-idle':'dot-warn'}" style="margin:4px auto 0;display:block;"></span>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="infra-detail" id="infra-detail"></div>`;
}

function buildEdges(nodes) {
  const seen = new Set();
  const edges = [];
  Object.values(nodes).forEach(n => {
    (n.connections||[]).forEach(c => {
      const key = [n.id,c].sort().join('-');
      if (!seen.has(key)) { seen.add(key); edges.push([n.id, c]); }
    });
  });
  return edges;
}

window.showNodeDetail = function(id) {
  const n = AppState.infraNodes[id];
  if (!n) return;
  const panels = document.querySelectorAll('.infra-detail');
  const stMap = { ok:'tag-green 정상', warn:'tag-amber 확인 필요', error:'tag-red 오류', missing:'tag-gray 연결 필요', checking:'tag-blue 확인 중' };
  const [stTag, stLabel] = (stMap[n.status]||'tag-gray 알 수 없음').split(' ');
  panels.forEach(panel => {
    panel.classList.add('open');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="font-size:1.2rem;">${n.icon}</span>
          <strong style="font-size:.95rem;">${n.label}</strong>
        </div>
        <button onclick="document.querySelectorAll('.infra-detail').forEach(p=>p.classList.remove('open'))" style="cursor:pointer;font-size:1rem;color:var(--muted);background:none;border:none;">×</button>
      </div>
      <div style="font-size:.8rem;line-height:1.6;color:var(--body);margin-bottom:12px;">${n.description}</div>
      <div style="display:flex;flex-direction:column;gap:7px;font-size:.8rem;">
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">상태</span><span class="tag ${stTag}">${stLabel}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">제공</span><span style="font-weight:600;">${n.provider}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">리전</span><span>${n.region}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">월 비용</span><span style="font-weight:700;color:${n.cost!==null?'var(--primary)':'var(--muted)'};">${n.cost!==null?'₩'+fmt(n.cost):'알 수 없음 (미연결)'}</span></div>
      </div>
      ${n.issues?.length ? `<div class="info-box ib-amber mt-8"><svg style="width:13px;height:13px;stroke:var(--amber);fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><div>${n.issues.join('<br>')}</div></div>` : ''}
      ${!n.connected ? `<button class="btn btn-primary btn-sm w-full mt-8" onclick="document.querySelectorAll('.infra-detail').forEach(p=>p.classList.remove('open'));navigate('connections')">연결하러 가기</button>` : ''}
      <div style="font-size:.7rem;color:var(--muted);margin-top:8px;">연결: ${(n.connections||[]).join(', ')||'없음'}</div>`;
  });
};

function renderNodeList() {
  const statusLabel = { ok:'정상', warn:'확인 필요', error:'오류', missing:'연결 필요' };
  $('infra-node-list').innerHTML = Object.values(AppState.infraNodes).map(n => `
    <div class="card card-sm" style="cursor:pointer;" onclick="showNodeDetail('${n.id}')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:1.2rem;">${n.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:.85rem;">${n.label}</div>
          <div style="font-size:.72rem;color:var(--muted);">${n.type}</div>
        </div>
        <span class="dot ${n.status==='ok'?'dot-ok':n.status==='missing'?'dot-idle':'dot-warn'}"></span>
      </div>
      <div style="font-size:.75rem;color:var(--body);">${n.provider}</div>
      <div style="font-size:.72rem;margin-top:3px;font-weight:700;color:${n.status==='ok'?'var(--green)':n.status==='missing'?'var(--muted)':'var(--amber)'};">${statusLabel[n.status]||n.status}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   배포 준비 진단
   ══════════════════════════════════════════════════════════ */
function renderDiagnostics() {
  const items = DIAGNOSTIC_ITEMS;
  const fail = items.filter(d=>d.status==='fail'&&!d.fixedNow).length;
  const warn = items.filter(d=>d.status==='warn'&&!d.fixedNow).length;
  const ok   = items.filter(d=>d.status==='ok'||d.fixedNow).length;

  $('diag-summary').innerHTML = [
    statCard('필수 미해결', fail+'건', '배포 전 필수', fail>0?'var(--red)':'var(--green)'),
    statCard('확인 권장',   warn+'건', '가능한 해결 권장', warn>0?'var(--amber)':'var(--green)'),
    statCard('통과',        ok+'건',   '정상 확인', 'var(--green)'),
    statCard('전체',        items.length+'건', '점검 항목', 'var(--primary)'),
  ].join('');

  $('diag-items').innerHTML = items.map(d => {
    const fixed = d.fixedNow;
    const sc = fixed?'ok':d.status;
    const ic = fixed?'✓':d.status==='fail'?'✗':d.status==='warn'?'!':'✓';
    return `
      <div class="check-item ${sc}" id="diag-${d.id}">
        <div class="check-icon" style="color:${sc==='ok'?'var(--green)':sc==='fail'?'var(--red)':'var(--amber)'}">${ic}</div>
        <div class="check-body">
          <div class="check-title">
            ${d.title}
            ${!d.confirmed?'<span class="tag tag-amber" style="font-size:.64rem;margin-left:6px;">추정 · 추가 확인 필요</span>':''}
            ${fixed?'<span class="tag tag-green" style="font-size:.64rem;margin-left:6px;">해결됨 (데모)</span>':''}
          </div>
          <div class="check-desc">${d.reason}</div>
          ${!fixed&&d.status!=='ok'?`
            <div style="margin-top:8px;font-size:.78rem;color:var(--body);">
              <strong>영향:</strong> ${d.impact}<br>
              <strong>해결:</strong> ${d.resolution}
              ${d.needsInput.length?`<br><strong>필요한 입력:</strong> ${d.needsInput.join(', ')}`:''}
            </div>
            <div style="margin-top:10px;display:flex;gap:8px;">
              ${d.autoFixable?`<button class="btn btn-primary btn-sm" onclick="fixDiag('${d.id}')">AI로 해결</button>`:''}
              <button class="btn btn-secondary btn-sm" onclick="navigate('connections')">수동 설정</button>
            </div>`:''}
        </div>
      </div>`;
  }).join('');

  $('btn-rediag').onclick = () => {
    showToast('진단 재실행 중... (데모)', 'info');
    setTimeout(() => { showToast('진단 완료 (데모)', 'success'); refreshBadges(); }, 1600);
  };
  refreshBadges();
}

window.fixDiag = async function(id) {
  const item = DIAGNOSTIC_ITEMS.find(d=>d.id===id);
  if (!item) return;
  showToast('AI가 자동으로 해결 중... (데모)', 'info');
  await sleep(1500);
  item.fixedNow = true;
  renderDiagnostics();
  showToast(item.title + ' 해결 완료 (데모)', 'success');
  AppState.changeLog.unshift({ id:'cl-diag-'+Date.now(), type:'infra', actor:'AI', title:'[자동 수정] '+item.title, detail:item.resolution, time:new Date().toLocaleString('ko-KR'), status:'success', reversible:false, files:[], env:'production' });
  refreshBadges();
};

/* ══════════════════════════════════════════════════════════
   보안 점검
   ══════════════════════════════════════════════════════════ */
function renderSecurity() {
  const issues = SECURITY_ISSUES;
  const unfixed = issues.filter(s=>!s.fixed);
  const cnt = { critical:0, high:0, medium:0, low:0 };
  unfixed.forEach(s => { cnt[s.severity] = (cnt[s.severity]||0)+1; });

  $('sec-summary').innerHTML = [
    statCard('심각', cnt.critical+'건', '즉시 수정 필요', cnt.critical>0?'var(--red)':'var(--green)'),
    statCard('높음', cnt.high+'건',    '배포 전 권장', cnt.high>0?'var(--amber)':'var(--green)'),
    statCard('보통', cnt.medium+'건',  '가능한 빨리', cnt.medium>0?'var(--amber)':'var(--green)'),
    statCard('낮음', cnt.low+'건',     '여유 있을 때', 'var(--muted)'),
  ].join('');

  const sevColor = { critical:'var(--red)', high:'var(--amber)', medium:'var(--amber)', low:'var(--green)' };
  const sevTag   = { critical:'sev-critical', high:'sev-high', medium:'sev-medium', low:'sev-low' };

  $('sec-list').innerHTML = issues.map(s => `
    <div class="card mb-16" style="border-left:4px solid ${sevColor[s.severity]||'var(--border)'};${s.fixed?'opacity:.6;':''}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <div>
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;">
            <span class="tag ${sevTag[s.severity]}">${s.severityLabel}</span>
            ${s.fixed?'<span class="tag tag-green">수정됨 (데모)</span>':''}
            <span style="font-weight:800;">${s.title}</span>
          </div>
          <div style="font-size:.82rem;color:var(--body);">${s.description}</div>
        </div>
        ${!s.fixed?`<button class="btn ${s.canAutoFix?'btn-primary':'btn-secondary'} btn-sm" style="flex-shrink:0;" onclick="openSecFix('${s.id}')">${s.canAutoFix?'수정':'확인'}</button>`:''}
      </div>
      <div class="grid-2" style="font-size:.8rem;gap:10px;">
        <div><div style="color:var(--muted);font-weight:700;margin-bottom:3px;font-size:.72rem;">영향</div>${s.impact}</div>
        <div><div style="color:var(--muted);font-weight:700;margin-bottom:3px;font-size:.72rem;">판단 근거</div>${s.basis}</div>
      </div>
    </div>`).join('');

  refreshBadges();
}

window.openSecFix = function(id) {
  const s = SECURITY_ISSUES.find(i=>i.id===id);
  if (!s) return;
  $('sec-fix-title').textContent = s.title;
  $('sec-fix-body').innerHTML = `
    <div class="info-box ib-amber mb-12">
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:var(--amber);fill:none;stroke-width:2;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
      <span>변경 전후를 확인하고 적용하세요. <strong>운영 중인 서비스에 영향을 줄 수 있어요.</strong></span>
    </div>
    <div style="font-size:.82rem;margin-bottom:12px;color:var(--body);">${s.resolution}</div>
    ${s.before?`<div style="font-size:.78rem;font-weight:700;color:var(--red);margin-bottom:3px;">변경 전</div><div class="code-block mb-12">${escHtml(s.before)}</div>`:''}
    <div style="font-size:.78rem;font-weight:700;color:var(--green);margin-bottom:3px;">변경 후</div>
    <div class="code-block">${escHtml(s.after)}</div>`;
  $('sec-fix-confirm').textContent = s.canAutoFix ? '자동 수정 적용 (데모)' : '수정 완료 표시 (데모)';
  $('sec-fix-confirm').onclick = async () => {
    closeModal('modal-sec-fix');
    showToast('보안 수정 적용 중... (데모)', 'info');
    await sleep(1100);
    s.fixed = true;
    renderSecurity();
    showToast(s.title + ' 수정 완료 (데모)', 'success');
    AppState.changeLog.unshift({ id:'cl-sec-'+Date.now(), type:'security', actor:'AI', title:'[보안 수정] '+s.title, detail:s.resolution, time:new Date().toLocaleString('ko-KR'), status:'success', reversible:true, files:[], env:'production' });
    refreshBadges();
  };
  openModal('modal-sec-fix');
};

/* ══════════════════════════════════════════════════════════
   비용 현황
   ══════════════════════════════════════════════════════════ */
const costParams = { users:200, storage:0.2, emails:500 };

function renderCost() {
  refreshCostUI();

  const sliders = [
    { key:'users',   label:'월 방문자 수',   min:10,  max:5000,  step:10,  unit:'명',  hint:'방문자 수 외에도 기능·데이터 크기에 따라 달라요.' },
    { key:'storage', label:'저장 용량 (GB)', min:0.1, max:20,    step:0.1, unit:'GB',  hint:'DB + 파일 합산 예상 용량이에요.' },
    { key:'emails',  label:'월 발송 이메일', min:0,   max:10000, step:100, unit:'건',  hint:'이메일 서비스 미연결 시 실제 비용은 알 수 없어요.' },
  ];

  $('cost-sliders').innerHTML = sliders.map(s => `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:.82rem;font-weight:600;color:var(--body);margin-bottom:6px;">
        <span>${s.label}</span>
        <strong id="cv-${s.key}" style="color:var(--primary);">${fmt(costParams[s.key])}${s.unit}</strong>
      </div>
      <input type="range" class="slider" id="sl-${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${costParams[s.key]}">
      <div class="form-hint">${s.hint}</div>
    </div>`).join('');

  sliders.forEach(s => {
    const el = document.getElementById('sl-' + s.key);
    if (!el) return;
    el.addEventListener('input', () => {
      costParams[s.key] = +el.value;
      const v = document.getElementById('cv-' + s.key);
      if (v) v.textContent = el.value + s.unit;
      refreshCostUI();
    });
  });
}

function refreshCostUI() {
  const c = calcCost(costParams.users, costParams.storage, costParams.emails);

  $('cost-stats').innerHTML = [
    statCard('이번 달 예상', '₩'+fmt(c.total), '알 수 있는 항목 합계', c.total>100000?'var(--amber)':'var(--green)'),
    statCard('서비스 운영비', '₩'+fmt(c.total-c.platform), '외부 인프라 합계', 'var(--title)'),
    statCard('플랫폼 이용료', '₩'+fmt(c.platform), 'BAESHDEV 월 요금 (가정)', 'var(--primary)'),
    statCard('알 수 없음', c.unknown.length+'항목', '미연결 서비스', 'var(--muted)'),
  ].join('');

  const rows = [
    { name:'Vercel', desc:'서버/실행환경', cost:c.vercel, known:true },
    { name:'Supabase (DB)', desc:'데이터베이스', cost:c.supabase_db, known:true },
    { name:'이메일 서비스', desc:'발송 (미연결)', cost:null, known:false },
    { name:'AI 모델 사용', desc:'생성형 AI API', cost:c.ai_usage, known:true },
    { name:'BAESHDEV 플랫폼', desc:'이용료 (가정)', cost:c.platform, known:true },
  ];

  $('cost-table').innerHTML = `
    <div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;">통화: KRW · 월 기준 · 환율 1USD=1,350원 (데모 가정) · 갱신: 실시간</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="font-size:.72rem;color:var(--muted);border-bottom:1.5px solid var(--border);">
        <th style="text-align:left;padding:7px;">서비스</th>
        <th style="text-align:left;padding:7px;">설명</th>
        <th style="text-align:right;padding:7px;">예상 월 비용</th>
      </tr></thead>
      <tbody>${rows.map(r=>`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:9px 7px;font-weight:700;font-size:.84rem;">${r.name}</td>
        <td style="padding:9px 7px;color:var(--body);font-size:.8rem;">${r.desc}</td>
        <td style="padding:9px 7px;text-align:right;font-weight:700;font-size:.84rem;color:${!r.known?'var(--muted)':r.cost===0?'var(--green)':'var(--title)'};">${!r.known?'알 수 없음':'₩'+fmt(r.cost)}</td>
      </tr>`).join('')}
      <tr style="background:var(--bg-sub);font-weight:900;"><td colspan="2" style="padding:10px 7px;">합계 (알 수 있는 항목)</td><td style="padding:10px 7px;text-align:right;font-size:1rem;">₩${fmt(c.total)}</td></tr>
      </tbody>
    </table>`;

  $('cost-tips').innerHTML = [
    { t:'Vercel Hobby 무료 플랜 유지', n:'현재 방문자 수 기준 무료 플랜 적용 가능해요.', impact:'없음', risk:'낮음' },
    { t:'Resend 무료 플랜', n:'월 3,000건 무료 → 현재 예상 발송량 내 무료예요.', impact:'없음', risk:'낮음' },
  ].map(tip=>`
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:.875rem;margin-bottom:2px;">${tip.t}</div>
        <div style="font-size:.8rem;color:var(--body);margin-bottom:4px;">${tip.n}</div>
        <div style="font-size:.75rem;display:flex;gap:12px;color:var(--body);"><span>영향: <strong>${tip.impact}</strong></span><span>위험도: <strong>${tip.risk}</strong></span></div>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   배포 관리
   ══════════════════════════════════════════════════════════ */
let deployEnv = 'production';
let deployRunning = false;

function renderDeploy() {
  updateEnvSwitcher();
  renderPreflight();
  renderDeployHist();
}

function updateEnvSwitcher() {
  ['dev','staging','prod'].forEach(e => {
    const el = $('env-'+e);
    if (!el) return;
    const match = e === 'prod' ? deployEnv === 'production' : deployEnv === e;
    el.style.background = match ? 'var(--cta)' : '';
    el.style.color = match ? 'var(--on-cta)' : '';
  });
}

window.switchEnv = function(env) {
  deployEnv = env; AppState.currentEnv = env;
  updateEnvSwitcher(); updateEnvBadge(); renderPreflight();
  showToast(`환경 전환: ${env} (데모)`, 'info');
};

function renderPreflight() {
  const failCount = DIAGNOSTIC_ITEMS.filter(d=>d.status==='fail'&&!d.fixedNow).length;
  const secCrit   = SECURITY_ISSUES.filter(s=>s.severity==='critical'&&!s.fixed).length;
  const envLabel  = { dev:'개발', staging:'스테이징', production:'운영' }[deployEnv];
  const ready     = failCount === 0 && secCrit === 0;

  $('preflight-content').innerHTML = `
    <div class="grid-2 mb-16" style="font-size:.84rem;">
      <div><div style="color:var(--muted);font-size:.72rem;margin-bottom:3px;">배포 버전</div><strong>v0.4.2-draft</strong></div>
      <div><div style="color:var(--muted);font-size:.72rem;margin-bottom:3px;">대상 환경</div><strong>${envLabel}</strong></div>
      <div><div style="color:var(--muted);font-size:.72rem;margin-bottom:3px;">마지막 배포</div><strong>v0.4.1 (2026-09-09 11:42)</strong></div>
      <div><div style="color:var(--muted);font-size:.72rem;margin-bottom:3px;">DB 변경</div><strong style="color:var(--amber);">마이그레이션 1건 대기</strong></div>
    </div>
    <div style="margin-bottom:14px;">
      ${[
        { ok:failCount===0, label:'배포 준비 진단', detail:failCount>0?`${failCount}건 미해결`:'통과' },
        { ok:secCrit===0,   label:'심각 보안 이슈', detail:secCrit>0?`${secCrit}건 미수정`:'없음' },
        { ok:true,          label:'빌드 설정',      detail:'정상' },
        { ok:true,          label:'도메인/HTTPS',   detail:'정상' },
        { ok:false,         label:'DB 마이그레이션', detail:'실행 필요 (확인 후 진행)' },
      ].map(item=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
        <span style="color:${item.ok?'var(--green)':'var(--amber)'};font-weight:700;">${item.ok?'✓':'!'}</span>
        <span style="flex:1;">${item.label}</span>
        <span style="color:${item.ok?'var(--green)':'var(--amber)'};">${item.detail}</span>
      </div>`).join('')}
    </div>
    ${!ready?`<div class="info-box ib-amber"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:var(--amber);fill:none;stroke-width:2;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><span>미해결 항목이 있어요. 배포 진행 시 문제가 발생할 수 있어요.</span></div>`:`<div class="info-box ib-green"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:var(--green);fill:none;stroke-width:2;flex-shrink:0;"><polyline points="20,6 9,17 4,12"/></svg><span>배포 준비가 완료됐어요.</span></div>`}`;

  $('deploy-btns').innerHTML = `
    <button class="btn btn-secondary" onclick="navigate('diagnostics')">진단 확인</button>
    <button class="btn btn-primary" onclick="startDeploy()" ${deployRunning?'disabled':''}>배포 시작</button>`;
}

function renderDeployHist() {
  const hist = AppState.changeLog.filter(c=>c.type==='deploy').slice(0,5);
  $('deploy-history').innerHTML = hist.map(d=>`
    <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);font-size:.84rem;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;">${d.title}</div>
        <div style="font-size:.75rem;color:var(--muted);">${d.time} · ${d.env||'production'}</div>
      </div>
      <span class="tag ${d.status==='success'?'tag-green':'tag-red'}">${d.status==='success'?'성공':'실패'}</span>
      ${d.reversible?`<button class="btn btn-secondary btn-sm" onclick="openRollback('${d.id}')">롤백</button>`:''}
    </div>`).join('');
}

window.startDeploy = async function() {
  if (deployRunning) return;
  deployRunning = true;
  $('deploy-progress-card').style.display = 'block';
  renderPreflight();

  const steps = [
    { label:'빌드', desc:'소스 코드 빌드 및 최적화 중...' },
    { label:'리소스 준비', desc:'CDN 및 엣지 네트워크 준비 중...' },
    { label:'배포', desc:'운영 환경에 배포 중...' },
    { label:'실행 상태 확인', desc:'서비스 응답 확인 중...' },
  ];

  for (let i = 0; i < steps.length; i++) {
    $('deploy-steps').innerHTML = steps.map((s,j)=>`
      <div class="deploy-step">
        <div class="deploy-num ${j<i?'done':j===i?'active':''}">${j<i?'✓':j+1}</div>
        <div><div style="font-weight:700;font-size:.875rem;">${s.label}</div>
        <div style="font-size:.8rem;color:var(--body);">${j===i?s.desc:j<i?'완료':'대기'}</div></div>
      </div>`).join('');
    await sleep(1300);
  }

  $('deploy-steps').innerHTML = `<div class="info-box ib-green"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:var(--green);fill:none;stroke-width:2;"><polyline points="20,6 9,17 4,12"/></svg><div><strong>배포 완료 (데모)</strong><br><span style="font-size:.8rem;">https://demo-fitcenter.baeshdev.app · v0.4.2 · ${new Date().toLocaleString('ko-KR')}</span></div></div>
    <button class="btn btn-secondary btn-sm mt-8" onclick="$('deploy-progress-card').style.display='none'">닫기</button>`;

  AppState.changeLog.unshift({ id:'cl-dep-'+Date.now(), type:'deploy', actor:'User', title:'v0.4.2 배포 완료 (데모)', detail:'최신 변경 사항 배포', time:new Date().toLocaleString('ko-KR'), status:'success', reversible:true, files:[], env:deployEnv });
  deployRunning = false;
  renderDeployHist();
  showToast('배포 완료 (데모)', 'success');
};

window.openRollback = function(id) {
  const item = AppState.changeLog.find(c=>c.id===id);
  if (!item) return;
  $('rollback-body').innerHTML = `
    <div class="info-box ib-red mb-12"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:var(--red);fill:none;stroke-width:2;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><div><strong>주의:</strong> 애플리케이션 코드를 이전 버전으로 되돌려요. <strong>데이터베이스 변경은 자동으로 롤백되지 않아요.</strong></div></div>
    <div style="font-size:.875rem;"><div style="margin-bottom:6px;"><strong>롤백 대상:</strong> ${item.title}</div><div style="color:var(--body);">${item.detail}</div></div>`;
  $('rollback-confirm').onclick = async () => {
    closeModal('modal-rollback');
    showToast('롤백 실행 중... (데모)', 'warning');
    await sleep(1600);
    showToast('롤백 완료 (데모) — DB 변경은 별도 확인 필요', 'success');
    AppState.changeLog.unshift({ id:'cl-rb-'+Date.now(), type:'deploy', actor:'User', title:'롤백: '+item.title, detail:'이전 버전 롤백 (데모)', time:new Date().toLocaleString('ko-KR'), status:'success', reversible:false, files:[], env:deployEnv });
  };
  openModal('modal-rollback');
};

/* ══════════════════════════════════════════════════════════
   운영 모니터링
   ══════════════════════════════════════════════════════════ */
function renderMonitor() {
  const d = MONITOR_DATA;
  $('mon-stats').innerHTML = [
    statCard('서비스 상태', '정상', '응답 중', 'var(--green)'),
    statCard('평균 응답', d.avgResponseMs+'ms', '오늘 기준 (데모)', d.avgResponseMs<300?'var(--green)':'var(--amber)'),
    statCard('오류 (오늘)', d.errorsToday+'건', '확인 필요', d.errorsToday>0?'var(--red)':'var(--green)'),
    statCard('요청 수', fmt(d.requestsToday)+'건', '오늘 총합 (데모)', 'var(--primary)'),
  ].join('');

  const maxR = Math.max(...d.responseHistory);
  $('chart-resp').innerHTML = d.responseHistory.map(v=>`<div class="mini-bar" style="height:${Math.round(v/maxR*100)}%;" title="${v}ms"></div>`).join('');

  const maxE = Math.max(...d.errorHistory, 1);
  $('chart-err').innerHTML = d.errorHistory.map(v=>`<div class="mini-bar err" style="height:${Math.max(v>0?20:5,Math.round(v/maxE*100))}%;" title="${v}건"></div>`).join('');

  $('mon-errors').innerHTML = d.recentErrors.map(e=>`
    <div style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="showErrAnalysis('${e.id}')" onmouseover="this.style.background='var(--bg-sub)'" onmouseout="this.style.background=''">
      <span class="tag tag-red" style="font-size:.72rem;flex-shrink:0;">${e.code}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:.82rem;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.message}</div>
        <div style="font-size:.73rem;color:var(--muted);">${e.path} · ${e.time}</div>
        ${e.relatedChange?`<div style="font-size:.72rem;color:var(--amber);">최근 변경 후 발생: ${AppState.changeLog.find(c=>c.id===e.relatedChange)?.title||''}</div>`:''}
      </div>
      <span class="tag tag-gray">${e.count}회</span>
      <button class="btn btn-secondary btn-sm">AI 분석</button>
    </div>`).join('');
}

window.showErrAnalysis = function(id) {
  const e = MONITOR_DATA.recentErrors.find(e=>e.id===id);
  if (!e) return;
  const panel = $('mon-analysis');
  panel.style.display = 'block';
  $('mon-analysis-content').innerHTML = `
    <div class="info-box ib-blue mb-12"><svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:var(--primary);fill:none;stroke-width:2;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>확인된 사실, 추정 원인, 추가 확인 필요 항목을 구분해서 표시해요.</span></div>
    <div style="font-family:var(--font-mono);font-size:.8rem;background:#161615;color:#E8E6DF;padding:10px 12px;border-radius:4px;margin-bottom:12px;">${e.message}</div>
    <div class="grid-3" style="gap:10px;font-size:.8rem;">
      <div style="background:var(--green-soft);border-radius:4px;padding:12px;border-left:2px solid var(--green);">
        <div style="font-family:var(--font-mono);font-weight:500;color:var(--green);margin-bottom:6px;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;">Confirmed</div>
        <ul style="padding-left:12px;color:var(--ink-2);line-height:1.7;"><li>${e.path} 경로 발생</li>${e.relatedChange?'<li>최근 배포 후 처음 발생</li>':''}<li>총 ${e.count}회 발생</li></ul>
      </div>
      <div style="background:var(--amber-soft);border-radius:4px;padding:12px;border-left:2px solid var(--amber);">
        <div style="font-family:var(--font-mono);font-weight:500;color:var(--amber);margin-bottom:6px;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;">Estimated</div>
        <ul style="padding-left:12px;color:var(--ink-2);line-height:1.7;"><li>DB에서 찾을 수 없는 ID 요청 시 undefined 반환</li><li>undefined에 .id 접근 → TypeError</li></ul>
      </div>
      <div style="background:var(--bg);border-radius:4px;padding:12px;border-left:2px solid var(--line);">
        <div style="font-family:var(--font-mono);font-weight:500;color:var(--muted);margin-bottom:6px;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;">Needs check</div>
        <ul style="padding-left:12px;color:var(--body);line-height:1.7;"><li>실제 요청 파라미터 값</li><li>해당 ID가 DB에 존재하는지</li></ul>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-primary btn-sm" onclick="openWorkspace()">개발 공간에서 수정</button>
      <button class="btn btn-secondary btn-sm" onclick="navigate('history')">관련 변경 기록 보기</button>
    </div>`;
  panel.scrollIntoView({ behavior:'smooth' });
};

/* ══════════════════════════════════════════════════════════
   변경 기록
   ══════════════════════════════════════════════════════════ */
let histFilter = '전체';
const HIST_TYPES = ['전체','deploy','code','infra','security'];

window.setHistFilter = function(f) { histFilter = f; drawHistory(); };

function drawHistory() {
  const logs = histFilter === '전체' ? AppState.changeLog : AppState.changeLog.filter(c=>c.type===histFilter);
  const typeLabel = { deploy:'배포', code:'코드', infra:'인프라', security:'보안', create:'생성', config:'설정' };

  $('hist-filters').innerHTML = HIST_TYPES.map(t=>`
    <button class="btn ${t===histFilter?'btn-primary':'btn-secondary'} btn-sm" onclick="setHistFilter('${t}')">${t==='전체'?'전체':typeLabel[t]||t}</button>`).join('');

  $('hist-timeline').innerHTML = logs.map(c=>`
    <div class="timeline-item">
      <div class="timeline-dot ${c.status==='success'?(c.type==='deploy'?'green':'blue'):'red'}"></div>
      <div class="timeline-content">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
          <span class="tag tag-gray" style="font-size:.68rem;">${typeLabel[c.type]||c.type}</span>
          <span class="tag ${c.status==='success'?'tag-green':'tag-red'}">${c.status==='success'?'성공':'실패'}</span>
          ${c.env?`<span class="tag tag-blue" style="font-size:.65rem;">${c.env}</span>`:''}
        </div>
        <div class="timeline-title">${c.title}</div>
        <div style="font-size:.8rem;color:var(--body);margin-top:2px;">${c.detail}</div>
        ${c.files?.length?`<div style="font-size:.73rem;color:var(--muted);margin-top:3px;">파일: ${c.files.join(', ')}</div>`:''}
        <div class="timeline-meta">${c.time} · ${c.actor}</div>
        ${c.reversible?`<button class="btn btn-secondary btn-sm mt-8" onclick="openRollback('${c.id}')">이 시점으로 되돌리기</button>`:''}
      </div>
    </div>`).join('');
}

function renderHistory() { drawHistory(); }

/* ══════════════════════════════════════════════════════════
   AppState 이벤트 연동
   ══════════════════════════════════════════════════════════ */
AppState.on('infraChanged', () => {
  if (currentScreen === 'overview')    renderOverview();
  if (currentScreen === 'infra')       renderInfra();
  if (currentScreen === 'diagnostics') renderDiagnostics();
  refreshBadges();
  if (wsInitialized) renderWsInfra();
});

/* ══════════════════════════════════════════════════════════
   새 프로젝트 화면 초기화
   ══════════════════════════════════════════════════════════ */
function initNewProject() {
  // 탭
  $$('.tab-btn', $('np-tabs')).forEach(btn => {
    btn.onclick = () => {
      $$('.tab-btn', $('np-tabs')).forEach(b => b.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab)?.classList.add('active');
    };
  });

  // 템플릿 그리드
  let selectedTmpl = null;
  $('tmpl-grid').innerHTML = PROJECT_TEMPLATES.map(t=>`
    <div class="tmpl-card" data-id="${t.id}" onclick="selectTmpl('${t.id}')">
      <div style="font-size:1.5rem;margin-bottom:6px;">${t.emoji}</div>
      <div style="font-weight:800;margin-bottom:3px;font-size:.9rem;">${t.name}</div>
      <div style="font-size:.78rem;color:var(--body);margin-bottom:8px;">${t.description}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">${t.tags.map(g=>`<span class="tag tag-blue" style="font-size:.65rem;">${g}</span>`).join('')}</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:6px;">${t.stack}</div>
    </div>`).join('');

  window.selectTmpl = function(id) {
    selectedTmpl = id;
    $$('.tmpl-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
    $('btn-start-tmpl').style.display = 'inline-flex';
  };

  $('btn-start-tmpl').onclick = () => {
    const t = PROJECT_TEMPLATES.find(p=>p.id===selectedTmpl);
    if (t) initProject({ ...t, createdAt:new Date().toISOString().slice(0,10), env:'production', buildStatus:'passing', lastDeployed:'–', deployVersion:'v0.1.0' });
  };

  // 자연어 분석
  $('btn-analyze').onclick = async () => {
    const text = $('natural-input').value.trim();
    if (!text) { showToast('서비스 설명을 입력해 주세요', 'warning'); return; }
    $('btn-analyze').textContent = '분석 중...';
    $('btn-analyze').disabled = true;
    await sleep(1100);
    $('ai-analysis').style.display = 'block';
  $('ai-analysis').innerHTML = `
      <div class="info-box ib-blue" style="flex-direction:column;gap:10px;">
        <div style="font-weight:600;color:var(--ink);">분석 결과</div>
        <div class="grid-2" style="gap:10px;font-size:.82rem;">
          <div><strong style="color:var(--ink);">서비스 유형</strong><div>예약 관리 웹 서비스</div></div>
          <div><strong style="color:var(--ink);">예상 사용자</strong><div>소규모 (월 100~300명)</div></div>
          <div><strong style="color:var(--ink);">필요 기능</strong><div>회원가입·로그인, 예약 신청, 현황 관리</div></div>
          <div><strong style="color:var(--ink);">추천 구성</strong><div>Next.js + Supabase + Vercel<br><span style="color:var(--muted);font-size:.75rem;">월 5만원 이하 가능</span></div></div>
        </div>
      </div>`;
    $('btn-analyze').textContent = '다시 분석';
    $('btn-analyze').disabled = false;
    $('btn-start-natural').style.display = 'inline-flex';
  };

  $('btn-start-natural').onclick = () => initProject({
    ...DEFAULT_PROJECT,
    createdAt: new Date().toISOString().slice(0,10),
    env: 'production',
    buildStatus: 'passing',
    lastDeployed: '–',
    deployVersion: 'v0.1.0',
  });

  // 저장소 연결
  $('btn-start-repo').onclick = () => {
    const url = $('repo-url').value.trim();
    if (!url) { showToast('저장소 URL을 입력해 주세요', 'warning'); return; }
    showToast('저장소 분석 중... (데모)', 'info');
    setTimeout(() => initProject({ ...DEFAULT_PROJECT, repo:url }), 1100);
  };
}

/* ── 로그인 화면 ─────────────────────────────────────────── */
function initAuthScreen() {
  ensureDemoAccount();
  let signup = false;
  const form = $('auth-form');
  const toggle = $('auth-toggle');
  const demo = $('auth-demo');
  const err = $('auth-error');
  const nameWrap = $('auth-name-wrap');
  const submit = $('auth-submit');
  const lead = $('login-lead');

  function setMode(isSignup) {
    signup = isSignup;
    nameWrap.style.display = signup ? 'block' : 'none';
    submit.textContent = signup ? '계정 만들기' : '로그인';
    toggle.textContent = signup ? '이미 계정이 있어요' : '계정이 없나요? 만들기';
    $('auth-password').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
    if (lead) lead.textContent = signup
      ? '이름과 메일만 있으면 바로 만들 수 있어요.'
      : '계정으로 들어가 만들고, 배포하고, 운영합니다.';
    err.hidden = true;
  }

  function fail(msg) {
    err.hidden = false;
    err.textContent = msg;
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const email = $('auth-email').value;
    const password = $('auth-password').value;
    const name = $('auth-name').value;
    const msg = signup ? platformSignup(name, email, password) : platformLogin(email, password);
    if (msg) { fail(msg); return; }
    afterLogin();
  };

  toggle.onclick = () => setMode(!signup);
  demo.onclick = () => {
    const msg = platformLogin('demo@baesh.dev', 'baeshdev');
    if (msg) {
      platformSignup('데모', 'demo@baesh.dev', 'baeshdev');
    }
    afterLogin();
  };

  $('btn-logout')?.addEventListener('click', logout);
  $('np-logout')?.addEventListener('click', logout);
}

function afterLogin() {
  const saved = loadJson(PROJECT_KEY, null);
  const intent = new URLSearchParams(location.search).get('intent');
  paintUser();
    if (saved && intent !== 'make') {
    initProject(saved, { keepPreview: true });
    return;
  }
  showNewProject();
  showToast('들어가셨습니다. 만들고 싶은 서비스를 말해 주세요', 'success');
}

function boot() {
  initAuthScreen();
  initNewProject();
  const session = getSession();
  if (!session) {
    showLogin();
    return;
  }
  paintUser();
  const intent = new URLSearchParams(location.search).get('intent');
  const saved = loadJson(PROJECT_KEY, null);
  if (saved && intent !== 'make') initProject(saved, { keepPreview: true });
  else showNewProject();
}

/* ── 사이드바 이벤트 ──────────────────────────────────────── */
$$('.nav-item[data-nav]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.nav));
});

/* ── DOMContentLoaded ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  boot();
});
