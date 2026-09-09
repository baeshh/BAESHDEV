/* ============================================================
   BAESHDEV Platform — Demo Data & State Store
   실제 연동 없이 UI와 로직을 시연하기 위한 데모 데이터입니다.
   ============================================================ */

'use strict';

/* ── 전역 상태 ─────────────────────────────────────────────── */
const AppState = {
  currentProject: null,
  currentEnv: 'production',   // 'dev' | 'staging' | 'production'
  chatHistory: [],
  infraNodes: {},              // id → node 상태 (실시간 업데이트)
  deployHistory: [],
  changeLog: [],
  securityIssues: [],
  diagnosticItems: [],

  /* 화면 전환 시 연동할 변경 카운터 */
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  },
  setProject(project) {
    this.currentProject = project;
    this.infraNodes = buildInfraNodes(project);
    this.changeLog  = buildChangeLog(project);
    this.emit('projectChanged', project);
  },
  updateNode(id, patch) {
    if (!this.infraNodes[id]) return;
    Object.assign(this.infraNodes[id], patch);
    this.emit('infraChanged', { id, node: this.infraNodes[id] });
  },
};

/* ── 예시 프로젝트 템플릿 ────────────────────────────────── */
const PROJECT_TEMPLATES = [
  {
    id: 'hangangfit',
    name: '한강핏',
    emoji: '🌅',
    description: '회원가입과 예약이 되는 운동시설 사이트. 강남·성수 지점, 당일 예약.',
    stack: 'Next.js + Supabase + Vercel',
    monthlyBudget: 50000,
    users: 200,
    features: ['회원가입 / 로그인', '수업 예약', '내 예약 확인', '지점·강사 안내'],
    tags: ['웹앱', '예약', '로그인'],
  },
  {
    id: 'portfolio',
    name: '포트폴리오 사이트',
    emoji: '🎨',
    description: '작품을 소개하고 문의를 받는 개인 포트폴리오 웹사이트',
    stack: 'HTML/CSS + Vercel',
    monthlyBudget: 0,
    users: 50,
    features: ['작품 갤러리', '소개 페이지', '문의 폼'],
    tags: ['정적', '포트폴리오'],
  },
  {
    id: 'ecommerce',
    name: '소규모 쇼핑몰',
    emoji: '🛒',
    description: '상품 등록, 장바구니, 주문 관리를 갖춘 커머스 서비스',
    stack: 'Next.js + Stripe + PostgreSQL',
    monthlyBudget: 150000,
    users: 500,
    features: ['상품 목록 / 상세', '장바구니', '결제 (Stripe)', '주문 관리'],
    tags: ['커머스', '결제'],
  },
  {
    id: 'blog',
    name: '블로그 플랫폼',
    emoji: '✍️',
    description: '마크다운 기반 블로그 포스팅과 구독 기능',
    stack: 'Astro + Supabase',
    monthlyBudget: 20000,
    users: 1000,
    features: ['포스트 작성 / 발행', '구독 이메일', '댓글', 'RSS'],
    tags: ['콘텐츠', '블로그'],
  },
];

/* ── 기본 프로젝트 초기값 (예약 관리) ─────────────────────── */
const DEFAULT_PROJECT = {
  ...PROJECT_TEMPLATES[0],
  createdAt: '2026-09-01',
  env: 'production',
  url: 'https://hangangfit.baesh.dev',
  repo: 'github.com/demo/hangangfit',
  buildStatus: 'passing',
  lastDeployed: '2026-09-09 11:42',
  deployVersion: 'v0.4.1',
};

