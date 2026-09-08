'use strict';

(function () {
  const canvas = document.getElementById('hook-canvas');
  const wrap = document.getElementById('hook-stage');
  if (!canvas || !wrap) return;

  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAPER = '#F3F2ED';
  const ELEV = '#FFFEFA';
  const INK = '#161615';

  let W = 0, H = 0, dpr = 1;
  let mouseX = 0.5, mouseY = 0.5;
  let lastTs = 0;
  let clock = 0;
  let step = 0;
  let stepT = 0;
  let cycle = null;
  const STEP_MS = [4300, 4800, 3800, 3600];

  const NODES = [
    { id: 'domain',  x: 0,    y: 0, z: -150, w: 58, h: 50, d: 58, type: 'domain', hex: '#161615' },
    { id: 'browser', x: 0,    y: 0, z: 8,    w: 138,h: 96, d: 16, type: 'screen', hex: '#161615' },
    { id: 'server',  x: -178, y: 0, z: 118,  w: 64, h: 90, d: 52, type: 'rack',   hex: '#1A47C4' },
    { id: 'database',x: 178,  y: 0, z: 118,  w: 56, h: 70, d: 56, type: 'db',     hex: '#3C3C37' },
    { id: 'auth',    x: -178, y: 0, z: 230,  w: 50, h: 54, d: 50, type: 'auth',   hex: '#1B6B3A' },
    { id: 'storage', x: 178,  y: 0, z: 230,  w: 56, h: 48, d: 56, type: 'crate',  hex: '#8A5A00', missing: true },
  ];
  const EDGES = [
    ['domain', 'browser'], ['browser', 'server'], ['browser', 'database'],
    ['server', 'database'], ['server', 'auth'], ['browser', 'storage'],
  ];
  const byId = id => NODES.find(n => n.id === id);

  const cam = { tx: 0, ty: 46, tz: 40, rx: -0.48, ry: -0.58, zoom: 1.42, dist: 760, from: null, to: null, moveT: 1 };

  const scene = {
    focus: 'browser',
    screen: 'typing',
    typed: '',
    target: '',
    packets: 1,
    hideInfra: true,
  };

  const BEATS = [
    {
      id: 'say', path: '말하는 중',
      caption: '하고 싶은 걸 말하면 시작돼요',
      reply: '좋아요. 화면부터 만들게요.',
      focus: 'browser', screen: 'typing', hideInfra: true,
      text: '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.',
      look: { x: 8, y: 52, z: 6 }, zoom: 2.05, ry: -0.18, rx: -0.3, packets: 0.6,
    },
    {
      id: 'see', path: '화면이 나왔어요',
      caption: '몇 초 만에 사이트 화면이 나와요',
      reply: '예약 화면을 만들어 두었어요. 바로 눌러볼 수 있어요.',
      focus: 'browser', screen: 'app', hideInfra: true,
      text: '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.',
      look: { x: 4, y: 50, z: 8 }, zoom: 1.95, ry: -0.16, rx: -0.28, packets: 1.2,
    },
    {
      id: 'care', path: '빠진 걸 찾는 중',
      caption: '어려운 설정은 알아서, 빠진 건 우리가 알려줘요',
      reply: '저장 공간이 아직 없어요. 나중에 연결하면 돼요.',
      focus: 'storage', screen: 'app', hideInfra: false,
      text: '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.',
      look: { x: 150, y: 36, z: 210 }, zoom: 1.52, ry: -0.78, rx: -0.38, packets: 1,
    },
    {
      id: 'open', path: '열어볼 수 있어요',
      caption: '주소만 받아서 바로 열어보세요',
      reply: '주소가 준비됐어요. 지금 열어볼 수 있어요.',
      focus: 'domain', screen: 'live', hideInfra: false,
      text: '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.',
      look: { x: 0, y: 42, z: -120 }, zoom: 1.58, ry: -0.12, rx: -0.34, packets: 1.4,
    },
  ];

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
    return `rgb(${Math.round(r * (1 - p))},${Math.round(g * (1 - p))},${Math.round(b * (1 - p))})`;
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
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
    return { sx: W * 0.5 + xr * k, sy: H * 0.54 - yp * k, k, z: zp };
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

  function boxFaces(x, y, z, w, h, d) {
    const x0 = x - w / 2, x1 = x + w / 2;
    const y0 = y, y1 = y + h;
    const z0 = z - d / 2, z1 = z + d / 2;
    const P = (a, b, c) => project(a, b, c);
    return {
      top:   [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)],
      left:  [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)],
      right: [P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)],
      front: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
      back:  [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)],
    };
  }
  const avgZ = f => (f[0].z + f[1].z + f[2].z + f[3].z) / 4;

  function drawBox(x, y, z, w, h, d, hex, alpha, wire) {
    const f = boxFaces(x, y, z, w, h, d);
    const faces = [
      { pts: f.top,   fill: lift(hex, 0.38), z: avgZ(f.top) },
      { pts: f.left,  fill: shade(hex, 0.38), z: avgZ(f.left) },
      { pts: f.right, fill: shade(hex, 0.16), z: avgZ(f.right) },
      { pts: f.front, fill: hex, z: avgZ(f.front) },
      { pts: f.back,  fill: shade(hex, 0.42), z: avgZ(f.back) },
    ].sort((a, b) => b.z - a.z);
    ctx.save();
    ctx.globalAlpha = alpha;
    faces.forEach(face => {
      if (wire) poly(face.pts, 'rgba(196,146,58,0.12)', hex, [4, 4], 1.2);
      else {
        poly(face.pts, face.fill, 'rgba(22,22,21,0.16)');
        ctx.beginPath();
        ctx.moveTo(face.pts[0].sx, face.pts[0].sy);
        ctx.lineTo(face.pts[1].sx, face.pts[1].sy);
        ctx.strokeStyle = 'rgba(255,254,250,0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    ctx.restore();
    return f;
  }

  function drawCylinder(x, y, z, r, h, hex, alpha) {
    const segs = 28;
    const top = [], bot = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      top.push(project(x + Math.cos(t) * r, y + h, z + Math.sin(t) * r));
      bot.push(project(x + Math.cos(t) * r, y, z + Math.sin(t) * r));
    }
    const quads = [];
    for (let i = 0; i < segs; i++) {
      const pts = [bot[i], bot[i + 1], top[i + 1], top[i]];
      quads.push({ pts, z: (bot[i].z + top[i].z) / 2, i });
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    quads.sort((a, b) => b.z - a.z);
    quads.forEach(q => {
      const t = Math.cos((q.i / segs) * Math.PI * 2 - 0.6);
      poly(q.pts, t > 0 ? lift(hex, t * 0.35) : shade(hex, -t * 0.32), 'rgba(22,22,21,0.08)');
    });
    ctx.beginPath();
    top.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
    ctx.closePath();
    ctx.fillStyle = lift(hex, 0.28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(22,22,21,0.2)';
    ctx.stroke();
    ctx.restore();
  }

  function drawShadow(x, z, rx, rz, a) {
    ctx.beginPath();
    for (let i = 0; i <= 26; i++) {
      const t = (i / 26) * Math.PI * 2;
      const p = project(x + Math.cos(t) * rx, 0.4, z + Math.sin(t) * rz);
      i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(22,22,21,${a})`;
    ctx.fill();
  }

  function drawFloor() {
    const plate = [
      project(-300, -1.2, -300), project(300, -1.2, -300),
      project(300, -1.2, 300), project(-300, -1.2, 300),
    ];
    poly(plate, '#E4E2DA', 'rgba(22,22,21,0.08)');
    const slab = [
      project(-232, 0, -232), project(232, 0, -232),
      project(232, 0, 232), project(-232, 0, 232),
    ];
    poly(slab, '#F4F3EE', 'rgba(22,22,21,0.12)');
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(22,22,21,0.07)';
    for (let x = -224; x <= 224; x += 32) {
      const a = project(x, 0.3, -224), b = project(x, 0.3, 224);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    for (let z = -224; z <= 224; z += 32) {
      const a = project(-224, 0.3, z), b = project(224, 0.3, z);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
  }

  function drawCables() {
    if (scene.hideInfra) return;
    EDGES.forEach(([aId, bId], ei) => {
      const a = byId(aId), b = byId(bId);
      const missing = a.missing || b.missing;
      const segs = [
        [a.x, a.h * 0.2, a.z], [a.x, 6, a.z],
        [(a.x + b.x) / 2, 6, (a.z + b.z) / 2],
        [b.x, 6, b.z], [b.x, b.h * 0.2, b.z],
      ];
      const pts = segs.map(p => project(p[0], p[1], p[2]));
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy));
      ctx.strokeStyle = missing ? 'rgba(138,90,0,0.14)' : 'rgba(22,22,21,0.08)';
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = missing ? 'rgba(138,90,0,0.7)' : 'rgba(22,22,21,0.42)';
      ctx.lineWidth = 1.35;
      if (missing) ctx.setLineDash([5, 4]);
      ctx.stroke(); ctx.setLineDash([]);

      if (reduce) return;
      const nPack = missing ? 1 : 3;
      for (let i = 0; i < nPack; i++) {
        const t = ((clock * 0.00022 * scene.packets) + i / nPack + ei * 0.14) % 1;
        const u = t * (segs.length - 1);
        const s = Math.floor(u), f = u - s;
        const p0 = segs[s], p1 = segs[Math.min(s + 1, segs.length - 1)];
        const pr = project(lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f), lerp(p0[2], p1[2], f));
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = missing ? '#8A5A00' : INK;
        ctx.fill();
      }
    });
  }

  function wrapText(text, max) {
    ctx.font = '500 13px "IBM Plex Sans KR", sans-serif';
    const out = []; let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > max && line) { out.push(line); line = ch; }
      else line = test;
    }
    if (line) out.push(line);
    return out.slice(0, 5);
  }

  function drawScreenUI(quad) {
    let p0 = quad[3], p1 = quad[2], p2 = quad[0];
    const det = (p1.sx - p0.sx) * (p2.sy - p0.sy) - (p1.sy - p0.sy) * (p2.sx - p0.sx);
    if (det < 0) { p0 = quad[2]; p1 = quad[3]; p2 = quad[1]; }
    const uw = 320, uh = 220;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(quad[0].sx, quad[0].sy);
    quad.slice(1).forEach(p => ctx.lineTo(p.sx, p.sy));
    ctx.closePath(); ctx.clip();
    ctx.transform(
      (p1.sx - p0.sx) / uw, (p1.sy - p0.sy) / uw,
      (p2.sx - p0.sx) / uh, (p2.sy - p0.sy) / uh,
      p0.sx, p0.sy
    );
    ctx.fillStyle = '#111110';
    ctx.fillRect(0, 0, uw, uh);
    ctx.fillStyle = ELEV;
    ctx.fillRect(4, 4, uw - 8, uh - 8);
    ctx.fillStyle = PAPER;
    ctx.fillRect(4, 4, uw - 8, 22);
    ctx.fillStyle = '#D4C7C2'; ctx.beginPath(); ctx.arc(16, 15, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D8CBA3'; ctx.beginPath(); ctx.arc(28, 15, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B9C8B4'; ctx.beginPath(); ctx.arc(40, 15, 3.2, 0, Math.PI * 2); ctx.fill();

    if (scene.screen === 'typing' || scene.screen === 'idle') {
      ctx.fillStyle = '#6E6E68';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText('PROMPT', 18, 48);
      ctx.fillStyle = INK;
      ctx.font = '500 14px "IBM Plex Sans KR", sans-serif';
      const lines = wrapText(scene.typed || '서비스를 설명하면 구조가 생깁니다.', 270);
      lines.forEach((ln, i) => ctx.fillText(ln, 18, 74 + i * 22));
      if (scene.screen === 'typing' && Math.floor(clock / 400) % 2 === 0) {
        const last = lines[lines.length - 1] || '';
        ctx.fillRect(18 + ctx.measureText(last).width + 3, 60 + (lines.length - 1) * 22, 1.6, 16);
      }
    }

    if (scene.screen === 'app' || scene.screen === 'live') {
      ctx.fillStyle = INK;
      ctx.font = '600 20px "IBM Plex Sans KR", sans-serif';
      ctx.fillText('FIT CENTER', 18, 54);
      ctx.fillStyle = '#6E6E68';
      ctx.font = '400 11px "IBM Plex Sans KR", sans-serif';
      ctx.fillText('운동시설 예약', 18, 72);
      ['헬스장', '수영장', '필라테스'].forEach((r, i) => {
        const x = 18 + i * 96;
        ctx.fillStyle = PAPER; ctx.fillRect(x, 86, 88, 70);
        ctx.strokeStyle = '#DDDBD3'; ctx.strokeRect(x, 86, 88, 70);
        ctx.fillStyle = INK; ctx.font = '500 12px "IBM Plex Sans KR", sans-serif';
        ctx.fillText(r, x + 10, 108);
        ctx.fillRect(x + 10, 128, 68, 16);
        ctx.fillStyle = ELEV; ctx.font = '500 9px "IBM Plex Sans KR", sans-serif';
        ctx.fillText('예약하기', x + 24, 139);
      });
    }

    if (scene.screen === 'live') {
      ctx.fillStyle = '#1B6B3A';
      ctx.fillRect(4, uh - 28, uw - 8, 24);
      ctx.fillStyle = ELEV;
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillText('LIVE  demo-fitcenter.baesh.dev', 16, uh - 12);
    }
    ctx.restore();
  }

  function nodeAlpha(n) {
    if (scene.hideInfra && n.id !== 'browser') return 0;
    if (!scene.focus) return 1;
    return n.id === scene.focus ? 1 : 0.38;
  }

  function drawNode(n, alpha) {
    drawShadow(n.x, n.z, n.w * 0.6, n.d * 0.6, 0.09 * alpha);
    if (n.type === 'screen') {
      drawBox(n.x, n.y, n.z + 18, 38, 8, 14, '#2A2A27', alpha);
      drawBox(n.x, n.y + 8, n.z + 18, 14, 14, 10, '#3C3C37', alpha);
      const f = drawBox(n.x, n.y + 20, n.z, n.w, n.h, n.d, n.hex, alpha);
      const face = avgZ(f.back) < avgZ(f.front) ? f.back : f.front;
      if (alpha > 0.5) drawScreenUI(face);
      return;
    }
    if (n.type === 'rack') {
      drawBox(n.x, n.y, n.z, n.w + 4, n.h, n.d + 4, '#1C1C1A', alpha);
      for (let i = 0; i < 5; i++) {
        const yy = n.y + 8 + i * 15;
        drawBox(n.x, yy, n.z, n.w - 8, 12, n.d - 8, i === 4 || i === 1 ? n.hex : '#2E2E2A', alpha);
      }
      return;
    }
    if (n.type === 'db') {
      drawCylinder(n.x, n.y, n.z, n.w * 0.48, 18, n.hex, alpha);
      drawCylinder(n.x, n.y + 22, n.z, n.w * 0.46, 18, n.hex, alpha);
      drawCylinder(n.x, n.y + 44, n.z, n.w * 0.44, 22, n.hex, alpha);
      return;
    }
    if (n.type === 'domain') {
      drawBox(n.x, n.y, n.z, 26, 22, 26, n.hex, alpha);
      ctx.save(); ctx.globalAlpha = alpha;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = (i / 40) * Math.PI * 2;
          const p = project(n.x + Math.cos(t) * (32 + k), n.y + 30 + k * 7, n.z + Math.sin(t) * (18 + k));
          i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
        }
        ctx.strokeStyle = k === 1 ? n.hex : 'rgba(22,22,21,0.35)';
        ctx.lineWidth = k === 1 ? 2.4 : 1.1;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (n.type === 'auth') {
      drawBox(n.x, n.y, n.z, n.w, n.h * 0.62, n.d, n.hex, alpha);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const t = Math.PI * (i / 18);
        const p = project(n.x + Math.cos(t) * 14, n.y + n.h * 0.62 + Math.sin(t) * 18, n.z);
        i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
      }
      ctx.strokeStyle = n.hex; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
      return;
    }
    const pulse = n.missing && !reduce ? 0.55 + 0.22 * Math.sin(clock * 0.0045) : alpha;
    drawBox(n.x, n.y, n.z, n.w, n.h, n.d, n.hex, pulse, n.missing);
  }

  function setCamera(beat) {
    cam.from = { tx: cam.tx, ty: cam.ty, tz: cam.tz, rx: cam.rx, ry: cam.ry, zoom: cam.zoom };
    cam.to = { tx: beat.look.x, ty: beat.look.y, tz: beat.look.z, rx: beat.rx, ry: beat.ry, zoom: beat.zoom };
    cam.moveT = 0;
  }

  function applyBeat(i, instant) {
    step = i;
    const beat = BEATS[i];
    scene.focus = beat.focus;
    scene.screen = beat.screen;
    scene.packets = beat.packets;
    scene.hideInfra = !!beat.hideInfra;
    scene.target = beat.text || '';
    scene.typed = beat.screen === 'typing' ? '' : (beat.text || '');
    if (instant) {
      cam.tx = beat.look.x; cam.ty = beat.look.y; cam.tz = beat.look.z;
      cam.rx = beat.rx; cam.ry = beat.ry; cam.zoom = beat.zoom;
      cam.to = null; cam.moveT = 1;
    } else setCamera(beat);

    const path = document.getElementById('hook-path');
    const caption = document.getElementById('hook-caption');
    const you = document.getElementById('hook-chat-you');
    const reply = document.getElementById('hook-chat-reply');
    if (path) path.textContent = beat.path;
    if (caption) caption.textContent = beat.caption;
    if (you) you.textContent = beat.screen === 'typing' ? '' : (beat.text || '');
    if (reply) reply.textContent = beat.reply;
    document.querySelectorAll('.hook-steps button').forEach((b, n) => b.classList.toggle('on', n === i));
  }

  function applyCamera(dt) {
    const mx = (mouseX - 0.5) * 0.18;
    const my = (mouseY - 0.5) * 0.1;
    if (cam.to) {
      cam.moveT = Math.min(1, cam.moveT + dt / 980);
      const u = ease(cam.moveT);
      cam.tx = lerp(cam.from.tx, cam.to.tx, u);
      cam.ty = lerp(cam.from.ty, cam.to.ty, u);
      cam.tz = lerp(cam.from.tz, cam.to.tz, u);
      cam.rx = lerp(cam.from.rx, cam.to.rx, u) + my * 0.2;
      cam.ry = lerp(cam.from.ry, cam.to.ry, u) + mx * 0.3;
      cam.zoom = lerp(cam.from.zoom, cam.to.zoom, u);
    } else if (!reduce) {
      cam.ry += mx * 0.002;
      cam.rx += my * 0.001;
    }
  }

  function render(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    clock += dt;
    applyCamera(dt);

    if (scene.screen === 'typing' && scene.target) {
      render._acc = (render._acc || 0) + dt;
      while (render._acc > 26 && scene.typed.length < scene.target.length) {
        scene.typed += scene.target[scene.typed.length];
        render._acc -= 26;
      }
      const you = document.getElementById('hook-chat-you');
      if (you) you.textContent = scene.typed || '…';
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#F7F6F1');
    g.addColorStop(1, '#EDECE6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawFloor();
    drawCables();
    const sorted = NODES.map(n => ({ n, z: project(n.x, n.y + n.h / 2, n.z).z }))
      .sort((a, b) => b.z - a.z);
    sorted.forEach(({ n }) => {
      const a = nodeAlpha(n);
      if (a < 0.02) return;
      drawNode(n, a);
    });

    requestAnimationFrame(render);
  }

  function armCycle() {
    if (cycle) clearTimeout(cycle);
    if (reduce) return;
    cycle = setTimeout(() => window.__hookGo(step + 1), STEP_MS[step] || 4000);
  }

  window.__hookGo = function (i) {
    stepT = 0;
    applyBeat(((i % BEATS.length) + BEATS.length) % BEATS.length);
    armCycle();
  };

  document.getElementById('hook-steps')?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-step]');
    if (!btn) return;
    window.__hookGo(+btn.dataset.step);
  });

  wrap.addEventListener('mousemove', e => {
    const r = wrap.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width;
    mouseY = (e.clientY - r.top) / r.height;
  });

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
  resize();
  applyBeat(0, true);
  requestAnimationFrame(render);
  armCycle();

  window.addEventListener('pagehide', () => { if (cycle) clearTimeout(cycle); });
})();
