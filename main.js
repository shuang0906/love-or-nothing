import { pickRandomLevel } from './levels.js';

const IMAGE_GROUPS = [
  { id: 1, bottom: 'assets/img/bottomv1.png', top: 'assets/img/topv1.png' },
  { id: 2, bottom: 'assets/img/bottomv2.png', top: 'assets/img/topv2.png' },
  { id: 3, bottom: 'assets/img/bottomv3.png', top: 'assets/img/topv3.png' },
];


const app = document.getElementById('app');

/* ---------------- Text Scramble ---------------- */
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.frame = 0;
    this.queue = [];
    this.update = this.update.bind(this);
    this.raf = null;
  }
  setText(newText) {
    const oldText = this.el.textContent || '';
    const length = Math.max(oldText.length, newText.length);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 10);
      const end = start + Math.floor(Math.random() * 10) + 10;
      this.queue.push({ from, to, start, end, char: '' });
    }
    if (this.raf) cancelAnimationFrame(this.raf);
    this.frame = 0;
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.update();
    });
  }
  update() {
    let out = '';
    let complete = 0;
    for (const q of this.queue) {
      if (this.frame >= q.end) {
        complete++; out += q.to;
      } else if (this.frame >= q.start) {
        if (!q.char || Math.random() < 0.28) q.char = this.randomChar();
        out += `<span class="scramble">${q.char}</span>`;
      } else {
        out += q.from;
      }
    }
    this.el.innerHTML = out;
    if (complete === this.queue.length) {
      this.resolve && this.resolve();
      this.raf = null;
    } else {
      this.frame++;
      this.raf = setTimeout(this.update, 1000 / 20);
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

/* ------------- fetch HTML partial -------------- */
async function renderTemplateInto(el, url, data = {}) {
  let html = await (await fetch(url)).text();
  html = html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (data[k] ?? ''));
  el.innerHTML = html;
}

/* ----------------- Level screen ---------------- */
// ===== 全局：单例 rAF 循环 + 可变控制对象 =====
let rafId1 = null;
let prevA = false;
let currentControls = null; // <- 关键：当前关卡的可变引用与状态

function getActiveGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) if (gp && gp.connected && gp.axes?.length >= 2) return gp;
  return null;
}

function startLoop() {
  if (rafId1 !== null) return;
  const tick = () => {
    const gp = getActiveGamepad();
    const c = currentControls;      // 总是读取**当前**控制对象
    if (gp && c) {
      const ax = gp.axes || [];

      // R摇杆：平移
      const rx = ax[2] ?? 0, ry = ax[3] ?? 0;
      if (Math.abs(rx) > c.deadZone) c.bgX += rx * c.moveSpeed;
      if (Math.abs(ry) > c.deadZone) c.bgY += ry * c.moveSpeed;

      // L摇杆：旋转（增量）
      const lx = ax[0] ?? 0;
      if (Math.abs(lx) > c.deadZone) c.angle += lx * c.rotSpeed;

      // A 键上升沿：切换
      const aPressed = !!gp.buttons?.[0]?.pressed;
      if (aPressed && !prevA && typeof c.onNext === 'function') {
        c.onBeforeNext?.();   // 可选：清理当前关卡监听
        c.onNext();           // 触发切换
      }
      prevA = aPressed;

      // 应用到**当前** DOM
      c.applyTransform();
    }
    rafId1 = requestAnimationFrame(tick);
  };
  rafId1 = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafId1 !== null) { cancelAnimationFrame(rafId); rafId1 = null; }
  prevA = false;
}