/* ── 인프라 노드 빌더 ────────────────────────────────────── */
function buildInfraNodes(project) {
  return {
    frontend: {
      id: 'frontend',
      label: '프론트엔드',
      description: '사용자가 접속하는 화면이에요. 버튼, 폼, 페이지 등 눈에 보이는 모든 것을 담당해요.',
      type: 'Frontend',
      status: 'ok',       // ok | warn | error | missing | checking
      provider: 'Vercel',
      region: '한국 (서울)',
      cost: 0,
      costUnit: '월',
      issues: [],
      connections: ['api', 'cdn'],
      x: 180, y: 100,
      connected: true,
    },
    api: {
      id: 'api',
      label: 'API 서버',
      description: '프론트엔드와 데이터베이스 사이에서 요청을 처리하는 백엔드 서버예요.',
      type: 'Backend',
      status: 'ok',
      provider: 'Vercel (Serverless)',
      region: '한국 (서울)',
      cost: 0,
      costUnit: '월',
      issues: [],
      connections: ['frontend', 'database', 'auth'],
      x: 420, y: 180,
      connected: true,
    },
    database: {
      id: 'database',
      label: '데이터베이스',
      description: '회원정보와 예약 내역을 저장하는 공간이에요.',
      type: 'Database',
      status: 'warn',
      provider: 'Supabase (PostgreSQL)',
      region: '한국 (서울)',
      cost: 25000,
      costUnit: '월',
      issues: ['외부 IP 접근 제한 미설정'],
      connections: ['api'],
      x: 620, y: 100,
      connected: true,
    },
    auth: {
      id: 'auth',
      label: '인증 서비스',
      description: '로그인, 회원가입, 비밀번호 재설정을 처리하는 서비스예요.',
      type: 'Auth',
      status: 'ok',
      provider: 'Supabase Auth',
      region: '–',
      cost: 0,
      costUnit: '월',
      issues: [],
      connections: ['api', 'email'],
      x: 620, y: 280,
      connected: true,
    },
    email: {
      id: 'email',
      label: '이메일 발송',
      description: '예약 확인, 알림, 비밀번호 재설정 이메일을 보내는 서비스예요.',
      type: 'Email',
      status: 'missing',
      provider: '연결 안 됨',
      region: '–',
      cost: null,
      costUnit: '월',
      issues: ['이메일 발송 서비스가 연결되지 않았어요. 알림 기능이 작동하지 않아요.'],
      connections: ['auth'],
      x: 820, y: 180,
      connected: false,
    },
    storage: {
      id: 'storage',
      label: '파일 저장소',
      description: '이미지, 문서 등 파일을 저장하고 불러오는 공간이에요.',
      type: 'Storage',
      status: 'missing',
      provider: '연결 안 됨',
      region: '–',
      cost: null,
      costUnit: '월',
      issues: ['파일 저장 서비스가 연결되지 않았어요.'],
      connections: ['api'],
      x: 420, y: 340,
      connected: false,
    },
    domain: {
      id: 'domain',
      label: '도메인 / HTTPS',
      description: '서비스 주소(URL)와 안전한 연결(HTTPS)을 제공해요.',
      type: 'Domain',
      status: 'ok',
      provider: 'Vercel (자동 발급)',
      region: '–',
      cost: 0,
      costUnit: '월',
      issues: [],
      connections: ['frontend'],
      x: 50, y: 200,
      connected: true,
    },
    cdn: {
      id: 'cdn',
      label: 'CDN',
      description: '전 세계 어디서나 빠르게 접속할 수 있도록 콘텐츠를 분산해서 제공해요.',
      type: 'CDN',
      status: 'ok',
      provider: 'Vercel Edge',
      region: '글로벌',
      cost: 0,
      costUnit: '월',
      issues: [],
      connections: ['frontend'],
      x: 50, y: 60,
      connected: true,
    },
  };
}

