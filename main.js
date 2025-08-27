// main.js
import { StateMachine } from './stateMachine.js';
import { pickRandomLevel } from './levels.js';

const app = document.getElementById('app');

// helper: fetch HTML partial and replace {{placeholders}}
async function renderTemplateInto(el, url, data = {}) {
  let html = await (await fetch(url)).text();
  html = html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (data[k] ?? ''));
  el.innerHTML = html;
}

// ------- Render functions -------
async function renderIntro(onStart) {
  await renderTemplateInto(app, './intro.html');

  dragElement(app.querySelector('#top'));

  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  app.querySelector('#startBtn').addEventListener('click', onStart);

}

function renderLevel({ levelTitle, onNext, onBack }) {
  // load external HTML, then attach behavior
  renderTemplateInto(app, './level.html', { levelTitle }).then(async () => {


    const titleEl = app.querySelector('#levelTitle') || app.querySelector('.level-screen h2');
    if (titleEl) {
      // 先清空再播放动画到目标标题
      const fx = new TextScramble(titleEl);
      titleEl.textContent = '';         // 强制从空开始扰动
      await fx.setText(levelTitle);     // 动画完成后继续下面流程
    }

    // ----- Countdown -----
    let remain = 10;
    const countEl = app.querySelector('#count');
    const btnRow = app.querySelector('#btnRow');
    const nextBtn = app.querySelector('#nextBtn');
    const backBtn = app.querySelector('#backBtn');

    let enableMove = true;
    nextBtn.disabled = true;

    const timer = setInterval(() => {
      remain -= 1;
      if (countEl) countEl.textContent = remain;
      if (remain <= 0) {
        clearInterval(timer);
        nextBtn.disabled = false;
      }
    }, 1000);

    // ----- Arrow keys (scoped vars) -----
    const container = app.querySelector('.level-screen');
    const STEP = 0.05;
    let offsetX = 0, offsetY = 0;

    const applyOffset = () => {
      if (!container) return;
      if (!enableMove) return;
      container.style.setProperty('--x', offsetX + 'px');
      container.style.setProperty('--y', offsetY + 'px');
    };
    applyOffset();

    const ac = new AbortController();
    const onKey = (e) => {
      let used = true;
      switch (e.key) {
        case 'ArrowLeft': offsetX -= STEP; break;
        case 'ArrowRight': offsetX += STEP; break;
        case 'ArrowUp': offsetY -= STEP; break;
        case 'ArrowDown': offsetY += STEP; break;
        default: used = false;
      }
      if (used) { applyOffset(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey, { passive: false, signal: ac.signal });

     // ----- animation -----
    document.getElementById('fadeBtn').addEventListener('click', () => {
      const bottom = document.getElementById('bottom');
      // 先确保初始透明
      bottom.style.opacity = 0;
      const audio = document.getElementById('sound');
      audio.currentTime = 0; // 每次从头播放
      audio.play();

      // 5 秒后再开始渐变到 1
      setTimeout(() => {
        bottom.style.opacity = 1;
      }, 5000);

      setTimeout(() => {
        enableMove = false;
      }, 7000);
    });

    // ----- Buttons -----
    const cleanup = () => { ac.abort(); clearInterval(timer); };
    nextBtn.addEventListener('click', () => { cleanup(); onNext(); });
    backBtn.addEventListener('click', () => { cleanup(); onBack(); });
  });
}


// ------- State machine -------
const fsm = new StateMachine({
  initial: 'intro',
  onTransition: (state, ctx) => {
    if (state === 'intro') {
      renderIntro(() => {
        const level = pickRandomLevel();
        fsm.go('level', { levelTitle: level.title });
      });
    }
    else if (state === 'level') {
      renderLevel({
        levelTitle: ctx.levelTitle,
        onNext: () => {
          const next = pickRandomLevel();
          fsm.go('level', { levelTitle: next.title });
        },
        onBack: () => fsm.go('intro')
      });
    }
  }
});

// Start game
fsm.go('intro');


// Text Scramble effect
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.frame = 0;
    this.queue = [];
    this.update = this.update.bind(this);
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
    cancelAnimationFrame(this.raf);
    this.frame = 0;
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.update();
    });
  }
  update() {
    let output = '';
    let complete = 0;
    for (const q of this.queue) {
      if (this.frame >= q.end) {
        complete++;
        output += q.to;
      } else if (this.frame >= q.start) {
        if (!q.char || Math.random() < 0.28) {
          q.char = this.randomChar();
        }
        output += `<span class="scramble">${q.char}</span>`;
      } else {
        output += q.from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve && this.resolve();
    } else {
      this.frame++;
      this.raf = setTimeout(this.update, 1000 / 20); 
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}
