/* BAESHDEV — isometric infrastructure scene + 30s tour */
'use strict';

(function () {
  const canvas = document.getElementById('scene-canvas');
  const wrap = document.getElementById('scene-wrap');
  const labelsEl = document.getElementById('scene-labels');
  if (!canvas || !wrap) return;

  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = '#161615';
  const PAPER = '#F3F2ED';
  const ELEV = '#FFFEFA';
  const LINE = 'rgba(22,22,21,0.10)';

  let W = 0, H = 0, dpr = 1;
  let visible = true;
  let mouseX = 0.5, mouseY = 0.5;
  let lastTs = 0;
  let clock = 0;

  const NODES = [
    { id: 'domain',   label: '도메인',  sub: 'HTTPS',    x: 0,    y: 0, z: -158, w: 56, h: 48, d: 56, type: 'domain', hex: '#161615' },
    { id: 'browser',  label: '서비스',  sub: 'Frontend', x: 0,    y: 0, z: 6,    w: 132,h: 92, d: 14, type: 'screen', hex: '#161615' },
    { id: 'server',   label: '서버',    sub: 'API',      x: -176, y: 0, z: 112,  w: 62, h: 86, d: 50, type: 'rack',   hex: '#1A47C4' },
    { id: 'database', label: 'DB',      sub: 'Postgres', x: 176,  y: 0, z: 112,  w: 54, h: 66, d: 54, type: 'db',     hex: '#3C3C37' },
    { id: 'auth',     label: '인증',    sub: 'Auth',     x: -176, y: 0, z: 224,  w: 48, h: 52, d: 48, type: 'auth',   hex: '#1B6B3A' },
    { id: 'storage',  label: '저장소',  sub: '미연결',    x: 176,  y: 0, z: 224,  w: 54, h: 46, d: 54, type: 'crate',  hex: '#8A5A00', missing: true },
  ];

  const EDGES = [
    ['domain', 'browser'],
    ['browser', 'server'],
    ['browser', 'database'],
    ['server', 'database'],
    ['server', 'auth'],
    ['browser', 'storage'],
  ];

  const byId = id => NODES.find(n => n.id === id);

  const cam = {
    tx: 0, ty: 42, tz: 40,
    rx: -0.46, ry: -0.52,
    zoom: 1.12, dist: 980,
    from: null, to: null, moveT: 1,
  };

  const scene = {
    focus: 'browser',
    screen: 'idle',
    typed: '',
    targetText: '',
    typeIdx: 0,
    typeAcc: 0,
    packets: 1,
    lit: new Set(['domain', 'browser', 'server', 'database', 'auth']),
    warn: new Set(['storage']),
    card: null,
  };

  const STEPS = [
    {
      dur: 5000, idx: '01', title: '요청을 입력합니다', path: 'prompt', rail: 'workspace',
      focus: 'browser', screen: 'typing',
      text: '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.',
      look: { x: 0, y: 48, z: 10 }, zoom: 1.42, ry: -0.22, rx: -0.34,
      card: null,
    },
    {
      dur: 5000, idx: '02', title: '서비스 화면이 구성됩니다', path: 'preview', rail: 'workspace',
      focus: 'browser', screen: 'app',
      look: { x: 0, y: 48, z: 10 }, zoom: 1.38, ry: -0.18, rx: -0.32,
      card: null,
    },
    {
      dur: 5000, idx: '03', title: '인프라가 연결됩니다', path: 'topology', rail: 'infra',
      focus: null, screen: 'app', packets: 2.4,
      look: { x: 0, y: 36, z: 90 }, zoom: 0.98, ry: -0.58, rx: -0.5,
      card: null,
    },
    {
      dur: 5000, idx: '04', title: '빠진 구성을 찾습니다', path: 'diagnostics', rail: 'diagnostics',
      focus: 'storage', screen: 'app',
      look: { x: 150, y: 36, z: 200 }, zoom: 1.28, ry: -0.72, rx: -0.4,
      card: {
        kicker: 'Needs check',
        title: '이메일 · 파일 저장소 미연결',
        body: '예약 확인 메일이 발송되지 않습니다. 저장소가 없어 업로드가 실패합니다.',
        tone: 'warn',
      },
    },
    {
      dur: 5000, idx: '05', title: '비용을 가정과 함께 봅니다', path: 'cost', rail: 'connections',
      focus: 'database', screen: 'app',
      look: { x: 80, y: 40, z: 110 }, zoom: 1.18, ry: -0.9, rx: -0.42,
      card: {
        kicker: 'Monthly estimate',
        title: '₩12,150',
        body: 'Vercel ₩0 · Supabase ₩0 · 플랫폼 ₩12,150\n이메일 · 저장소는 알 수 없음',
        tone: 'ink',
      },
    },
    {
      dur: 5000, idx: '06', title: '운영 주소로 내보냅니다', path: 'deploy', rail: 'deploy',
      focus: 'domain', screen: 'live',
      look: { x: 0, y: 40, z: -130 }, zoom: 1.32, ry: -0.15, rx: -0.36,
      card: {
        kicker: 'Deployed',
        title: 'demo-fitcenter.baesh.dev',
        body: '시뮬레이션입니다. 실제 리소스는 생성되지 않습니다.',
        tone: 'ok',
      },
    },
  ];

  let stepIndex = 0;
  let stepElapsed = 0;
  let paused = false;
  let running = false;
  const STEP_MS = 5000;
  const TOTAL_MS = STEPS.length * STEP_MS;

  function lift(hex, p) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * p);
    g = Math.round(g + (255 - g) * p);
    b = Math.round(b + (255 - b) * p);
    return `rgb(${r},${g},${b})`;
  }
  function shade(hex, p) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * (1 - p));
    g = Math.round(g * (1 - p));
    b = Math.round(b * (1 - p));
    return `rgb(${r},${g},${b})`;
  }
  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function project(x, y, z) {
    x -= cam.tx; y -= cam.ty; z -= cam.tz;
    const cy = Math.cos(cam.ry), sy = Math.sin(cam.ry);
    const xr = x * cy - z * sy;
    const zr = x * sy + z * cy;
    const cp = Math.cos(cam.rx), sp = Math.sin(cam.rx);
    const yp = y * cp - zr * sp;
    const zp = y * sp + zr * cp;
    const k = cam.zoom * cam.dist / (cam.dist + zp);
    return { sx: W * 0.5 + xr * k, sy: H * 0.56 - yp * k, k, z: zp };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    canvas.width = Math.max(1, W * dpr);
    canvas.height = Math.max(1, H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function poly(pts, fill, stroke, dash, lw) {
    if (!pts.length) return;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 1;
      if (dash) ctx.setLineDash(dash);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function faceArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.sx * q.sy - q.sx * p.sy;
    }
    return a;
  }

  function boxFaces(x, y, z, w, h, d) {
    const x0 = x - w / 2, x1 = x + w / 2;
    const y0 = y, y1 = y + h;
    const z0 = z - d / 2, z1 = z + d / 2;
    const P = (a, b, c) => project(a, b, c);
    return {
      top:   [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)],
      bot:   [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)],
      left:  [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)],
      right: [P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)],
      front: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
      back:  [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)],
    };
  }

  function avgZ(face) {
    return (face[0].z + face[1].z + face[2].z + face[3].z) / 4;
  }

  function drawBox(x, y, z, w, h, d, hex, alpha, wire) {
    const f = boxFaces(x, y, z, w, h, d);
    const faces = [
      { pts: f.top,   fill: lift(hex, 0.42), z: avgZ(f.top) },
      { pts: f.left,  fill: shade(hex, 0.28), z: avgZ(f.left) },
      { pts: f.right, fill: shade(hex, 0.1), z: avgZ(f.right) },
      { pts: f.front, fill: hex, z: avgZ(f.front) },
      { pts: f.back,  fill: shade(hex, 0.34), z: avgZ(f.back) },
    ].sort((a, b) => b.z - a.z);

    ctx.save();
    ctx.globalAlpha = alpha;
    faces.forEach(face => {
      if (wire) poly(face.pts, 'rgba(255,254,250,0.35)', hex, [3.5, 3.5], 1.15);
      else {
        poly(face.pts, face.fill, 'rgba(22,22,21,0.22)');
        ctx.beginPath();
        ctx.moveTo(face.pts[0].sx, face.pts[0].sy);
        ctx.lineTo(face.pts[1].sx, face.pts[1].sy);
        ctx.strokeStyle = 'rgba(255,254,250,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    ctx.restore();
    return f;
  }

  function drawCylinder(x, y, z, r, h, hex, alpha) {
    const segs = 32;
    const top = [], bot = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      const cx = x + Math.cos(t) * r;
      const cz = z + Math.sin(t) * r;
      top.push(project(cx, y + h, cz));
      bot.push(project(cx, y, cz));
    }
    const quads = [];
    for (let i = 0; i < segs; i++) {
      const pts = [bot[i], bot[i + 1], top[i + 1], top[i]];
      quads.push({
        pts,
        z: (bot[i].z + bot[i + 1].z + top[i + 1].z + top[i].z) / 4,
        i,
      });
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    quads.sort((a, b) => b.z - a.z);
    quads.forEach(q => {
      const t = Math.cos((q.i / segs) * Math.PI * 2 - 0.7);
      poly(q.pts, t > 0 ? lift(hex, t * 0.3) : shade(hex, -t * 0.28), 'rgba(22,22,21,0.08)');
    });
    ctx.beginPath();
    top.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
    ctx.closePath();
    ctx.fillStyle = lift(hex, 0.32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(22,22,21,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    const inner = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      inner.push(project(x + Math.cos(t) * r * 0.55, y + h + 0.2, z + Math.sin(t) * r * 0.55));
    }
    inner.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
    ctx.closePath();
    ctx.fillStyle = shade(hex, 0.12);
    ctx.fill();
    ctx.restore();
  }

  function drawShadow(x, z, rx, rz, alpha) {
    const steps = 28;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const p = project(x + Math.cos(t) * rx, 0.15, z + Math.sin(t) * rz);
      i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(22,22,21,${alpha})`;
    ctx.fill();
  }

  function drawFocusRing(n) {
    if (!n) return;
    const r = Math.max(n.w, n.d) * 0.78;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      const p = project(n.x + Math.cos(t) * r, 0.8, n.z + Math.sin(t) * r);
      i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
    }
    ctx.closePath();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.35;
    ctx.globalAlpha = 0.28;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    const plate = [
      project(-300, -1.2, -300),
      project(300, -1.2, -300),
      project(300, -1.2, 300),
      project(-300, -1.2, 300),
    ];
    poly(plate, '#E4E2DA', 'rgba(22,22,21,0.08)');
    const slab = [
      project(-232, 0, -232),
      project(232, 0, -232),
      project(232, 0, 232),
      project(-232, 0, 232),
    ];
    poly(slab, '#F4F3EE', 'rgba(22,22,21,0.12)');
    const step = 32;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(22,22,21,0.07)';
    for (let x = -224; x <= 224; x += step) {
      const a = project(x, 0.3, -224);
      const b = project(x, 0.3, 224);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    for (let z = -224; z <= 224; z += step) {
      const a = project(-224, 0.3, z);
      const b = project(224, 0.3, z);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
  }

  function cablePath(a, b) {
    const y0 = Math.min(a.y + a.h * 0.18, 14);
    const y1 = Math.min(b.y + b.h * 0.18, 14);
    return [
      [a.x, y0, a.z],
      [a.x, 5, a.z],
      [(a.x + b.x) * 0.5, 5, (a.z + b.z) * 0.5],
      [b.x, 5, b.z],
      [b.x, y1, b.z],
    ];
  }

  function strokeCable(pts, color, width, dash) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCables() {
    EDGES.forEach(([aId, bId], ei) => {
      const a = byId(aId), b = byId(bId);
      const missing = a.missing || b.missing;
      const world = cablePath(a, b);
      const pts = world.map(p => project(p[0], p[1], p[2]));
      strokeCable(pts, missing ? 'rgba(138,90,0,0.14)' : 'rgba(22,22,21,0.08)', 5);
      strokeCable(
        pts,
        missing ? 'rgba(138,90,0,0.7)' : 'rgba(22,22,21,0.42)',
        1.4,
        missing ? [5, 4] : null
      );

      if (reduce) return;
      const nPack = missing ? 1 : 3;
      for (let i = 0; i < nPack; i++) {
        const t = ((clock * 0.0002 * scene.packets) + i / nPack + ei * 0.13) % 1;
        const u = t * (world.length - 1);
        const s = Math.floor(u);
        const f = u - s;
        const p0 = world[s], p1 = world[Math.min(s + 1, world.length - 1)];
        const pr = project(lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f), lerp(p0[2], p1[2], f));
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = missing ? '#8A5A00' : INK;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  function wrapText(text, max, font) {
    ctx.font = font || '500 12px "IBM Plex Sans KR", sans-serif';
    const out = [];
    let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > max && line) { out.push(line); line = ch; }
      else line = test;
    }
    if (line) out.push(line);
    return out.slice(0, 6);
  }

  function drawScreenUI(quad) {
    let p0 = quad[3];
    let p1 = quad[2];
    let p2 = quad[0];
    const det = (p1.sx - p0.sx) * (p2.sy - p0.sy) - (p1.sy - p0.sy) * (p2.sx - p0.sx);
    if (det < 0) {
      p0 = quad[2];
      p1 = quad[3];
      p2 = quad[1];
    }
    const uw = 320, uh = 220;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(quad[0].sx, quad[0].sy);
    quad.slice(1).forEach(p => ctx.lineTo(p.sx, p.sy));
    ctx.closePath();
    ctx.clip();
    ctx.transform(
      (p1.sx - p0.sx) / uw,
      (p1.sy - p0.sy) / uw,
      (p2.sx - p0.sx) / uh,
      (p2.sy - p0.sy) / uh,
      p0.sx,
      p0.sy
    );
    ctx.fillStyle = '#1C1C1A';
    ctx.fillRect(0, 0, uw, uh);
    ctx.fillStyle = ELEV;
    ctx.fillRect(3, 3, uw - 6, uh - 6);
    ctx.fillStyle = PAPER;
    ctx.fillRect(3, 3, uw - 6, 22);
    ctx.fillStyle = '#D4C7C2';
    ctx.beginPath(); ctx.arc(16, 14, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D8CBA3';
    ctx.beginPath(); ctx.arc(27, 14, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B9C8B4';
    ctx.beginPath(); ctx.arc(38, 14, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E2E0D8';
    ctx.fillRect(52, 9, 196, 10);

    if (scene.screen === 'typing' || scene.screen === 'idle') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(18, 40, uw - 36, uh - 58);
      ctx.strokeStyle = '#DDDBD3';
      ctx.strokeRect(18, 40, uw - 36, uh - 58);
      ctx.fillStyle = '#6E6E68';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText('PROMPT', 28, 58);
      ctx.fillStyle = INK;
      ctx.font = '500 13px "IBM Plex Sans KR", sans-serif';
      const lines = wrapText(scene.typed || '서비스를 설명하면 구조가 생깁니다.', 250, '500 13px "IBM Plex Sans KR", sans-serif');
      lines.forEach((ln, i) => ctx.fillText(ln, 28, 82 + i * 20));
      if (scene.screen === 'typing' && Math.floor(clock / 420) % 2 === 0) {
        const last = lines[lines.length - 1] || '';
        const w = ctx.measureText(last).width;
        ctx.fillRect(28 + w + 3, 68 + (lines.length - 1) * 20, 1.6, 16);
      }
    }

    if (scene.screen === 'app' || scene.screen === 'live') {
      ctx.fillStyle = INK;
      ctx.font = '600 20px "IBM Plex Sans KR", sans-serif';
      ctx.fillText('FIT CENTER', 18, 52);
      ctx.fillStyle = '#6E6E68';
      ctx.font = '400 11px "IBM Plex Sans KR", sans-serif';
      ctx.fillText('운동시설 예약  ·  오늘 3건', 18, 70);
      const rooms = [
        ['헬스장', '08:00–22:00'],
        ['수영장', '06:00–21:00'],
        ['필라테스', '예약제'],
      ];
      rooms.forEach((r, i) => {
        const x = 18 + i * 96;
        ctx.fillStyle = PAPER;
        ctx.fillRect(x, 84, 88, 72);
        ctx.strokeStyle = '#DDDBD3';
        ctx.strokeRect(x, 84, 88, 72);
        ctx.fillStyle = INK;
        ctx.font = '500 12px "IBM Plex Sans KR", sans-serif';
        ctx.fillText(r[0], x + 10, 106);
        ctx.fillStyle = '#6E6E68';
        ctx.font = '400 9px "IBM Plex Mono", monospace';
        ctx.fillText(r[1], x + 10, 122);
        ctx.fillStyle = INK;
        ctx.fillRect(x + 10, 134, 68, 14);
        ctx.fillStyle = ELEV;
        ctx.font = '500 9px "IBM Plex Sans KR", sans-serif';
        ctx.fillText('예약하기', x + 24, 144);
      });
      ctx.fillStyle = '#E2E0D8';
      ctx.fillRect(18, 168, 284, 1);
      ctx.fillStyle = '#6E6E68';
      ctx.font = '400 10px "IBM Plex Mono", monospace';
      ctx.fillText('홍길동  ·  9월 10일 19:00  ·  확정', 18, 186);
    }

    if (scene.screen === 'live') {
      ctx.fillStyle = '#1B6B3A';
      ctx.fillRect(3, uh - 26, uw - 6, 23);
      ctx.fillStyle = ELEV;
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText('LIVE   demo-fitcenter.baesh.dev', 16, uh - 11);
    }
    ctx.restore();
  }

  function drawNode(n, alpha) {
    drawShadow(n.x, n.z, n.w * 0.62, n.d * 0.62, 0.09 * alpha);
    if (n.type === 'screen') {
      drawBox(n.x, n.y, n.z + 18, 36, 8, 14, '#2A2A27', alpha);
      drawBox(n.x, n.y + 8, n.z + 18, 14, 12, 10, '#3C3C37', alpha);
      const f = drawBox(n.x, n.y + 18, n.z, n.w, n.h, n.d, n.hex, alpha);
      const screenFace = avgZ(f.back) < avgZ(f.front) ? f.back : f.front;
      if (alpha > 0.45) drawScreenUI(screenFace);
      return;
    }
    if (n.type === 'rack') {
      drawBox(n.x, n.y, n.z, n.w + 4, n.h, n.d + 4, '#2A2A27', alpha);
      for (let i = 0; i < 5; i++) {
        const hh = 12;
        const yy = n.y + 8 + i * (hh + 3);
        const lit = i === 4 || i === 1;
        drawBox(n.x, yy, n.z, n.w - 8, hh, n.d - 8, lit ? n.hex : lift('#2A2A27', 0.18), alpha);
      }
      return;
    }
    if (n.type === 'db') {
      drawCylinder(n.x, n.y, n.z, n.w * 0.48, 18, lift(n.hex, 0.2), alpha);
      drawCylinder(n.x, n.y + 20, n.z, n.w * 0.46, 18, lift(n.hex, 0.08), alpha);
      drawCylinder(n.x, n.y + 40, n.z, n.w * 0.44, 20, n.hex, alpha);
      return;
    }
    if (n.type === 'domain') {
      drawBox(n.x, n.y, n.z, 26, 22, 26, n.hex, alpha);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let k = 0; k < 3; k++) {
        const ring = [];
        const ry = n.y + 28 + k * 7;
        for (let i = 0; i <= 40; i++) {
          const t = (i / 40) * Math.PI * 2;
          ring.push(project(n.x + Math.cos(t) * (30 + k), ry, n.z + Math.sin(t) * (18 + k * 0.6)));
        }
        ctx.beginPath();
        ring.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
        ctx.strokeStyle = k === 1 ? n.hex : 'rgba(22,22,21,0.35)';
        ctx.lineWidth = k === 1 ? 2.4 : 1.2;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (n.type === 'auth') {
      drawBox(n.x, n.y, n.z, n.w, n.h * 0.62, n.d, n.hex, alpha);
      const shackle = [];
      for (let i = 0; i <= 18; i++) {
        const t = Math.PI * (i / 18);
        shackle.push(project(n.x + Math.cos(t) * 14, n.y + n.h * 0.62 + Math.sin(t) * 18, n.z));
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      shackle.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
      ctx.strokeStyle = n.hex;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      return;
    }
    const pulse = n.missing && !reduce ? 0.55 + 0.2 * Math.sin(clock * 0.004) : alpha;
    drawBox(n.x, n.y, n.z, n.w, n.h, n.d, n.hex, pulse, n.missing);
  }

  function nodeAlpha(n) {
    if (!scene.focus) return 1;
    if (n.id === scene.focus) return 1;
    return 0.42;
  }

  function updateLabels() {
    NODES.forEach(n => {
      let el = document.getElementById('lbl-' + n.id);
      if (!el) {
        el = document.createElement('div');
        el.id = 'lbl-' + n.id;
        el.className = 'scene-label';
        labelsEl.appendChild(el);
      }
      const show = !scene.focus || n.id === scene.focus;
      const p = project(n.x, n.y + n.h + 8, n.z);
      el.innerHTML = `<strong>${n.label}</strong><span>${n.sub}</span>`;
      el.style.left = p.sx + 'px';
      el.style.top = p.sy + 'px';
      el.style.opacity = show ? String(nodeAlpha(n)) : '0';
    });
  }

  function setCameraTarget(step) {
    cam.from = { tx: cam.tx, ty: cam.ty, tz: cam.tz, rx: cam.rx, ry: cam.ry, zoom: cam.zoom };
    cam.to = {
      tx: step.look.x, ty: step.look.y, tz: step.look.z,
      rx: step.rx, ry: step.ry, zoom: step.zoom,
    };
    cam.moveT = 0;
  }

  function applyCamera(dt) {
    const idleRy = -0.52 + Math.sin(clock * 0.00022) * 0.16;
    const idleRx = -0.46 + Math.sin(clock * 0.00017) * 0.04;
    const mx = (mouseX - 0.5) * 0.12;
    const my = (mouseY - 0.5) * 0.08;

    if (running && cam.to) {
      cam.moveT = Math.min(1, cam.moveT + dt / 900);
      const u = ease(cam.moveT);
      cam.tx = lerp(cam.from.tx, cam.to.tx, u);
      cam.ty = lerp(cam.from.ty, cam.to.ty, u);
      cam.tz = lerp(cam.from.tz, cam.to.tz, u);
      cam.rx = lerp(cam.from.rx, cam.to.rx, u) + my * 0.25;
      cam.ry = lerp(cam.from.ry, cam.to.ry, u) + mx * 0.35;
      cam.zoom = lerp(cam.from.zoom, cam.to.zoom, u);
    } else if (!reduce) {
      cam.tx = lerp(cam.tx, 0, 0.04);
      cam.ty = lerp(cam.ty, 42, 0.04);
      cam.tz = lerp(cam.tz, 40, 0.04);
      cam.rx = lerp(cam.rx, idleRx + my, 0.04);
      cam.ry = lerp(cam.ry, idleRy + mx, 0.04);
      cam.zoom = lerp(cam.zoom, 1.12, 0.04);
    }
  }

  function applyStep(step) {
    scene.focus = step.focus;
    scene.screen = step.screen;
    scene.packets = step.packets || 1;
    scene.card = step.card;
    scene.targetText = step.text || '';
    scene.typed = step.screen === 'typing' ? '' : (step.text || '');
    scene.typeIdx = 0;
    scene.typeAcc = 0;
    setCameraTarget(step);
    updateHud(step);
    updateChrome(step);
    updateCard(step.card);
  }

  function updateHud(step) {
    const idx = document.getElementById('demo-idx');
    const msg = document.getElementById('demo-step-msg');
    if (idx) idx.textContent = `${step.idx} / 06`;
    if (msg) msg.textContent = step.title;
  }

  function updateChrome(step) {
    const path = document.getElementById('console-path');
    if (path) path.textContent = 'console.baesh.dev / ' + step.path;
    document.querySelectorAll('.rail-item').forEach(el => {
      el.classList.toggle('on', el.dataset.rail === step.rail);
    });
  }

  function updateCard(card) {
    const el = document.getElementById('demo-card');
    if (!el) return;
    if (!card) { el.className = 'demo-card'; el.innerHTML = ''; return; }
    el.className = 'demo-card on ' + (card.tone || '');
    el.innerHTML = `<div class="demo-card-kicker">${card.kicker}</div>
      <div class="demo-card-title">${card.title}</div>
      <div class="demo-card-body">${card.body.replace(/\n/g, '<br>')}</div>`;
  }

  function formatClock(ms) {
    const s = Math.min(30, Math.floor(ms / 1000));
    return '0:' + String(s).padStart(2, '0');
  }

  function tickDemo(dt) {
    if (!running || paused) return;
    stepElapsed += dt;
    const total = (stepIndex * STEP_MS) + stepElapsed;
    const fill = document.getElementById('demo-fill');
    const clockEl = document.getElementById('demo-clock');
    if (fill) fill.style.width = `${Math.min(100, (total / TOTAL_MS) * 100)}%`;
    if (clockEl) clockEl.textContent = formatClock(total);

    if (scene.screen === 'typing' && scene.targetText) {
      scene.typeAcc += dt;
      while (scene.typeAcc > 28 && scene.typeIdx < scene.targetText.length) {
        scene.typed += scene.targetText[scene.typeIdx++];
        scene.typeAcc -= 28;
      }
    }

    if (stepElapsed >= STEPS[stepIndex].dur) {
      stepIndex = (stepIndex + 1) % STEPS.length;
      stepElapsed = 0;
      applyStep(STEPS[stepIndex]);
    }
  }

  function render(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    clock += dt;

    if (!visible) { requestAnimationFrame(render); return; }

    applyCamera(dt);
    tickDemo(dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#F7F6F1');
    g.addColorStop(1, '#EDECE6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawGround();
    const focused = scene.focus ? byId(scene.focus) : null;
    if (focused) drawFocusRing(focused);
    drawCables();

    const sorted = NODES.map(n => ({ n, z: project(n.x, n.y + n.h / 2, n.z).z }))
      .sort((a, b) => b.z - a.z);
    sorted.forEach(({ n }) => drawNode(n, nodeAlpha(n)));
    updateLabels();

    requestAnimationFrame(render);
  }

  function startDemo() {
    running = true;
    paused = false;
    stepIndex = 0;
    stepElapsed = 0;
    applyStep(STEPS[0]);
    const btn = document.getElementById('btn-demo-pause');
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  function pauseDemo() {
    if (!running) { startDemo(); return; }
    paused = !paused;
    const btn = document.getElementById('btn-demo-pause');
    if (!btn) return;
    btn.innerHTML = paused
      ? '<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>'
      : '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  wrap.addEventListener('mousemove', e => {
    const r = wrap.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width;
    mouseY = (e.clientY - r.top) / r.height;
  });

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0.08 }).observe(canvas);

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(render);

  document.getElementById('btn-demo-pause')?.addEventListener('click', pauseDemo);
  document.getElementById('btn-demo-restart')?.addEventListener('click', startDemo);
  document.getElementById('btn-demo-play')?.addEventListener('click', () => {
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(startDemo, 350);
  });

  if (!reduce) setTimeout(startDemo, 900);
  else applyStep(STEPS[2]);
})();