/* ── 변경 기록 ───────────────────────────────────────────── */
function buildChangeLog(project) {
  return [
    {
      id: 'cl-009',
      type: 'deploy',
      actor: 'AI',
      title: 'v0.4.1 배포 완료',
      detail: '관리자 대시보드 예약 통계 차트 추가, 모바일 버튼 오버플로 수정',
      time: '2026-09-09 11:42',
      status: 'success',
      reversible: true,
      files: ['pages/admin/dashboard.tsx', 'components/ReservationChart.tsx', 'styles/mobile.css'],
      env: 'production',
    },
    {
      id: 'cl-008',
      type: 'code',
      actor: 'AI',
      title: '예약 취소 API 추가',
      detail: 'DELETE /api/reservations/:id 엔드포인트 구현 및 취소 확인 이메일 훅 연결',
      time: '2026-09-08 16:21',
      status: 'success',
      reversible: true,
      files: ['pages/api/reservations/[id].ts', 'lib/email.ts'],
      env: 'production',
    },
    {
      id: 'cl-007',
      type: 'infra',
      actor: 'User',
      title: 'Supabase 데이터베이스 연결',
      detail: 'PostgreSQL 인스턴스 연결 및 환경변수 설정 완료',
      time: '2026-09-07 10:05',
      status: 'success',
      reversible: false,
      files: ['.env.local'],
      env: 'production',
    },
    {
      id: 'cl-006',
      type: 'security',
      actor: 'AI',
      title: 'JWT secret 환경변수 이동',
      detail: '코드에 하드코딩된 JWT_SECRET을 환경변수로 이동 완료',
      time: '2026-09-07 09:48',
      status: 'success',
      reversible: true,
      files: ['lib/auth.ts'],
      env: 'production',
    },
    {
      id: 'cl-005',
      type: 'code',
      actor: 'AI',
      title: '관리자 페이지 인증 미들웨어 추가',
      detail: '/admin 하위 경로 전체에 인증 미들웨어 적용',
      time: '2026-09-06 14:30',
      status: 'success',
      reversible: true,
      files: ['middleware.ts'],
      env: 'production',
    },
    {
      id: 'cl-004',
      type: 'deploy',
      actor: 'User',
      title: 'v0.3.0 배포',
      detail: '예약 목록 페이지, 상태 변경 기능 출시',
      time: '2026-09-05 18:00',
      status: 'success',
      reversible: true,
      files: [],
      env: 'production',
    },
    {
      id: 'cl-003',
      type: 'code',
      actor: 'AI',
      title: '로그인 오류 수정',
      detail: 'Supabase auth 콜백 URL 불일치로 발생한 로그인 실패 수정',
      time: '2026-09-04 11:20',
      status: 'success',
      reversible: true,
      files: ['pages/api/auth/callback.ts', '.env.local'],
      env: 'production',
    },
    {
      id: 'cl-002',
      type: 'infra',
      actor: 'AI',
      title: '환경변수 누락 감지 및 추가 안내',
      detail: 'DATABASE_URL, SUPABASE_ANON_KEY 누락 감지 → 사용자 설정 안내 완료',
      time: '2026-09-03 09:10',
      status: 'success',
      reversible: false,
      files: [],
      env: 'production',
    },
    {
      id: 'cl-001',
      type: 'create',
      actor: 'User',
      title: '프로젝트 생성',
      detail: '"회원가입과 예약 기능이 있는 사이트를 만들어줘" 요청으로 프로젝트 생성',
      time: '2026-09-01 09:00',
      status: 'success',
      reversible: false,
      files: [],
      env: 'production',
    },
  ];
}

