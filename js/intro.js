'use strict';

(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('intro');
  const promptEl = document.getElementById('prompt-text');
  const replyEl = document.getElementById('reply');
  const urlEl = document.getElementById('chrome-url');
  const noteEl = document.getElementById('chrome-note');
  const card1 = document.querySelector('.promise-card[data-card="1"]');
  const card2 = document.querySelector('.promise-card[data-card="2"]');
  const enterBtns = document.querySelectorAll('[data-enter]');
  const skipBtns = document.querySelectorAll('[data-skip]');
  const timers = [];

  const PROMPT = '회원가입과 예약 기능이 있는 운동시설 사이트를 만들어줘.';

  function later(fn, ms) {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function mark(key, cls) {
    const el = document.querySelector('.build i[data-k="' + key + '"]');
    if (!el) return;
    el.classList.remove('on', 'warn');
    if (cls) el.classList.add(cls);
  }

  function go(href) {
    if (document.body.classList.contains('leaving')) return;
    timers.forEach(clearTimeout);
    if (reduce) {
      window.location.href = href;
      return;
    }
    document.body.classList.add('leaving');
    window.setTimeout(() => { window.location.href = href; }, 320);
  }

  function finish() {
    intro.classList.add('is-start', 'is-drop', 'is-reveal', 'is-nav', 'is-hero', 'is-classes', 'is-book', 'is-toast', 'is-live', 'is-invite');
    promptEl.textContent = PROMPT;
    urlEl.textContent = 'hangangfit.baesh.dev';
    noteEl.textContent = '예시';
    replyEl.textContent = '예약까지 붙였어요. 사진만 나중에 넣으면 돼요.';
    mark('home', 'on');
    mark('book', 'on');
    mark('auth', 'on');
    mark('store', 'warn');
  }

  function play() {
    if (reduce) {
      finish();
      return;
    }
    promptEl.textContent = '';
    later(function () {
      card1.classList.add('is-on');
    }, 80);
    later(function () {
      card1.classList.remove('is-on');
      card2.classList.add('is-on');
      later(startExample, 2400);
    }, 2600);
  }

  function startExample() {
    intro.classList.add('is-start');
    noteEl.textContent = '예시';
    later(typePrompt, 920);
  }

  function typePrompt() {
    let i = 0;
    later(function type() {
      i += 1;
      promptEl.textContent = PROMPT.slice(0, i);
      if (i < PROMPT.length) later(type, 24);
      else later(drop, 360);
    }, 80);
  }

  function drop() {
    intro.classList.add('is-drop');
    replyEl.textContent = '홈 화면부터 만들고 있어요.';
    noteEl.textContent = '만드는 중';
    later(() => {
      intro.classList.add('is-reveal');
      build();
    }, 780);
  }

  function build() {
    replyEl.textContent = '홈 화면부터 만들고 있어요.';
    noteEl.textContent = '만드는 중';
    later(() => {
      intro.classList.add('is-nav', 'is-hero');
      mark('home', 'on');
      urlEl.textContent = 'hangangfit.baesh.dev';
      replyEl.textContent = '강남점 화면이 나왔어요.';
    }, 120);
    later(() => {
      intro.classList.add('is-classes');
      mark('auth', 'on');
      replyEl.textContent = '오늘 수업 시간표를 붙였어요.';
    }, 1100);
    later(() => {
      intro.classList.add('is-book');
      mark('book', 'on');
      replyEl.textContent = '예약 칸까지 넣어 두었어요.';
    }, 2100);
    later(() => {
      intro.classList.add('is-toast', 'is-live');
      mark('store', 'warn');
      noteEl.textContent = '예시';
      replyEl.textContent = '예약까지 붙였어요. 사진만 나중에 넣으면 돼요.';
      later(inviteBack, 2200);
    }, 3200);
  }

  function inviteBack() {
    intro.classList.add('is-invite');
    noteEl.textContent = '예시';
  }

  enterBtns.forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    go('home.html');
  }));
  skipBtns.forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    go('home.html');
  }));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-enter')) go('home.html');
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-skip')) go('home.html');
      return;
    }
    e.preventDefault();
    go('home.html');
  });

  play();
})();
