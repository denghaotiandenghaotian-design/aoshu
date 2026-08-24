/* ============================================================
 * 浅奥乐园 · 动画播放器（QIAO_PLAYER / animPlayer）
 * 职责：时间轴驱动、三层渲染（bg/fg/highlight）、字幕讲解同步、
 *       步骤高亮置灰、交互帧调度、静态兜底、结束回调挂奖励。
 * 依赖：anim.js（QIAO_ANIM）、world.js（QIAO_WORLD）、
 *       fun.js（QIAO_FUN.sfx/confetti）、interactions.js（QIAO_INTERACT）
 * 暴露：window.QIAO_PLAYER
 * ============================================================ */
(function () {
  "use strict";

  const VIEWBOX = "0 0 320 200";

  const st = {
    script: null, opts: null, stage: null,
    timers: [], playing: false, paused: false, waiting: false, done: false, skipped: false,
    stepIndex: 0, combo: 0, wrongTries: 0, correctInter: 0, totalInter: 0,
    idleTimer: null, lastInteractAt: 0,
    root: null, stageEl: null, svgEl: null, gBg: null, gFg: null, gHl: null,
    subEl: null, progEl: null, capEl: null, countEl: null, hintEl: null, maskEl: null,
    mascotEl: null, bubbleEl: null
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svgNs() { return "http://www.w3.org/2000/svg"; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------- 工具：整帧 SVG 抽取内层 ---------- */
  function svgInner(fullSvg) {
    const s = String(fullSvg || "");
    const m = s.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return m ? m[1] : s;
  }

  function sfx(name) {
    const F = window.QIAO_FUN;
    if (F && F.sfx && typeof F.sfx[name] === "function") { try { F.sfx[name](); } catch (e) {} }
    else if (F && F.sfx && typeof F.sfx.tap === "function") { try { F.sfx.tap(); } catch (e) {} }
  }

  function confetti(count, big) {
    const F = window.QIAO_FUN;
    if (F && F.confetti) { try { F.confetti(count || 40, !!big); } catch (e) {} }
  }

  /* ---------- 角色气泡 ---------- */
  function charInfo(script) {
    const ch = (script && script.characters && script.characters[0]) || {};
    const charId = ch.id || "chick";
    const W = window.QIAO_WORLD;
    let name = "小算", emoji = "🐤", emotion = null;
    if (W && W.CHARACTERS && W.CHARACTERS[charId]) {
      const c = W.CHARACTERS[charId];
      name = c.name; emoji = c.emoji;
      emotion = c.emotions[ch.emotion] || c.emotions.curious;
    } else if (window.QIAO_ANIM && window.QIAO_ANIM.MASCOT) {
      emoji = window.QIAO_ANIM.MASCOT[charId] || "🐤";
    }
    return { charId, name, emoji, emotion };
  }

  /* ============================================================
   * 构建播放器 UI
   * ============================================================ */
  function buildUI(stage) {
    stage.innerHTML = "";
    const root = el("div", "player-root");
    const stageWrap = el("div", "player-stage");
    stageWrap.innerHTML = `
      <svg class="anim-svg" viewBox="${VIEWBOX}" preserveAspectRatio="xMidYMid meet" xmlns="${svgNs()}">
        <g class="layer-bg"></g>
        <g class="layer-fg"></g>
        <g class="layer-highlight"></g>
      </svg>
      <div class="player-mascot"><span class="pm-emoji"></span><span class="pm-bubble"></span></div>
      <div class="player-timer" style="display:none"></div>
      <div class="player-hintbox" style="display:none"></div>
      <div class="player-mask" style="display:none"></div>`;
    const controls = el("div", "player-controls");
    controls.innerHTML = `
      <button class="player-progressbtn" title="进度">${'<i class="player-progressfill"></i>'}</button>
      <div class="player-btns">
        <button class="player-btn" data-act="pause">⏸</button>
        <button class="player-btn" data-act="skip">跳过 ⏭</button>
      </div>`;
    root.appendChild(stageWrap);
    root.appendChild(el("div", "player-subtitle", ""));
    root.appendChild(controls);
    stage.appendChild(root);

    st.root = root;
    st.stageEl = stageWrap;
    st.svgEl = $("svg", stageWrap);
    st.gBg = $(".layer-bg", stageWrap);
    st.gFg = $(".layer-fg", stageWrap);
    st.gHl = $(".layer-highlight", stageWrap);
    st.mascotEl = $(".player-mascot", stageWrap);
    st.subEl = $(".player-subtitle", root);
    st.progEl = $(".player-progressfill", root);
    st.countEl = $(".player-timer", stageWrap);
    st.hintEl = $(".player-hintbox", stageWrap);
    st.maskEl = $(".player-mask", stageWrap);

    const pauseBtn = $('[data-act="pause"]', root);
    const skipBtn = $('[data-act="skip"]', root);
    if (pauseBtn) pauseBtn.addEventListener("click", () => { if (st.playing) st.paused ? resume() : pause(); });
    if (skipBtn) skipBtn.addEventListener("click", () => skip());
  }

  /* ============================================================
   * 帧渲染管线
   * ============================================================ */
  function renderStep(step, index) {
    if (!st.stageEl || !st.gFg) return;
    // 清场：旧帧淡出由 CSS 过渡完成
    st.gBg.innerHTML = "";
    st.gFg.innerHTML = "";
    st.gHl.innerHTML = "";

    const inner = svgInner(step.svg);
    // 背景层：script.scene.bg 或 step.layer.bg（字符串片段）
    let bgInner = "";
    if (step.layer && typeof step.layer.bg === "string" && step.layer.bg.length > 10) bgInner = step.layer.bg;
    else if (st.script && st.script.scene && st.script.scene.bg) bgInner = st.script.scene.bg;
    if (bgInner) st.gBg.innerHTML = bgInner;

    // 前景层：整帧注入（MVP 最简）
    st.gFg.innerHTML = inner;

    // 高亮层：结论帧/关键元素加 a-spotlight
    applyHighlight(step);

    // 置灰：非 targets 元素加 a-dim
    applyDim(step);

    // 帧内 timeline
    runStepTimeline(step);

    // 字幕/讲解
    const diff = st.opts && st.opts.difficulty;
    let sub = step.subtitle || "", nar = step.narration || "";
    if (diff === "challenge") { sub = ""; nar = ""; }
    else if (diff === "advanced") {
      if (step.subtitleHint) {
        const keep = step.subtitleHint.keep || [];
        sub = Array.from(sub).map(c => keep.includes(c) ? c : "＿").join("");
      } else if (sub.length > 2) {
        sub = sub.slice(0, Math.ceil(sub.length / 2)) + "……";
      }
      if (nar.length > 2) nar = "……" + nar.slice(-4);
    }
    if (st.subEl) {
      st.subEl.innerHTML = sub ? `<b>${sub}</b>` + (nar ? `<span class="player-narration">${nar}</span>` : "") : (nar ? `<span class="player-narration">${nar}</span>` : "&nbsp;");
    }

    // 音效
    if (step.sfx) sfx(step.sfx);

    // 角色表情
    setMascot(step);

    // 进度
    const total = st.script.steps.length;
    if (st.progEl) st.progEl.style.width = Math.round(((index + 1) / total) * 100) + "%";

    // 挑战限时倒计时
    handleCountdown(step, diff);

    if (st.opts && st.opts.onStep) { try { st.opts.onStep(index); } catch (e) {} }
  }

  function applyHighlight(step) {
    const sel = step.layer && step.layer.highlight;
    if (!sel || !st.gFg) return;
    let nodes = [];
    try { nodes = st.gFg.querySelectorAll(sel); } catch (e) { nodes = []; }
    if (!nodes.length && /^#[A-Za-z_][\w-]*$/.test(sel)) {
      const idEl = st.gFg.querySelector(sel);
      if (idEl) nodes = [idEl];
    }
    nodes.forEach(n => n.classList.add("a-spotlight"));
  }

  function applyDim(step) {
    const targets = (step.targets || []).filter(Boolean);
    if (!targets.length || !st.gFg) return;
    const all = st.gFg.querySelectorAll("*");
    all.forEach(n => {
      let hit = false;
      targets.forEach(sel => {
        if (hit) return;
        try { if (n.matches && n.matches(sel)) hit = true; } catch (e) {}
        if (!hit && n.id && sel === "#" + n.id) hit = true;
      });
      if (!hit) n.classList.add("a-dim");
    });
  }

  function runStepTimeline(step) {
    const tl = step.timeline || [];
    tl.forEach(item => {
      const delay = item.delay || 0;
      const t = setTimeout(() => {
        if (!st.gFg) return;
        let n = null;
        try { n = st.gFg.querySelector(item.target); } catch (e) { n = null; }
        if (!n) return;
        const ACTION = {
          "pop-in": "a-pop", "fly-to": "a-pop", "open": "a-pop", "burst": "a-spin", "fade-out": "a-fade"
        };
        const cls = ACTION[item.action] || "a-pop";
        n.classList.remove("a-pop", "a-spin", "a-fade", "a-bob");
        void n.getBoundingClientRect();
        n.classList.add(cls);
      }, delay);
      st.timers.push(t);
    });
  }

  function setMascot(step) {
    const info = charInfo(st.script);
    if (!st.mascotEl) return;
    const emoEl = $(".pm-emoji", st.mascotEl);
    const bubbleEl = $(".pm-bubble", st.mascotEl);
    if (emoEl) emoEl.textContent = info.emoji;
    if (!bubbleEl) return;
    // 按帧动作选表情
    const action = step.action || "transform";
    let key = "explain";
    if (action === "reveal") key = "curious";
    else if (action === "conclude") key = step.celebration ? "celebrate" : "amazed";
    const emotion = info.emotion || {};
    const bubble = emotion.bubble || (key === "curious" ? "？" : "看这里～");
    bubbleEl.textContent = bubble;
    st.mascotEl.classList.remove("a-bob", "a-spin", "a-wob", "a-float");
    void st.mascotEl.getBoundingClientRect();
    st.mascotEl.classList.add(emotion.anim || "a-bob");
  }

  /* ---------- 挑战限时 ---------- */
  function handleCountdown(step, diff) {
    if (!st.countEl) return;
    clearCountdown();
    if (diff !== "challenge") { st.countEl.style.display = "none"; return; }
    st.countEl.style.display = "flex";
    const dur = clamp(step.duration || 2500, 2000, 5000);
    const start = Date.now();
    const tick = () => {
      const left = Math.max(0, dur - (Date.now() - start));
      st.countEl.textContent = "⏱ " + Math.ceil(left / 1000) + "s";
      if (left <= 0) {
        // 超时：若处于交互等待，交由交互引擎超时处理；否则自动切帧
        if (!st.waiting && st.playing && !st.paused) {
          sfx("wrong_buzz");
          advance();
        }
        return;
      }
      st.countdownTimer = setTimeout(tick, 200);
    };
    st.countdownTimer = setTimeout(tick, 200);
  }
  function clearCountdown() {
    if (st.countdownTimer) { clearTimeout(st.countdownTimer); st.countdownTimer = null; }
  }

  /* ============================================================
   * 时间轴驱动
   * ============================================================ */
  function play(script, opts) {
    destroy();
    opts = opts || {};
    if (!script || !script.steps || !script.steps.length) return;
    const stage = opts.stage;
    if (!stage) return;
    st.script = script; st.opts = opts; st.stage = stage;

    // 静态兜底铁律：低动效偏好/staticOnly → renderFallback
    const reduced = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const staticOnly = opts.staticOnly || (window.QIAO_CONFIG && window.QIAO_CONFIG.staticOnly);
    if (staticOnly || reduced) {
      renderFallback(script.fallback || script, stage);
      st.playing = false; st.done = true;
      if (opts.onEnd) { try { opts.onEnd({ stars: 1, combo: 0, wrongTries: 0, skipped: false, fallback: true }); } catch (e) {} }
      return;
    }

    buildUI(stage);
    st.playing = true; st.paused = false; st.waiting = false; st.done = false; st.skipped = false;
    st.stepIndex = 0; st.combo = 0; st.wrongTries = 0; st.correctInter = 0;
    st.totalInter = script.steps.filter(s => s.interaction).length;
    st.lastInteractAt = Date.now();
    startIdleWatch();
    playStep(0);
  }

  function playStep(i) {
    if (st.done || !st.playing) return;
    if (i >= st.script.steps.length) { finish(); return; }
    st.stepIndex = i;
    const step = st.script.steps[i];
    renderStep(step, i);

    // 交互帧：暂停自动推进
    if (step.interaction) {
      enterInteraction(step);
    } else {
      scheduleNext(step);
    }
  }

  function scheduleNext(step) {
    const dur = clamp(step.duration || 2500, 1500, 6000);
    const t = setTimeout(() => {
      if (!st.paused && !st.waiting && !st.done && st.playing) playStep(st.stepIndex + 1);
    }, dur);
    st.timers.push(t);
  }

  /* ---------- 交互帧 ---------- */
  function enterInteraction(step) {
    st.waiting = true;
    if (st.maskEl) {
      st.maskEl.style.display = "block";
      st.maskEl.textContent = "👆 来点一点！";
    }
    const I = window.QIAO_INTERACT;
    if (!I || !I.resolve) {
      // 交互引擎缺失时按正确通过
      st.waiting = false;
      if (st.maskEl) st.maskEl.style.display = "none";
      scheduleNext(step);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        st.waiting = false;
        if (st.maskEl) st.maskEl.style.display = "none";
        sfx("wrong_buzz");
        st.wrongTries++;
        playStep(st.stepIndex + 1);
      }
    }, 8000); // 兜底超时（交互引擎内部有 3 次重试 + 自动演示）
    st.timers.push(timer);

    I.resolve(step, { stage: st.stageEl, player: api, script: st.script })
      .then(res => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        st.waiting = false;
        if (st.maskEl) st.maskEl.style.display = "none";
        if (res && res.correct) {
          st.correctInter++;
          st.combo++;
          if (st.combo >= 3 && window.QIAO_FUNX && window.QIAO_FUNX.comboSession) {
            try { window.QIAO_FUNX.comboSession.bump(); } catch (e) {}
          }
          if (step.interaction && step.interaction.onSuccess && step.interaction.onSuccess.sfx) sfx(step.interaction.onSuccess.sfx);
          else sfx("ok");
        } else {
          st.wrongTries++;
          if (window.QIAO_FUNX && window.QIAO_FUNX.comboSession) { try { window.QIAO_FUNX.comboSession.reset(); } catch (e) {} }
          sfx("wrong_buzz");
        }
        st.lastInteractAt = Date.now();
        playStep(st.stepIndex + 1);
      })
      .catch(() => {
        settled = true;
        clearTimeout(timer);
        st.waiting = false;
        if (st.maskEl) st.maskEl.style.display = "none";
        playStep(st.stepIndex + 1);
      });
  }

  /* ---------- 结束 ---------- */
  function finish() {
    if (st.done) return;
    st.playing = false; st.done = true;
    stopIdleWatch(); clearCountdown();
    const stars = computeStars();
    if (stars > 0) {
      confetti(40, false);
      sfx("levelup");
    }
    if (st.opts && st.opts.onEnd) {
      try { st.opts.onEnd({ stars, combo: st.combo, wrongTries: st.wrongTries, skipped: st.skipped }); } catch (e) {}
    }
    QIAO_EVENTS_emit("anim:end", { unitId: st.script.unitId, stars, combo: st.combo });
  }

  function computeStars() {
    // 看完 = 1；交互全对 = 2；挑战全对 = 3
    if (st.skipped) return 0;
    let s = 1;
    const diff = st.opts && st.opts.difficulty;
    if (st.totalInter > 0 && st.correctInter === st.totalInter) {
      s = diff === "challenge" ? 3 : 2;
    } else if (diff === "challenge" && st.totalInter === 0) {
      s = 2;
    }
    return clamp(s, 0, 3);
  }

  /* ---------- 控制 ---------- */
  function pause() {
    if (!st.playing || st.paused) return;
    st.paused = true;
    clearTimers();
    if (st.countEl) st.countEl.style.display = "none";
    const btn = st.root && $('[data-act="pause"]', st.root);
    if (btn) btn.textContent = "▶";
  }
  function resume() {
    if (!st.paused) return;
    st.paused = false;
    const btn = st.root && $('[data-act="pause"]', st.root);
    if (btn) btn.textContent = "⏸";
    // 从当前帧重新计时
    if (st.script && st.script.steps[st.stepIndex]) {
      const step = st.script.steps[st.stepIndex];
      if (step.interaction && st.waiting) {
        // 交互等待中：恢复倒计时
        const I = window.QIAO_INTERACT;
        if (I && I.resumeTimeout) { try { I.resumeTimeout(st.stepIndex); } catch (e) {} }
        return;
      }
      scheduleNext(step);
    }
  }
  function skip() {
    if (st.done) return;
    st.skipped = true;
    st.playing = false; st.done = true;
    stopIdleWatch(); clearCountdown(); clearTimers();
    if (st.opts && st.opts.onEnd) {
      try { st.opts.onEnd({ stars: 0, combo: st.combo, wrongTries: st.wrongTries, skipped: true }); } catch (e) {}
    }
  }
  function renderFrame(step) { renderStep(step, st.stepIndex); }

  /* ---------- 静态兜底 ---------- */
  function renderFallback(fallback, stage) {
    if (!stage) return;
    const fb = fallback || {};
    const final = fb.staticSvg || "";
    const steps = (fb.steps || []).map((c, i) => `<li><i>${i + 1}</i>${c}</li>`).join("");
    stage.innerHTML = `
      <div class="anim-card anim-static player-fallback">
        <div class="anim-head"><span class="anim-badge">🖼 图示精讲</span><span class="anim-hint">静态模式（低动效偏好）</span></div>
        <div class="anim-stage">${final}</div>
        <div class="anim-steps"><ol>${steps}</ol></div>
      </div>`;
  }

  /* ---------- 清理 ---------- */
  function clearTimers() {
    st.timers.forEach(t => clearTimeout(t));
    st.timers = [];
  }
  function destroy() {
    clearTimers(); clearCountdown(); stopIdleWatch();
    st.playing = false; st.paused = false; st.waiting = false; st.done = true;
    if (st.root && st.root.parentNode) st.root.parentNode.removeChild(st.root);
    st.root = st.stageEl = st.svgEl = st.gBg = st.gFg = st.gHl = null;
    st.subEl = st.progEl = st.countEl = st.mascotEl = st.stage = null;
  }
  function isPlaying() { return st.playing && !st.paused; }

  /* ---------- 无交互 30s 自动暂停 ---------- */
  function startIdleWatch() {
    stopIdleWatch();
    st.idleTimer = setInterval(() => {
      if (!st.playing || st.paused || st.waiting || st.done) return;
      if (Date.now() - st.lastInteractAt > 30000) {
        pause();
        if (window.QIAO_FUN && window.QIAO_FUN.mascot) { try { window.QIAO_FUN.mascot.say("休息一下，要继续吗？", 3000); } catch (e) {} }
      }
    }, 5000);
  }
  function stopIdleWatch() {
    if (st.idleTimer) { clearInterval(st.idleTimer); st.idleTimer = null; }
  }

  function QIAO_EVENTS_emit(name, payload) {
    if (window.QIAO_EVENTS && window.QIAO_EVENTS.emit) { try { window.QIAO_EVENTS.emit(name, payload); } catch (e) {} }
  }

  function advance() {
    if (!st.waiting) playStep(st.stepIndex + 1);
  }

  const api = {
    play, pause, resume, skip, renderFrame, renderFallback, destroy, isPlaying,
    _state: st, _helpers: { sfx, confetti, charInfo, svgInner }
  };
  window.QIAO_PLAYER = api;
  // 兼容命名：设计文档同时使用 animPlayer
  window.animPlayer = api;
})();