/* ── 보안 이슈 ───────────────────────────────────────────── */
const SECURITY_ISSUES = [
  {
    id: 'sec-001',
    severity: 'critical',
    severityLabel: '심각',
    title: '코드에 하드코딩된 시크릿 키',
    description: 'lib/config.ts 파일에 STRIPE_SECRET_KEY 값이 직접 작성되어 있어요.',
    impact: '저장소를 볼 수 있는 누구나 결제 API를 악용할 수 있어요.',
    basis: 'lib/config.ts 파일 정적 분석 결과 (데모)',
    resolution: '환경변수(.env)로 이동하고, .gitignore에 추가하세요.',
    canAutoFix: true,
    fixed: false,
    before: `// lib/config.ts\nexport const STRIPE_SECRET_KEY = "sk_live_aBcDeFgH1234...";\nexport const DB_PASSWORD = "mypassword123";`,
    after: `// lib/config.ts\nexport const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;\nexport const DB_PASSWORD = process.env.DB_PASSWORD!;\n// .env.local (gitignore에 포함)\n// STRIPE_SECRET_KEY=sk_live_...\n// DB_PASSWORD=...`,
    checkedAt: '2026-09-09 10:00 (데모)',
  },
  {
    id: 'sec-002',
    severity: 'high',
    severityLabel: '높음',
    title: '관리자 API에 인증 없음',
    description: '/api/admin/users 엔드포인트에 인증 미들웨어가 적용되지 않아요.',
    impact: '누구나 사용자 목록 조회와 계정 삭제를 요청할 수 있어요.',
    basis: 'pages/api/admin/users.ts 코드 분석 (데모)',
    resolution: '관리자 역할 확인 미들웨어를 추가하세요.',
    canAutoFix: true,
    fixed: false,
    before: `// pages/api/admin/users.ts\nexport default async function handler(req, res) {\n  const users = await db.query("SELECT * FROM users");\n  res.json(users);\n}`,
    after: `// pages/api/admin/users.ts\nimport { requireAdmin } from "@/middleware/auth";\n\nexport default requireAdmin(async function handler(req, res) {\n  const users = await db.query("SELECT * FROM users");\n  res.json(users);\n});`,
    checkedAt: '2026-09-09 10:00 (데모)',
  },
  {
    id: 'sec-003',
    severity: 'high',
    severityLabel: '높음',
    title: '데이터베이스 외부 접근 허용',
    description: 'Supabase 데이터베이스가 모든 IP(0.0.0.0/0)에서 접근 가능해요.',
    impact: '무차별 대입 공격이나 자격 증명 유출 시 직접 접근 가능해요.',
    basis: 'Supabase 연결 설정 확인 (데모)',
    resolution: '접근 가능한 IP 대역을 서버 IP로 제한하거나, 연결 풀러를 사용하세요.',
    canAutoFix: false,
    fixed: false,
    before: `허용 IP: 0.0.0.0/0 (모든 IP)\n포트 5432 공개`,
    after: `허용 IP: 서버 IP만\n포트 5432 비공개\n연결 풀러(PgBouncer) 사용`,
    checkedAt: '2026-09-09 10:00 (데모)',
  },
  {
    id: 'sec-004',
    severity: 'medium',
    severityLabel: '보통',
    title: '민감 정보가 포함된 로그',
    description: '에러 로그에 사용자 이메일, IP 주소가 그대로 기록되고 있어요.',
    impact: '로그 접근 권한이 있는 사람에게 개인정보가 노출될 수 있어요.',
    basis: 'logs/error.log 샘플 분석 (데모)',
    resolution: '로그에서 이메일, IP 등 개인식별정보를 마스킹 처리하세요.',
    canAutoFix: true,
    fixed: false,
    before: `ERROR: Login failed for user john@example.com from 192.168.1.100`,
    after: `ERROR: Login failed for user j***@***.com from [REDACTED]`,
    checkedAt: '2026-09-09 10:00 (데모)',
  },
  {
    id: 'sec-005',
    severity: 'low',
    severityLabel: '낮음',
    title: 'HTTPS 강제 리다이렉트 미설정',
    description: 'HTTP로 접속 시 HTTPS로 자동 전환되지 않아요.',
    impact: '사용자가 암호화되지 않은 연결로 접속할 수 있어요.',
    basis: 'Vercel 프로젝트 설정 확인 (데모)',
    resolution: 'vercel.json에 redirects 설정을 추가하세요.',
    canAutoFix: true,
    fixed: false,
    before: `// vercel.json\n{}`,
    after: `// vercel.json\n{\n  "redirects": [\n    {\n      "source": "http://:path*",\n      "destination": "https://:path*",\n      "permanent": true\n    }\n  ]\n}`,
    checkedAt: '2026-09-09 10:00 (데모)',
  },
];

