/* ============================================================
 * 浅奥乐园 · 趣味引擎（Fun Engine）
 * 负责：音效 / 彩带粒子 / 成长吉祥物 / 连击系统 / 每日幸运大转盘
 * 依赖：data.js → store.js（在 app.js 之前加载）
 * 暴露：window.QIAO_FUN
 * 设计：全部本地生成，无外部资源、无网络请求，离线可玩。
 * ============================================================ */
(function () {
  const S = window.QIAO_STORE;
  const D = window.QIAO_DATA;

  /* ---------- 静音持久化 ---------- */
  const MUTE_KEY = "qiao_mute";
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) {}
  function setMute(m) { muted = m; try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch (e) {} }
  function toggleMute() { setMute(!muted); return muted; }

  /* ============================================================
   * 音效：Web Audio 即时合成，无需音频文件
   * ============================================================ */
  let actx = null;
  function ac() {
    if (actx) return actx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    } catch (e) { actx = null; }
    return actx;
  }
  function tone(freq, start, dur, type, gain) {
    const c = ac(); if (!c || muted) return;
    try {
      if (c.state === "suspended") c.resume();
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      const t0 = c.currentTime + start;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    tap()    { tone(520, 0, 0.06, "triangle", 0.07); },
    ok()     { tone(660, 0, 0.12, "sine", 0.16); tone(880, 0.10, 0.16, "sine", 0.16); },
    star()   { tone(1046, 0, 0.18, "triangle", 0.12); },
    wrong()  { tone(200, 0, 0.18, "sawtooth", 0.10); tone(150, 0.12, 0.20, "sawtooth", 0.10); },
    levelup(){ [523,659,784,1046].forEach((f,i)=>tone(f, i*0.12, 0.22, "sine", 0.16)); },
    open()   { tone(440, 0, 0.10, "sine", 0.08); tone(587, 0.08, 0.12, "sine", 0.08); },
    spin()   { tone(300, 0, 0.08, "square", 0.05); },
    /* —— 课程内容三维度优化追加键（不改现有键） —— */
    count_tick() { tone(880, 0, 0.05, "triangle", 0.06); },
    pop()        { tone(500, 0, 0.07, "sine", 0.15); tone(750, 0.05, 0.09, "sine", 0.12); },
    whoosh()     { tone(300, 0, 0.18, "sawtooth", 0.06); },
    fanfare()    { [523,659,784,1046].forEach((f,i)=>tone(f, i*0.1, 0.2, "sine", 0.14)); },
    wrong_buzz() { tone(160, 0, 0.16, "square", 0.08); },
    boing()      { tone(400,0,0.1,"sine",0.1); tone(180,0.08,0.14,"sine",0.08); }
  };

  /* ============================================================
   * 彩带：canvas 粒子（答对小彩带 / 通关大彩带）
   * ============================================================ */
  let confettiCanvas = null, confettiCtx = null, rafId = null, particles = [];
  function ensureCanvas() {
    if (confettiCanvas) return;
    confettiCanvas = document.createElement("canvas");
    confettiCanvas.id = "confetti";
    confettiCanvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:300";
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext("2d");
    function resize() { confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight; }
    resize(); addEventListener("resize", resize);
  }
  const COLORS = ["#2E6BFF","#16B364","#FFB020","#FF7A59","#8B5CF6","#0EA5E9","#E64980"];
  function confetti(count, big) {
    if (muted && false) {} // 彩带与声音无关，始终放
    ensureCanvas();
    const W = confettiCanvas.width, H = confettiCanvas.height;
    const cx = W / 2, cy = big ? H * 0.42 : H * 0.34;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (big ? 6 : 3.5) + Math.random() * (big ? 9 : 5);
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (big ? 4 : 2),
        g: 0.16 + Math.random() * 0.08,
        size: 6 + Math.random() * 7, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0], life: 1
      });
    }
    if (!rafId) animate();
  }
  function animate() {
    const W = confettiCanvas.width, H = confettiCanvas.height;
    confettiCtx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
      confettiCtx.save();
      confettiCtx.globalAlpha = Math.max(0, p.life);
      confettiCtx.translate(p.x, p.y); confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    });
    particles = particles.filter(p => p.life > 0 && p.y < H + 40);
    if (particles.length) rafId = requestAnimationFrame(animate);
    else { rafId = null; confettiCtx.clearRect(0, 0, W, H); }
  }

  /* ============================================================
   * 成长吉祥物：随等级进化，气泡夸赞
   * ============================================================ */
  const MASCOT_BY_LV = { "萌芽":"🥚", "成长":"🐣", "进阶":"🐥", "小奥将":"🦉", "奥数星":"🐲" };
  const PRAISE = ["太棒了！🌟","答对啦，你真聪明！","完全正确！","厉害！继续保持～","就是这么简单！",
    "你学会啦！💡","满分思路！","干得漂亮！👏","这一题被你拿下了！","稳稳的，太强了！"];
  const COMFORT = ["没关系，再想想就对了💪","差一点点，加油！","别灰心，我们一起看解析～","错一次没关系，下次一定行","小失误，很正常，来看看知识点"];
  const CHEER_BIG = ["升级啦！你越来越强🎉","新徽章到手，真厉害！","完美通关，全场最佳！","连击不断，数学小天才！"];
  const GREET = ["嗨，今天也要加油哦！","我来陪你闯关啦～","做完题记得来转转盘🎡","今天的数学冒险开始！","有难题？点知识点回放就知道啦"];

  let mascotEl = null, bubbleEl = null, bodyEl = null, bubbleTimer = null;
  function buildMascot() {
    if (mascotEl) return;
    mascotEl = document.createElement("div");
    mascotEl.id = "mascot";
    mascotEl.innerHTML = `<div class="mascot-bubble" id="mascotBubble"></div><div class="mascot-body" id="mascotBody">🥚</div>`;
    document.body.appendChild(mascotEl);
    bubbleEl = mascotEl.querySelector("#mascotBubble");
    bodyEl = mascotEl.querySelector("#mascotBody");
    bodyEl.addEventListener("click", () => { sfx.tap(); bounce(); say(pick(GREET), 2600); });
    refreshMascot();
  }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function refreshMascot() {
    if (!bodyEl) return;
    const lv = (S.user && S.user.level) || "萌芽";
    bodyEl.textContent = MASCOT_BY_LV[lv] || "🥚";
  }
  function say(msg, ms) {
    if (!bubbleEl) return;
    bubbleEl.textContent = msg; bubbleEl.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubbleEl.classList.remove("show"), ms || 2000);
  }
  function bounce() { if (!bodyEl) return; bodyEl.classList.remove("bob"); void bodyEl.offsetWidth; bodyEl.classList.add("bob"); }
  const mascot = {
    init() { buildMascot(); },
    refresh() { refreshMascot(); },
    say, bounce,
    greet() { buildMascot(); refreshMascot(); say(pick(GREET), 2800); },
    cheer() { bounce(); say(pick(PRAISE), 1800); },
    encourage() { say(pick(COMFORT), 2400); },
    celebrate() { bounce(); say(pick(CHEER_BIG), 2600); },
    praiseWord() { return pick(PRAISE); }
  };

  /* ============================================================
   * 连击系统：连续答对累计，达里程碑奖星
   * ============================================================ */
  const combo = {
    count: 0,
    bump() {
      this.count++;
      let bonus = 0;
      if (this.count === 3 || this.count === 6 || this.count === 10 ||
          (this.count > 10 && this.count % 5 === 0)) bonus = 1;
      showCombo(this.count);
      if (bonus) sfx.star();
      return { count: this.count, bonus };
    },
    reset() { this.count = 0; hideCombo(); },
    get value() { return this.count; }
  };
  let comboEl = null;
  function showCombo(n) {
    if (n < 2) return;
    if (!comboEl) {
      comboEl = document.createElement("div");
      comboEl.id = "comboBadge";
      document.body.appendChild(comboEl);
    }
    const bonus = (n === 3 || n === 6 || n === 10 || (n > 10 && n % 5 === 0));
    comboEl.textContent = "🔥 连击 x" + n + (bonus ? "  +1⭐" : "");
    comboEl.classList.remove("show"); void comboEl.offsetWidth; comboEl.classList.add("show");
  }
  function hideCombo() { if (comboEl) comboEl.classList.remove("show"); }

  /* ============================================================
   * 每日幸运大转盘（每日一次，奖星）
   * ============================================================ */
  const WHEEL_PRIZES = [2, 3, 5, 8, 3, 2, 5, 10]; // 8 格
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function canSpinToday() {
    const u = S.user; return !u || !u.lastSpin || u.lastSpin !== todayStr();
  }
  function dailyWheel(onAward) {
    sfx.open();
    const N = WHEEL_PRIZES.length;
    const seg = 360 / N;
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    const wheelHtml = `
      <div class="modal wheel-modal">
        <h2>🎡 每日幸运大转盘</h2>
        <p class="wheel-sub">每天一次，转一转领星星！</p>
        <div class="wheel-wrap">
          <div class="wheel-pointer">▼</div>
          <div class="wheel" id="wheel"></div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:14px" id="spinBtn">开始转动 🎯</button>
        <div class="wheel-result" id="wheelResult"></div>
      </div>`;
    mask.innerHTML = wheelHtml;
    mask.addEventListener("click", e => { if (e.target === mask) mask.remove(); });
    document.body.appendChild(mask);

    const wheel = mask.querySelector("#wheel");
    // 用 conic-gradient 画彩盘 + 文字标签
    const grad = WHEEL_PRIZES.map((p, i) => {
      const a0 = i * seg, a1 = (i + 1) * seg;
      const col = COLORS[i % COLORS.length];
      return `${col} ${a0}deg ${a1}deg`;
    }).join(",");
    wheel.style.background = `conic-gradient(${grad})`;
    // 标签
    WHEEL_PRIZES.forEach((p, i) => {
      const lab = document.createElement("div");
      lab.className = "wheel-lab";
      lab.style.transform = `rotate(${i * seg + seg / 2}deg)`;
      lab.innerHTML = `<span>${p}⭐</span>`;
      wheel.appendChild(lab);
    });

    const btn = mask.querySelector("#spinBtn");
    const res = mask.querySelector("#wheelResult");
    let spinning = false;
    btn.addEventListener("click", () => {
      if (spinning) return; spinning = true; btn.disabled = true; sfx.spin();
      const idx = (Math.random() * N) | 0;            // 中奖格
      const target = 360 * 5 + (360 - (idx * seg + seg / 2)); // 多转几圈后停在 idx
      wheel.style.transform = `rotate(${wheel._rot = (wheel._rot || 0) % 360 + target}deg)`;
      setTimeout(() => {
        const prize = WHEEL_PRIZES[idx];
        res.innerHTML = `🎉 恭喜获得 <b>${prize} ⭐</b>！`;
        sfx.levelup(); confetti(60, false);
        const u = S.user; u.lastSpin = todayStr(); S.save(u);
        if (typeof onAward === "function") onAward(prize);
        btn.textContent = "明天再来～";
      }, 2600);
    });
    return mask;
  }

  /* ---------- 暴露 ---------- */
  window.QIAO_FUN = {
    sfx, confetti, mascot, combo,
    toggleMute, isMuted: () => muted,
    dailyWheel, canSpinToday,
    MASCOT_BY_LV
  };
})();
