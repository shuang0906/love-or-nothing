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
    const container = app.querySelector('.image-container');
    const STEP = 2; // 每次按键移动 2px，够明显
    let offsetX = 0, offsetY = 0;
    const applyOffset = () => {
      container?.style.setProperty('--x', offsetX + 'px');
      container?.style.setProperty('--y', offsetY + 'px');
    };
    applyOffset();

    const ac = new AbortController();
    const onKey = (e) => {
      let used = true;
      switch (e.key) {
        case 'ArrowLeft':  offsetX -= STEP; break;
        case 'ArrowRight': offsetX += STEP; break;
        case 'ArrowUp':    offsetY -= STEP; break;
        case 'ArrowDown':  offsetY += STEP; break;
        default: used = false;
      }
      if (used) { applyOffset(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey, { passive: false, signal: ac.signal });

    // ④ 底图淡入（CSS 内含 10s 过渡）
    app.querySelector('#bottom')?.style && (app.querySelector('#bottom').style.opacity = 1);

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