/* ── 배포 준비 진단 항목 ──────────────────────────────────── */
const DIAGNOSTIC_ITEMS = [
  {
    id: 'diag-001',
    category: 'infra',
    status: 'fail',
    title: '이메일 발송 서비스 연결 없음',
    reason: '예약 확인, 알림 기능 코드가 존재하지만 이메일 서비스(SMTP/API)가 연결되지 않았어요.',
    impact: '예약 확인 이메일, 비밀번호 재설정 이메일이 발송되지 않아요.',
    resolution: 'Resend, SendGrid, Mailgun 중 하나를 연결하세요.',
    autoFixable: true,
    needsInput: ['이메일 서비스 API 키'],
    confirmed: true,
    fixedNow: false,
  },
  {
    id: 'diag-002',
    category: 'env',
    status: 'fail',
    title: '운영 환경 환경변수 누락',
    reason: 'NEXT_PUBLIC_API_URL, RESEND_API_KEY 2개가 운영 환경에 설정되지 않았어요.',
    impact: 'API 요청 실패, 이메일 발송 오류가 발생해요.',
    resolution: '플랫폼 환경변수 설정에서 해당 값을 추가하세요.',
    autoFixable: false,
    needsInput: ['NEXT_PUBLIC_API_URL', 'RESEND_API_KEY'],
    confirmed: true,
    fixedNow: false,
  },
  {
    id: 'diag-003',
    category: 'security',
    status: 'warn',
    title: '보안 점검 미완료 항목 2건',
    reason: '심각도 높음 이상 보안 이슈 2건이 수정되지 않았어요.',
    impact: '운영 배포 전 해결을 권장해요.',
    resolution: '보안 탭에서 수정 후 배포를 진행하세요.',
    autoFixable: true,
    needsInput: [],
    confirmed: true,
    fixedNow: false,
  },
  {
    id: 'diag-004',
    category: 'build',
    status: 'ok',
    title: '빌드 설정 확인',
    reason: 'package.json에 build 스크립트가 정상 설정되어 있어요.',
    impact: '없음',
    resolution: '없음',
    autoFixable: false,
    needsInput: [],
    confirmed: true,
    fixedNow: false,
  },
  {
    id: 'diag-005',
    category: 'domain',
    status: 'ok',
    title: '도메인 및 HTTPS 설정',
    reason: 'Vercel에서 자동 HTTPS 인증서가 발급되어 있어요.',
    impact: '없음',
    resolution: '없음',
    autoFixable: false,
    needsInput: [],
    confirmed: true,
    fixedNow: false,
  },
  {
    id: 'diag-006',
    category: 'db',
    status: 'warn',
    title: '데이터베이스 마이그레이션 미실행',
    reason: 'migrations/ 폴더에 실행되지 않은 스키마 변경이 1건 있어요. (데모 추정)',
    impact: '배포 후 일부 기능이 정상 작동하지 않을 수 있어요.',
    resolution: 'pnpm db:migrate 명령을 실행하거나 AI에게 요청하세요.',
    autoFixable: true,
    needsInput: [],
    confirmed: false,  // 추정 → 미확정
    fixedNow: false,
  },
];