function renderLevel({ levelTitle, onNext }) {
  renderTemplateInto(app, './level.html', { levelTitle }).then(async () => {
    // ① 标题
    const titleEl = app.querySelector('#levelTitle') || app.querySelector('.level-screen h2');
    if (titleEl) {
      const fx = new TextScramble(titleEl);
      titleEl.textContent = '';
      fx.setText(levelTitle);
    }

    const wrapper = document.getElementById('top-wrapper');
    const top = document.getElementById('top');

    // 每关自己的键盘监听（可清理）
    const ac = new AbortController();

    // —— 创建 / 覆盖 currentControls —— //
    currentControls = {
      // DOM 引用（新的）
      wrapper,
      top,

      // 状态
      bgX: 0,
      bgY: 0,
      angle: 0,

      // 参数
      deadZone: 0.2,
      moveSpeed: 0.2,
      rotSpeed: 0.1,

      // 应用函数（用**当前** DOM）
      applyTransform() {
        this.top.style.backgroundPosition = `${-this.bgX}px ${-this.bgY}px`;
        this.wrapper.style.setProperty('--angle', this.angle + 'deg');
      },

      // 切关钩子
      onNext,                     // 提供给 rAF 循环调用
      onBeforeNext() { ac.abort(); } // 切换前清理键盘监听
    };

    // 初次应用
    currentControls.applyTransform();

    // —— 键盘备用控制（读取 currentControls，而不是闭包里的局部变量）—— //
    const kbdStep = 24, rotStep = 3;
    const onKey = (e) => {
      const c = currentControls;   // 关键：每次按键都取**最新**对象
      if (!c) return;
      let used = true;
      const step = e.shiftKey ? kbdStep * 2 : kbdStep;

      switch (e.key) {
        case 'ArrowLeft': c.bgX -= step; break;
        case 'ArrowRight': c.bgX += step; break;
        case 'ArrowUp': c.bgY -= step; break;
        case 'ArrowDown': c.bgY += step; break;
        case '[': c.angle -= rotStep; break;
        case ']': c.angle += rotStep; break;
        case 'a':
        case 'A': c.bgX = 0; c.bgY = 0; c.angle = 0; break;
        default: used = false;
      }
      if (used) { c.applyTransform(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey, { passive: false, signal: ac.signal });

    let groupIndex = 0; // 当前使用哪一组（0,1,2）

    // —— 应用图片组 —— //
    function applyImages(idx) {
      const g = IMAGE_GROUPS[idx];
      const bottomEl = app.querySelector('#bottom');
      const topEl = app.querySelector('#top');
      if (bottomEl) bottomEl.src = g.bottom;
      if (topEl) topEl.style.backgroundImage = `url("${g.top}")`;
    }

    function cycle(dir) {
      groupIndex = (groupIndex + dir + IMAGE_GROUPS.length) % IMAGE_GROUPS.length; // 无限循环
      applyImages(groupIndex);
    }

    // 初次应用图片
    applyImages(groupIndex);

    // 按键 1/2/3 切换组
    const onDigit = (e) => {
      const map = { Digit1: 0, Numpad1: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2 };
      if (e.code in map) {
        groupIndex = map[e.code];
        applyImages(groupIndex);
      }
    };
    window.addEventListener('keydown', onDigit, { signal: ac.signal });

    let rafId = 0;
    const pressed = { lt: false, rt: false, lb: false, rb: false };
    const repeatTimers = { lt: null, rt: null };
    function edge(now, key) {
      const was = pressed[key] || false;
      pressed[key] = now;
      return now && !was; // 上沿
    }

    const INITIAL_DELAY = 300; // 长按初次延时（ms）
    const REPEAT_RATE = 120; // 连发间隔（ms）

    function startRepeat(key, dir) {
      if (repeatTimers[key]) return;
      repeatTimers[key] = setTimeout(() => {
        // 开始间隔连发
        repeatTimers[key] = setInterval(() => cycle(dir), REPEAT_RATE);
      }, INITIAL_DELAY);
    }
    function stopRepeat(key) {
      if (!repeatTimers[key]) return;
      const t = repeatTimers[key];
      repeatTimers[key] = null;
      clearTimeout(t); clearInterval(t);
    }

    function pollGamepad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads.find(p => p && p.connected);
      if (gp) {
        const LT = gp.buttons[6]?.pressed || gp.buttons[6]?.value > 0.5; // L2
        const RT = gp.buttons[7]?.pressed || gp.buttons[7]?.value > 0.5; // R2
        const LB = gp.buttons[4]?.pressed; // 可选肩键
        const RB = gp.buttons[5]?.pressed;

        // 单击触发
        if (edge(RT, 'rt')) cycle(+1);
        if (edge(LT, 'lt')) cycle(-1);
        if (edge(RB, 'rb')) cycle(+1); // 可选：RB 同 R2
        if (edge(LB, 'lb')) cycle(-1); // 可选：LB 同 L2

        // 长按连发（可选）
        if (RT) startRepeat('rt', +1); else stopRepeat('rt');
        if (LT) startRepeat('lt', -1); else stopRepeat('lt');
      }
      rafId = requestAnimationFrame(pollGamepad);
    }
    rafId = requestAnimationFrame(pollGamepad);

    // “下一关”按钮
    app.querySelector('#nextBtn')?.addEventListener('click', () => {
      ac.abort();
      onNext();
    }, { signal: ac.signal });

    // 确保主循环已启动
    startLoop();
  });
}

/* ------------------- Loop ---------------------- */
function showLevel(title) {
  renderLevel({
    levelTitle: title,
    onNext: () => showLevel(pickRandomLevel().title),
  });
}

// 启动第一关
showLevel(pickRandomLevel().title);
