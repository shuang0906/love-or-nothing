import { pickRandomLevel } from './levels.js';

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
function renderLevel({ levelTitle, onNext }) {
  renderTemplateInto(app, './level.html', { levelTitle }).then(async () => {
    // ① 标题 Text Scramble
    const titleEl = app.querySelector('#levelTitle') || app.querySelector('.level-screen h2');
    if (titleEl) {
      const fx = new TextScramble(titleEl);
      titleEl.textContent = '';
      await fx.setText(levelTitle);
    }

    // ③ 方向键移动（设置在图片容器上）
    window.addEventListener("gamepadconnected", (event) => {
      console.log("A gamepad connected:");
      console.log(event.gamepad);
    });

    const wrapper = document.getElementById('top-wrapper');
    const top = document.getElementById('top');

    let bgX = 0, bgY = 0;
    let angle = 0;

    const deadZone = 0.2;
    const moveSpeed = 0.5; // 平移速度
    const rotSpeed = 0.5;  // 每帧旋转角度（度）

    function applyTransform() {
      top.style.backgroundPosition = `${-bgX}px ${-bgY}px`;
      //wrapper.style.transform = `rotate(${angle}deg)`;
      wrapper.style.setProperty('--angle', angle + 'deg');
    }

    function getActiveGamepad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (gp && gp.connected && gp.axes && gp.axes.length >= 2) return gp;
      }
      return null;
    }

    function gameLoop() {
      const gp = getActiveGamepad();
      if (gp) {
        // --- R摇杆移动 ---
        const rx = gp.axes[2] ?? 0;
        const ry = gp.axes[3] ?? 0;
        if (Math.abs(rx) > deadZone) bgX += rx * moveSpeed;
        if (Math.abs(ry) > deadZone) bgY += ry * moveSpeed;

        // --- L摇杆旋转 ---
        const lx = gp.axes[0] ?? 0;
        if (Math.abs(lx) > deadZone) angle += lx * rotSpeed;

        // --- A 键复位 ---
        if (gp.buttons[0]?.pressed) { bgX = bgY = 0; angle = 0; }

        applyTransform();
      }
      requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);

    // —— 键盘备用控制 —— //
    const ac = new AbortController();
    const onKey = (e) => {
      let used = true;
      const step = e.shiftKey ? moveSpeed * 2 : moveSpeed;
      switch (e.key) {
        case 'ArrowLeft':  bgX -= step; break;
        case 'ArrowRight': bgX += step; break;
        case 'ArrowUp':    bgY -= step; break;
        case 'ArrowDown':  bgY += step; break;
        case '[':          angle -= rotSpeed; break;
        case ']':          angle += rotSpeed; break;
        case 'a':
        case 'A':          bgX = 0; bgY = 0; angle = 0; break;
        default: used = false;
      }
      if (used) { applyTransform(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey, { passive: false, signal: ac.signal });

    // ⑤ Next Level
    app.querySelector('#nextBtn')?.addEventListener('click', () => {
      onNext();
    });
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