/* ── 외부 연결 서비스 ─────────────────────────────────────── */
const CONNECTION_SERVICES = [
  {
    id: 'github',
    category: 'repo',
    categoryLabel: '저장소',
    name: 'GitHub',
    description: '코드를 저장하고 버전을 관리해요.',
    status: 'connected',
    account: 'baeshh',
    workspace: 'reservation-app',
    permissions: ['읽기', '쓰기', '웹훅'],
    lastChecked: '방금 전',
    access: 'readwrite',
  },
  {
    id: 'vercel',
    category: 'cloud',
    categoryLabel: '클라우드',
    name: 'Vercel',
    description: '프론트엔드와 서버리스 함수를 배포하고 운영해요.',
    status: 'connected',
    account: 'baeshh',
    workspace: 'reservation-app',
    permissions: ['읽기', '배포', '도메인 관리'],
    lastChecked: '3분 전',
    access: 'readwrite',
  },
  {
    id: 'supabase',
    category: 'db',
    categoryLabel: '데이터베이스',
    name: 'Supabase',
    description: 'PostgreSQL 기반 데이터베이스와 인증 서비스를 제공해요.',
    status: 'connected',
    account: 'baeshh',
    workspace: 'reservation-db',
    permissions: ['읽기', '쓰기', '스키마 변경'],
    lastChecked: '5분 전',
    access: 'readwrite',
  },
  {
    id: 'resend',
    category: 'email',
    categoryLabel: '이메일',
    name: 'Resend',
    description: '트랜잭션 이메일 발송 서비스예요. (예약 확인, 알림 등)',
    status: 'disconnected',
    account: null,
    workspace: null,
    permissions: [],
    lastChecked: null,
    access: null,
  },
  {
    id: 'sentry',
    category: 'monitoring',
    categoryLabel: '모니터링',
    name: 'Sentry',
    description: '에러와 성능 문제를 실시간으로 추적해요.',
    status: 'disconnected',
    account: null,
    workspace: null,
    permissions: [],
    lastChecked: null,
    access: null,
  },
  {
    id: 'cloudflare',
    category: 'domain',
    categoryLabel: '도메인',
    name: 'Cloudflare',
    description: 'DNS 관리 및 CDN, 보안 설정을 제공해요.',
    status: 'disconnected',
    account: null,
    workspace: null,
    permissions: [],
    lastChecked: null,
    access: null,
  },
  {
    id: 'stripe',
    category: 'payment',
    categoryLabel: '결제',
    name: 'Stripe',
    description: '결제 처리 서비스예요. (현재 프로젝트 미사용)',
    status: 'disconnected',
    account: null,
    workspace: null,
    permissions: [],
    lastChecked: null,
    access: null,
    unsupported: false,
  },
  {
    id: 'aws',
    category: 'cloud',
    categoryLabel: '클라우드',
    name: 'AWS S3',
    description: '파일과 미디어를 저장하는 오브젝트 스토리지예요.',
    status: 'disconnected',
    account: null,
    workspace: null,
    permissions: [],
    lastChecked: null,
    access: null,
  },
];

/* ── 운영 모니터링 데이터 ─────────────────────────────────── */
const MONITOR_DATA = {
  uptime: 99.8,
  avgResponseMs: 182,
  errorsToday: 3,
  requestsToday: 1247,
  responseHistory: [145,160,170,190,185,175,200,182,178,195,188,172,165,180,182],
  errorHistory:    [0,0,1,0,0,0,2,0,0,0,0,0,1,0,0],
  recentErrors: [
    {
      id: 'err-001',
      code: 500,
      message: 'TypeError: Cannot read properties of undefined (reading "id")',
      path: '/api/reservations/cancel',
      time: '2026-09-09 11:22',
      count: 2,
      relatedChange: 'cl-008',
    },
    {
      id: 'err-002',
      code: 404,
      message: 'Not Found: /api/admin/stats (경로 오타)',
      path: '/api/admin/stats',
      time: '2026-09-09 10:45',
      count: 1,
      relatedChange: null,
    },
  ],
};

