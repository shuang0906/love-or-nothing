export class StateMachine {
  constructor({ initial = 'intro', onTransition = () => {} } = {}) {
    this.state = initial;
    this.ctx = {};               // 存放运行时上下文（当前关卡索引、分数等）
    this.onTransition = onTransition;
  }

  get current() { return this.state; }

  go(next, payload = {}) {
    this.state = next;
    Object.assign(this.ctx, payload);
    this.onTransition(this.state, this.ctx);
  }
}
