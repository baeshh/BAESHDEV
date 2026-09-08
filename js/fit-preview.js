/* Hangang Fit — interactive preview inside the console */
'use strict';

(function (global) {
  const KEY = 'baeshdev.fit';

  const CLASSES = [
    { id: 'yoga', time: '07:00', dur: '50분', name: '모닝 요가', coach: '윤서아', place: '성수', seats: 0 },
    { id: 'pilates', time: '19:00', dur: '50분', name: '필라테스 매트', coach: '윤민지', place: '강남', seats: 2 },
    { id: 'spin', time: '20:00', dur: '45분', name: '스피닝', coach: '박도윤', place: '강남', seats: 6 },
  ];

  const SLOTS = [
    { id: '18', label: '18:00', left: '4자리' },
    { id: '19', label: '19:00', left: '2자리' },
    { id: '20', label: '20:00', left: '가능' },
  ];

  function blank() {
    return {
      features: { auth: false, booking: true },
      view: 'home',
      user: null,
      accounts: [],
      bookings: [],
      selected: 'pilates',
      slot: '19',
      notice: '',
    };
  }

  let state = blank();
  let root = null;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(blank(), JSON.parse(raw));
    } catch (_) { state = blank(); }
  }

  function cls(id) { return CLASSES.find((c) => c.id === id) || CLASSES[1]; }

  function remaining(id) {
    const base = cls(id).seats;
    const taken = state.bookings.filter((b) => b.classId === id).length;
    return Math.max(0, base - taken);
  }

  function setNotice(msg) {
    state.notice = msg;
    save();
    render();
  }

  function go(view) {
    state.view = view;
    state.notice = '';
    save();
    render();
  }

  function enableAuth() {
    state.features.auth = true;
    state.view = 'login';
    state.notice = '회원가입과 로그인을 붙였어요. 미리보기에서 바로 들어가 보세요.';
    save();
    render();
  }

  function enableBooking() {
    state.features.booking = true;
    state.view = 'home';
    state.notice = '수업 예약을 붙였어요. 로그인하면 바로 잡을 수 있어요.';
    save();
    render();
  }

  function reset(opts) {
    state = blank();
    if (opts && opts.auth) state.features.auth = true;
    if (opts && opts.booking === false) state.features.booking = false;
    save();
  }

  function signup(name, email, password) {
    email = (email || '').trim().toLowerCase();
    if (!name || name.trim().length < 2) return '이름을 입력해 주세요.';
    if (!email.includes('@')) return '이메일을 확인해 주세요.';
    if (!password || password.length < 4) return '비밀번호는 4자 이상이에요.';
    if (state.accounts.some((a) => a.email === email)) return '이미 있는 계정이에요. 로그인해 주세요.';
    const user = { name: name.trim(), email, password };
    state.accounts.push(user);
    state.user = { name: user.name, email: user.email };
    state.view = 'home';
    state.notice = name.trim() + '님, 가입했어요. 오늘 수업을 잡아 보세요.';
    save();
    render();
    return '';
  }

  function login(email, password) {
    email = (email || '').trim().toLowerCase();
    const acc = state.accounts.find((a) => a.email === email);
    if (!acc) return '계정이 없어요. 먼저 가입해 주세요.';
    if (acc.password !== password) return '비밀번호가 달라요.';
    state.user = { name: acc.name, email: acc.email };
    state.view = 'home';
    state.notice = acc.name + '님, 다시 왔어요.';
    save();
    render();
    return '';
  }

  function logout() {
    state.user = null;
    state.view = 'home';
    state.notice = '';
    save();
    render();
  }

  function book() {
    if (!state.features.booking) return setNotice('아직 예약이 없어요. 채팅에서 예약을 붙여 달라고 말해 보세요.');
    if (!state.features.auth) return setNotice('로그인을 먼저 붙여야 예약을 받을 수 있어요. 채팅에 “로그인 기능 추가해줘”라고 말해 보세요.');
    if (!state.user) { go('login'); setNotice('예약하려면 로그인해 주세요.'); return; }
    const c = cls(state.selected);
    if (remaining(c.id) <= 0) return setNotice('이 수업은 자리가 없어요.');
    const slot = SLOTS.find((s) => s.id === state.slot) || SLOTS[1];
    const dup = state.bookings.some((b) => b.email === state.user.email && b.classId === c.id && b.slot === slot.label);
    if (dup) return setNotice('이미 이 수업을 예약했어요.');
    state.bookings.unshift({
      id: 'b-' + Date.now(),
      email: state.user.email,
      name: state.user.name,
      classId: c.id,
      title: c.name,
      when: '오늘 ' + slot.label,
      place: c.place,
      coach: c.coach,
      slot: slot.label,
    });
    state.view = 'mine';
    state.notice = c.name + ' ' + slot.label + ' 예약을 확정했어요.';
    save();
    render();
  }

  function cancel(id) {
    state.bookings = state.bookings.filter((b) => b.id !== id);
    state.notice = '예약을 취소했어요.';
    save();
    render();
  }

  function nav() {
    const authed = !!state.user;
    const loginBtn = state.features.auth
      ? (authed
        ? `<button type="button" onclick="FitPreview.go('mine')">${esc(state.user.name)}</button>
           <button type="button" onclick="FitPreview.logout()">나가기</button>`
        : `<button type="button" class="fit-cta" onclick="FitPreview.go('login')">로그인</button>`)
      : `<button type="button" class="fit-cta" onclick="FitPreview.askAuth()">로그인</button>`;
    return `<nav class="fit-nav">
      <div class="fit-brand"><i></i>한강핏</div>
      <button type="button" class="fit-link" onclick="FitPreview.go('home')">수업</button>
      <div class="fit-nav-end">${loginBtn}</div>
    </nav>`;
  }

  function notice() {
    if (!state.notice) return '';
    return `<div class="fit-banner">${esc(state.notice)}</div>`;
  }

  function home() {
    const c = cls(state.selected);
    return `<div class="fit-body">
      ${notice()}
      <p class="fit-kicker">강남점 · 한강뷰 스튜디오</p>
      <h2>오늘 저녁,<br>운동하러 오세요.</h2>
      <p class="fit-sub">회원가입하고, 원하는 수업을 바로 예약하세요. 강남·성수 두 지점에서 당일 예약이 가능합니다.</p>
      <div class="fit-classes">
        ${CLASSES.map((item) => {
          const left = remaining(item.id);
          const full = left <= 0;
          return `<button type="button" class="fit-class${item.id === c.id ? ' on' : ''}" onclick="FitPreview.pick('${item.id}')">
            <div><b>${item.time}</b><small>${item.dur}</small></div>
            <div><span>${item.name}</span><em>${item.coach} · ${item.place}</em></div>
            <div class="fit-seats${full ? ' full' : ''}">${full ? '가득' : left + '자리'}</div>
          </button>`;
        }).join('')}
      </div>
      <button type="button" class="fit-btn" style="margin-top:16px" onclick="FitPreview.go('book')">지금 예약하기</button>
    </div>`;
  }

  function authView(mode) {
    const signup = mode === 'signup';
    return `<div class="fit-body">
      <div class="fit-panel">
        ${notice()}
        <h3>${signup ? '회원가입' : '로그인'}</h3>
        ${signup ? `<div class="fit-field"><label>이름</label><input id="fit-name" autocomplete="name" placeholder="홍길동"></div>` : ''}
        <div class="fit-field"><label>이메일</label><input id="fit-email" type="email" autocomplete="username" placeholder="you@mail.com"></div>
        <div class="fit-field"><label>비밀번호</label><input id="fit-password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="4자 이상"></div>
        <p class="fit-note" id="fit-auth-err" hidden></p>
        <button type="button" class="fit-btn" onclick="FitPreview.submitAuth('${mode}')">${signup ? '가입하고 시작' : '로그인'}</button>
        <button type="button" class="fit-btn ghost" onclick="FitPreview.go('${signup ? 'login' : 'signup'}')">${signup ? '이미 계정이 있어요' : '계정이 없어요. 만들기'}</button>
      </div>
    </div>`;
  }

  function bookView() {
    const c = cls(state.selected);
    const left = remaining(c.id);
    return `<div class="fit-body">
      <div class="fit-panel">
        ${notice()}
        <p class="fit-kicker">${c.place}점 · 오늘</p>
        <h3>${c.name}</h3>
        <p class="fit-sub" style="margin-bottom:4px">${c.coach} · ${c.dur}</p>
        <div class="fit-slots">
          ${SLOTS.map((s) => `<button type="button" class="${s.id === state.slot ? 'pick' : ''}" onclick="FitPreview.setSlot('${s.id}')">${s.label}<small>${s.left}</small></button>`).join('')}
        </div>
        ${state.user ? `<p class="fit-note">${esc(state.user.name)} · ${esc(state.user.email)}</p>` : `<p class="fit-note">예약하려면 로그인이 필요해요.</p>`}
        <button type="button" class="fit-btn" ${left <= 0 ? 'disabled' : ''} onclick="FitPreview.book()">${left <= 0 ? '자리 없음' : '예약 확정'}</button>
        <button type="button" class="fit-btn ghost" onclick="FitPreview.go('home')">수업 목록</button>
      </div>
    </div>`;
  }

  function mineView() {
    const mine = state.user ? state.bookings.filter((b) => b.email === state.user.email) : [];
    return `<div class="fit-body">
      <div class="fit-panel">
        ${notice()}
        <h3>내 예약</h3>
        ${!state.user ? `<p class="fit-empty">로그인이 필요해요.</p>` : mine.length === 0 ? `<p class="fit-empty">아직 예약이 없어요.</p>` : `<div class="fit-list">${mine.map((b) => `
          <div class="fit-row">
            <div><strong>${esc(b.title)}</strong><div class="fit-note" style="margin:4px 0 0">${esc(b.when)} · ${esc(b.place)} · ${esc(b.coach)}</div></div>
            <button type="button" class="fit-link" onclick="FitPreview.cancel('${b.id}')">취소</button>
          </div>`).join('')}</div>`}
        <button type="button" class="fit-btn" onclick="FitPreview.go('home')">수업 보러 가기</button>
      </div>
    </div>`;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    if (!root) return;
    let body = home();
    if (state.view === 'login') body = authView('login');
    else if (state.view === 'signup') body = authView('signup');
    else if (state.view === 'book') body = bookView();
    else if (state.view === 'mine') body = mineView();
    root.innerHTML = `<div class="fit-app">${nav()}${body}</div>`;
  }

  function mount(el) {
    root = el;
    load();
    render();
  }

  function submitAuth(mode) {
    const email = document.getElementById('fit-email');
    const password = document.getElementById('fit-password');
    const name = document.getElementById('fit-name');
    const err = document.getElementById('fit-auth-err');
    const msg = mode === 'signup'
      ? signup(name && name.value, email && email.value, password && password.value)
      : login(email && email.value, password && password.value);
    if (msg && err) { err.hidden = false; err.textContent = msg; }
  }

  function askAuth() {
    setNotice('아직 로그인이 없어요. 오른쪽 채팅에 “로그인 기능 추가해줘”라고 말해 보세요.');
  }

  global.FitPreview = {
    mount, reset, go, enableAuth, enableBooking, logout, book, cancel,
    pick(id) { state.selected = id; save(); if (state.view === 'book') render(); else go('book'); },
    setSlot(id) { state.slot = id; save(); render(); },
    submitAuth, askAuth,
    hasAuth() { return state.features.auth; },
    hasBooking() { return state.features.booking; },
  };
})(window);