/* ── AI 채팅 응답 시뮬레이터 ──────────────────────────────── */
const AI_RESPONSES = {
  'add_login': {
    status_steps: ['analyzing', 'working', 'done'],
    messages: [
      { role: 'ai', text: '현재 프로젝트 구조를 확인했어요. Supabase Auth가 이미 연결되어 있어서 로그인 기능을 빠르게 추가할 수 있어요.' },
      { role: 'ai', text: '다음 파일을 수정할게요:\n• pages/login.tsx — 로그인 폼 UI\n• pages/signup.tsx — 회원가입 폼 UI\n• middleware.ts — 인증 필요 페이지 보호\n• lib/auth.ts — Supabase Auth 유틸', status: 'working' },
      { role: 'ai', text: '완료했어요 ✅\n\n로그인, 회원가입 페이지와 인증 미들웨어를 추가했어요. 미리보기 탭에서 확인해 보세요.\n\n**변경된 내용:**\n• /login 경로에 로그인 폼 추가\n• /signup 경로에 회원가입 폼 추가\n• /dashboard는 로그인한 사용자만 접근 가능', status: 'done' },
    ],
    codeChange: {
      file: 'pages/login.tsx',
      before: null,
      after: `import { supabase } from '@/lib/supabase'\n\nexport default function LoginPage() {\n  const handleLogin = async (email, password) => {\n    const { error } = await supabase.auth.signInWithPassword(\n      { email, password }\n    )\n    if (!error) router.push('/dashboard')\n  }\n  return <LoginForm onSubmit={handleLogin} />\n}`,
    },
  },
  'fix_mobile': {
    status_steps: ['analyzing', 'working', 'done'],
    messages: [
      { role: 'ai', text: '모바일 화면에서 버튼이 잘리는 문제를 확인했어요. styles/mobile.css에서 overflow: hidden 설정이 원인이에요.' },
      { role: 'ai', text: 'styles/mobile.css 수정 중... (버튼 컨테이너 패딩 및 overflow 수정)', status: 'working' },
      { role: 'ai', text: '완료했어요 ✅\n\nstyles/mobile.css에서 overflow 설정을 수정했어요. 버튼이 모든 화면 크기에서 정상적으로 표시되도록 패딩을 조정했어요.', status: 'done' },
    ],
    codeChange: {
      file: 'styles/mobile.css',
      before: `.btn-group { overflow: hidden; padding: 0; }`,
      after: `.btn-group { overflow: visible; padding: 0 16px; flex-wrap: wrap; }`,
    },
  },
  'explain_error': {
    status_steps: ['analyzing', 'done'],
    messages: [
      { role: 'ai', text: '로그를 분석했어요. 확인된 사실과 추정 원인을 구분해서 설명할게요.\n\n**확인된 사실:**\n• /api/reservations/cancel 경로에서 오류 발생\n• 최근 cl-008 (예약 취소 API 추가) 배포 이후 나타남\n\n**추정 원인:**\n취소 요청 시 reservation 객체가 undefined인 경우 처리 코드가 없어요. DB에서 id에 해당하는 예약을 못 찾을 때 발생하는 것으로 추정돼요.\n\n**확인이 더 필요한 부분:**\n• 실제 요청 파라미터 값\n• DB에서 해당 id 존재 여부\n\n수정할까요?', status: 'done' },
    ],
  },
  'cost_check': {
    status_steps: ['analyzing', 'done'],
    messages: [
      { role: 'ai', text: '현재 연결된 서비스 기준으로 월 비용을 계산했어요.\n\n**확인된 항목:**\n• Vercel (Hobby): ₩0\n• Supabase (Free): ₩0 (500MB 초과 시 유료)\n\n**미연결로 알 수 없는 항목:**\n• 이메일 서비스: 연결 안 됨\n• 파일 저장소: 연결 안 됨\n\n현재 예상 월 비용은 ₩0이지만, 서비스 사용량이 늘면 무료 플랜 한도를 초과할 수 있어요. 비용 탭에서 상세 예측을 확인하세요.', status: 'done' },
    ],
  },
  'default': {
    status_steps: ['analyzing', 'done'],
    messages: [
      { role: 'ai', text: '요청을 분석하고 있어요...', status: 'analyzing' },
      { role: 'ai', text: '현재 프로젝트 상태를 기반으로 답변드릴게요. 코드, 인프라 연결 상태, 최근 변경 내역을 함께 참고했어요.\n\n좀 더 구체적인 내용을 알려주시면 더 정확하게 도와드릴 수 있어요. 예를 들어 특정 기능, 파일, 오류 메시지를 함께 알려주세요.', status: 'done' },
    ],
  },
};

