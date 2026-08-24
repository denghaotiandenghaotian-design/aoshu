/* ============================================================
 * 浅奥乐园 · 轻交互引擎（QIAO_INTERACT）
 * 职责：动画帧内交互 tap/click/drag/sort/fill 通用实现；
 *       hit-area viewBox→屏幕坐标换算；低龄自动降级；
 *       失败 maxTries 后自动演示（不卡死）。
 * 依赖：fun.js（QIAO_FUN.sfx）、world.js（QIAO_WORLD.randomTaunt）
 * 暴露：window.QIAO_INTERACT
 * ============================================================ */
(function () {
  "use strict";

  const handlers = {};
  let simpleMode = false;

  /* 低龄（<8 岁）自动降级：drag→tap、sort→点选交换 */
  function setSimpleMode(v) {
    simpleMode = !!v;
  }
  function isSimple() {
    if (simpleMode) return true;
    const S = window.QIAO_STORE;
    if (S && S.user && S.user.age && S.user.age < 8) return true;
    return false;
  }

  function register(type, handler) { handlers[type] = handler; }

  function sfx(name) {
    const F = window.QIAO_FUN;
    if (F && F.sfx && F.sfx[name]) { try { F.sfx[name](); } catch (e) {} }
  }
  function taunt(ctx, inter) {
    let msg = (inter && inter.wrongTaunt) || "再想想～";
    const W = window.QIAO_WORLD;
    if (W && ctx && ctx.script && ctx.script.characters && ctx.script.characters[0]) {
      msg = W.randomTaunt(ctx.script.characters[0].id);
    }
    const F = window.QIAO_FUN;
    if (F && F.mascot) { try { F.mascot.say(msg, 1600); } catch (e) {} }
    // 帧内气泡
    const stage = ctx && ctx.stage;
    if (stage) showFrameTaunt(stage, msg);
  }

  let tauntTimer = null;
  function showFrameTaunt(stage, msg) {
    let b = stage.querySelector(".inter-taunt");
    if (!b) {
      b = document.createElement("div");
      b.className = "inter-taunt";
      stage.appendChild(b);
    }
    b.textContent = msg;
    b.classList.add("show");
    if (tauntTimer) clearTimeout(tauntTimer);
    tauntTimer = setTimeout(() => b.classList.remove("show"), 1500);
  }

  /* hit-area viewBox → 屏幕坐标 */
  function hitRect(inter, stage) {
    const h = inter.hitArea;
    if (!h || !stage) return null;
    const r = stage.getBoundingClientRect();
    const sx = r.width / 320, sy = r.height / 200;
    if (h.shape === "circle") {
      return { shape: "circle", cx: r.left + h.x * sx, cy: r.top + h.y * sy, r: h.r * sx };
    }
    return { shape: "rect", x: r.left + h.x * sx, y: r.top + h.y * sy, w: h.w * sx, h: h.h * sy };
  }
  function pointInRect(px, py, rc) {
    return px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h;
  }
  function pointInCircle(px, py, cc) {
    const dx = px - cc.cx, dy = py - cc.cy;
    return dx * dx + dy * dy <= cc.r * cc.r;
  }
  function pointIn(px, py, area) {
    if (!area) return false;
    return area.shape === "circle" ? pointInCircle(px, py, area) : pointInRect(px, py, area);
  }

  /* 命中判定：target 元素 or hitArea */
  function matches(inter, stage, px, py) {
    // 元素命中
    const target = inter.target;
    if (target) {
      let els = [];
      try { els = stage.querySelectorAll(target); } catch (e) { els = []; }
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return true;
      }
    }
    // hitArea 命中
    if (inter.hitArea) {
      const area = hitRect(inter, stage);
      if (pointIn(px, py, area)) return true;
    }
    return false;
  }

  function correctSet(inter) {
    return (inter.correct || []).length ? inter.correct : null;
  }

  /* ============================================================
   * 通用 resolve：返回 Promise<{correct, tries, skipped}>
   * 内部循环重试，maxTries 用尽自动演示正确（不卡死）
   * ============================================================ */
  function resolve(step, ctx) {
    return new Promise(resolvePromise => {
      ctx = ctx || {};
      const inter = step.interaction || {};
      let type = inter.type || "tap";
      if (isSimple() && (type === "drag" || type === "sort")) {
        type = type === "drag" ? "tap" : "click";
      }
      const h = handlers[type] || handlers.tap;
      let settled = false;
      const done = res => {
        if (settled) return;
        settled = true;
        cleanup(ctx);
        resolvePromise(res || { correct: false, tries: 0, skipped: true });
      };
      h(step, ctx, done);
      // 兜底超时（若 handler 未完成）
      setTimeout(() => done({ correct: false, tries: 0, skipped: true }), 15000);
    });
  }

  function cleanup(ctx) {
    const stage = ctx && ctx.stage;
    if (!stage) return;
    const els = stage.querySelectorAll(".inter-overlay, .inter-taunt, .inter-prompt, .inter-sort");
    els.forEach(e => e.remove());
    const svg = stage.querySelector("svg");
    if (svg) svg.style.pointerEvents = "";
  }

  function prompt(ctx, inter, msg) {
    const stage = ctx && ctx.stage;
    if (!stage) return;
    let p = stage.querySelector(".inter-prompt");
    if (!p) {
      p = document.createElement("div");
      p.className = "inter-prompt";
      stage.appendChild(p);
    }
    p.textContent = msg || inter.prompt || "点一点！";
    p.classList.add("show");
  }

  /* ---------- tap ---------- */
  register("tap", (step, ctx, done) => {
    const inter = step.interaction || {};
    const stage = ctx.stage;
    if (!stage) { done({ correct: true, tries: 0 }); return; }
    let tries = inter.maxTries || 3;
    prompt(ctx, inter);

    const onClick = e => {
      const px = e.clientX, py = e.clientY;
      const hit = matches(inter, stage, px, py);
      if (hit) {
        sfx("pop");
        if (inter.onSuccess && inter.onSuccess.sfx) sfx(inter.onSuccess.sfx);
        done({ correct: true, tries });
        return;
      }
      tries--;
      sfx("wrong_buzz");
      taunt(ctx, inter);
      if (tries <= 0) {
        autoDemo(ctx, inter, () => done({ correct: false, tries: 0 }));
        return;
      }
      prompt(ctx, inter, inter.hint && tries <= 1 ? inter.hint : inter.prompt);
    };
    ctx._tapHandler = onClick;
    stage.addEventListener("pointerdown", onClick);
  });

  /* ---------- click（二次确认） ---------- */
  register("click", (step, ctx, done) => {
    const inter = step.interaction || {};
    const stage = ctx.stage;
    if (!stage) { done({ correct: true, tries: 0 }); return; }
    let tries = inter.maxTries || 3;
    let selected = null;
    prompt(ctx, inter);

    const onDown = e => {
      const px = e.clientX, py = e.clientY;
      if (matches(inter, stage, px, py)) {
        selected = true;
        // 二次确认
        const p = stage.querySelector(".inter-prompt");
        if (p) p.textContent = "就这个？再点一次确认 ✓";
        sfx("tap");
      } else {
        tries--;
        sfx("wrong_buzz");
        taunt(ctx, inter);
        if (tries <= 0) { autoDemo(ctx, inter, () => done({ correct: false, tries: 0 })); }
      }
    };
    const onConfirm = e => {
      if (!selected) return;
      const px = e.clientX, py = e.clientY;
      if (matches(inter, stage, px, py)) {
        sfx("ok");
        done({ correct: true, tries });
      } else {
        selected = null;
        prompt(ctx, inter);
      }
    };
    ctx._tapHandler = onDown;
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onConfirm);
  });

  /* ---------- drag（拖拽；低龄降级为 tap） ---------- */
  register("drag", (step, ctx, done) => {
    const inter = step.interaction || {};
    const stage = ctx.stage;
    if (!stage) { done({ correct: true, tries: 0 }); return; }
    let tries = inter.maxTries || 3;
    prompt(ctx, inter);
    let ghost = null, dragging = false;

    const onDown = e => {
      const px = e.clientX, py = e.clientY;
      if (!matches(inter, stage, px, py)) {
        tries--;
        sfx("wrong_buzz");
        taunt(ctx, inter);
        if (tries <= 0) { autoDemo(ctx, inter, () => done({ correct: false, tries: 0 })); }
        return;
      }
      dragging = true;
      ghost = document.createElement("div");
      ghost.className = "inter-ghost";
      ghost.textContent = "✋";
      document.body.appendChild(ghost);
      moveGhost(px, py);
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    };
    const onMove = e => { if (dragging && ghost) moveGhost(e.clientX, e.clientY); };
    const onUp = e => {
      if (!dragging) return;
      dragging = false;
      if (ghost) { ghost.remove(); ghost = null; }
      // 落点判断：命中 hitArea 或 dropZone 选择器
      const px = e.clientX, py = e.clientY;
      let inDrop = false;
      if (inter.dropZone) {
        let z = [];
        try { z = stage.querySelectorAll(inter.dropZone); } catch (err) { z = []; }
        for (const el of z) {
          const r = el.getBoundingClientRect();
          if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) { inDrop = true; break; }
        }
      }
      if (inDrop || (inter.hitArea && pointIn(px, py, hitRect(inter, stage)))) {
        sfx("ok");
        done({ correct: true, tries });
      } else {
        tries--;
        sfx("wrong_buzz");
        taunt(ctx, inter);
        if (tries <= 0) { autoDemo(ctx, inter, () => done({ correct: false, tries: 0 })); }
      }
    };
    function moveGhost(x, y) { if (ghost) { ghost.style.left = x + "px"; ghost.style.top = y + "px"; } }
    ctx._tapHandler = onDown;
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
  });

  /* ---------- sort（排序；低龄点选交换） ---------- */
  register("sort", (step, ctx, done) => {
    const inter = step.interaction || {};
    const stage = ctx.stage;
    if (!stage) { done({ correct: true, tries: 0 }); return; }
    let tries = inter.maxTries || 3;
    const items = (inter.sortItems || []).slice();
    const correctOrder = (inter.correctOrder || items.map((_, i) => i)).slice();
    const cur = items.map((_, i) => i);
    prompt(ctx, inter, inter.prompt || "把步骤排成正确顺序！");

    function render() {
      cleanupSortUI(stage);
      const box = document.createElement("div");
      box.className = "inter-sort";
      const list = cur.map((idx, pos) => {
        return `<div class="inter-sort-item" data-pos="${pos}"><span class="iso-n">${pos + 1}</span>${items[idx]}</div>`;
      }).join("");
      box.innerHTML = `<div class="inter-sort-list">${list}</div>
        <button class="inter-sort-ok">排好了 ✓</button>`;
      stage.appendChild(box);
      // 点选交换
      const sel = [];
      box.querySelectorAll(".inter-sort-item").forEach(it => {
        it.addEventListener("click", () => {
          const pos = +it.dataset.pos;
          if (sel.length === 0) {
            sel.push(pos);
            it.classList.add("sel");
          } else {
            const a = sel[0];
            const b = pos;
            const t = cur[a]; cur[a] = cur[b]; cur[b] = t;
            render();
            sel.length = 0;
          }
        });
      });
      box.querySelector(".inter-sort-ok").addEventListener("click", () => {
        const ok = cur.every((v, i) => v === correctOrder[i]);
        if (ok) {
          sfx("fanfare");
          done({ correct: true, tries });
        } else {
          tries--;
          sfx("wrong_buzz");
          taunt(ctx, inter);
          if (tries <= 0) { autoDemo(ctx, inter, () => done({ correct: false, tries: 0 })); }
          else render();
        }
      });
    }
    function cleanupSortUI(stage) {
      const old = stage.querySelector(".inter-sort");
      if (old) old.remove();
    }
    render();
  });

  /* ---------- fill（填空式字幕） ---------- */
  register("fill", (step, ctx, done) => {
    const inter = step.interaction || {};
    const stage = ctx.stage;
    if (!stage) { done({ correct: true, tries: 0 }); return; }
    let tries = inter.maxTries || 3;
    const options = inter.options || ["✓"];
    prompt(ctx, inter, inter.prompt || "选一个词填进空里！");

    const box = document.createElement("div");
    box.className = "inter-fill";
    box.innerHTML = options.map((o, i) =>
      `<button class="inter-fill-chip" data-i="${i}">${o}</button>`).join("");
    stage.appendChild(box);
    box.querySelectorAll(".inter-fill-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const val = chip.dataset.i;
        const correct = inter.correct && inter.correct.includes(val);
        if (correct) {
          sfx("ok");
          done({ correct: true, tries });
        } else {
          tries--;
          sfx("wrong_buzz");
          taunt(ctx, inter);
          if (tries <= 0) { autoDemo(ctx, inter, () => done({ correct: false, tries: 0 })); }
        }
      });
    });
  });

  /* ---------- 自动演示正确（不卡死） ---------- */
  function autoDemo(ctx, inter, cb) {
    const stage = ctx && ctx.stage;
    if (stage) {
      let d = stage.querySelector(".inter-autodemo");
      if (!d) {
        d = document.createElement("div");
        d.className = "inter-autodemo";
        stage.appendChild(d);
      }
      d.textContent = "✨ 看，正确做法是" + ((inter && inter.hint) || "这样") + "！";
      d.classList.add("show");
      setTimeout(() => d.classList.remove("show"), 1800);
    }
    sfx("boing");
    setTimeout(cb, 1200);
  }

  window.QIAO_INTERACT = {
    resolve, register, setSimpleMode, isSimple,
    _helpers: { hitRect, pointIn, matches, taunt }
  };
})();