/* ── 비용 계산 ───────────────────────────────────────────── */
function calcCost(users, storage_gb, emails_month) {
  const vercel = users > 1000 ? 20 * 1350 : 0;
  const supabase_db = storage_gb > 0.5 ? 25 * 1350 : 0;
  const supabase_auth = users > 50000 ? 0.00325 * users : 0;
  const email = emails_month > 3000 ? Math.ceil((emails_month - 3000) / 1000) * 1.5 * 1350 : 0;
  const ai_usage = Math.round(users * 0.02 * 1350);
  const platform = 9 * 1350;   // BAESHDEV 플랫폼 요금 (가정)

  return {
    vercel: Math.round(vercel),
    supabase_db: Math.round(supabase_db),
    supabase_auth: Math.round(supabase_auth),
    email: Math.round(email),
    ai_usage: Math.round(ai_usage),
    platform,
    unknown: ['이메일 서비스(미연결)', '파일 저장소(미연결)'],
    total: Math.round(vercel + supabase_db + supabase_auth + email + ai_usage + platform),
  };
}

/* ── 코드 파일 트리 (데모) ────────────────────────────────── */
const FILE_TREE = [
  { name: 'pages', type: 'dir', children: [
    { name: 'api', type: 'dir', children: [
      { name: 'auth', type: 'dir', children: [
        { name: 'callback.ts', type: 'file', lang: 'typescript' },
      ]},
      { name: 'reservations', type: 'dir', children: [
        { name: 'index.ts', type: 'file', lang: 'typescript' },
        { name: '[id].ts', type: 'file', lang: 'typescript', changed: true },
      ]},
      { name: 'admin', type: 'dir', children: [
        { name: 'users.ts', type: 'file', lang: 'typescript', issue: true },
        { name: 'dashboard.ts', type: 'file', lang: 'typescript', changed: true },
      ]},
    ]},
    { name: 'login.tsx', type: 'file', lang: 'tsx' },
    { name: 'signup.tsx', type: 'file', lang: 'tsx' },
    { name: 'dashboard.tsx', type: 'file', lang: 'tsx', changed: true },
    { name: 'index.tsx', type: 'file', lang: 'tsx' },
  ]},
  { name: 'components', type: 'dir', children: [
    { name: 'ReservationChart.tsx', type: 'file', lang: 'tsx', changed: true },
    { name: 'ReservationForm.tsx', type: 'file', lang: 'tsx' },
    { name: 'LoginForm.tsx', type: 'file', lang: 'tsx' },
  ]},
  { name: 'lib', type: 'dir', children: [
    { name: 'auth.ts', type: 'file', lang: 'typescript', changed: true },
    { name: 'email.ts', type: 'file', lang: 'typescript', changed: true },
    { name: 'supabase.ts', type: 'file', lang: 'typescript' },
    { name: 'config.ts', type: 'file', lang: 'typescript', issue: true },
  ]},
  { name: 'styles', type: 'dir', children: [
    { name: 'globals.css', type: 'file', lang: 'css' },
    { name: 'mobile.css', type: 'file', lang: 'css', changed: true },
  ]},
  { name: 'middleware.ts', type: 'file', lang: 'typescript', changed: true },
  { name: '.env.local', type: 'file', lang: 'env', secret: true },
  { name: 'package.json', type: 'file', lang: 'json' },
  { name: 'vercel.json', type: 'file', lang: 'json' },
];

/* ── Export ──────────────────────────────────────────────── */
window.AppState         = AppState;
window.PROJECT_TEMPLATES = PROJECT_TEMPLATES;
window.DEFAULT_PROJECT  = DEFAULT_PROJECT;
window.SECURITY_ISSUES  = SECURITY_ISSUES;
window.DIAGNOSTIC_ITEMS = DIAGNOSTIC_ITEMS;
window.CONNECTION_SERVICES = CONNECTION_SERVICES;
window.MONITOR_DATA     = MONITOR_DATA;
window.AI_RESPONSES     = AI_RESPONSES;
window.FILE_TREE        = FILE_TREE;
window.calcCost         = calcCost;
window.buildInfraNodes  = buildInfraNodes;
