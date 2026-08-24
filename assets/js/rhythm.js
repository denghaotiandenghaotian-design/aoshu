/* ============================================================
 * 浅奥乐园 · 节奏编排引擎（QIAO_RHYTHM）
 * 职责：单单元五步动线（导入/精讲/引导练习/挑战/奖励）、
 *       错题 1/3/7 日间隔复习调度器、首页每日一复数据。
 * 依赖：QIAO_SCRIPTS / QIAO_PLAYER / QIAO_DIFF / QIAO_FUNX / QIAO_STORE
 * 暴露：window.QIAO_RHYTHM
 * ============================================================ */
(function () {
  "use strict";

  const FLOW = [
    { key: "intro",     label: "剧情导入", ratio: 0.06 },
    { key: "explain",   label: "精讲",     ratio: 0.25 },
    { key: "guided",    label: "引导练习", ratio: 0.40 },
    { key: "challenge", label: "挑战",     ratio: 0.20 },
    { key: "reward",    label: "奖励复盘", ratio: 0.09 }
  ];

  const run = {
    unit: null, courseId: "", difficulty: "basic", container: null,
    opts: null, phase: 0, explainStars: 0, guidedOk: 0, guidedTotal: 0,
    challengeOk: 0, challengeTotal: 0, wrongQids: [], startedAt: 0,
    questionIdx: 0, questionList: [], playerStage: null, destroyed: false
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function findUnit(unitId) {
    const cs = window.QIAO_COURSES || [];
    for (const co of cs) {
      const u = (co.units || []).find(x => (co.id + "-" + x.no) === unitId || x.id === unitId);
      if (u) return { co, u };
    }
    return null;
  }

  /* 由题目反查单元（best-effort）：优先匹配 practice 文本，其次专题首单元 */
  function resolveUnitIdForQ(q) {
    if (!q) return null;
    const cs = window.QIAO_COURSES || [];
    // 1) 精确：unit.practice 提到题号（题 N）
    for (const co of cs) {
      if (co.id !== q.cat && co.cat !== q.cat) continue;
      for (const u of co.units || []) {
        const p = u.practice || "";
        const n = (q.id.match(/(\d+)$/) || [])[1];
        if (n && new RegExp("题\\s*" + n + "\\b|题 " + n + "–|题 " + n + "-").test(p)) {
          return co.id + "-" + u.no;
        }
      }
    }
    // 2) 专题首单元
    for (const co of cs) {
      if ((co.id === q.cat || co.cat === q.cat) && co.units && co.units.length) {
        return co.id + "-" + co.units[0].no;
      }
    }
    return null;
  }

  /* 按专题抽取题目（同源过滤，不写 93×3 套） */
  function pickQuestions(courseId, diffLevel, n, exclude) {
    const D = window.QIAO_DATA;
    if (!D || !D.QUESTIONS) return [];
    exclude = exclude || [];
    let pool = D.QUESTIONS.filter(q => q.cat === courseId && !exclude.includes(q.id));
    if (diffLevel) pool = pool.filter(q => q.diff <= diffLevel);
    // 打乱取前 n
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  /* ============================================================
   * runUnit 主入口
   * opts: { courseId, difficulty, review, container, onExit, startAt }
   * ============================================================ */
  function runUnit(unitId, opts) {
    opts = opts || {};
    const found = typeof unitId === "object" && unitId.no != null
      ? (function () {
          const cs = window.QIAO_COURSES || [];
          for (const co of cs) if ((co.units || []).includes(unitId)) return { co, u: unitId };
          return null;
        })()
      : findUnit(unitId);
    if (!found) { toast("单元不存在"); return; }
    const { co, u } = found;
    const container = opts.container || document.getElementById("app");
    if (!container) return;

    destroyRun();
    run.unit = u; run.courseId = co.id; run.difficulty = opts.difficulty || "basic";
    run.container = container; run.opts = opts;
    run.phase = 0; run.wrongQids = []; run.guidedOk = 0; run.guidedTotal = 0;
    run.challengeOk = 0; run.challengeTotal = 0; run.explainStars = 0;
    run.startedAt = Date.now(); run.destroyed = false;

    // 复习模式：直接进 challenge（复习即挑战）
    let startIdx = 0;
    if (opts.review) {
      startIdx = FLOW.findIndex(f => f.key === "challenge");
      if (startIdx < 0) startIdx = 0;
    } else if (opts.startAt) {
      const i = FLOW.findIndex(f => f.key === opts.startAt);
      if (i >= 0) startIdx = i;
    }
    run.phase = startIdx;
    renderPhase();
  }

  function renderPhase() {
    if (run.destroyed) return;
    const c = run.container;
    if (!c) return;
    const phase = FLOW[run.phase];
    if (!phase) { finishReward(); return; }
    c.innerHTML = "";
    c.appendChild(el("div", "run-phase-head", `<span class="run-phase-label">${phase.label}</span>
      <span class="run-phase-prog">${run.phase + 1} / ${FLOW.length}</span>`));
    const body = el("div", "run-phase-body");
    c.appendChild(body);
    run.phaseBody = body;

    switch (phase.key) {
      case "intro": renderIntro(body); break;
      case "explain": renderExplain(body); break;
      case "guided": renderGuided(body); break;
      case "challenge": renderChallenge(body); break;
      case "reward": renderReward(body); break;
      default: finishReward();
    }
  }

  /* ---------- 导入 ---------- */
  function renderIntro(body) {
    const W = window.QIAO_WORLD;
    const topic = W ? W.topicOf(run.unit, run.courseId) : run.courseId;
    const region = W && W.WORLD.regions[topic];
    const charId = W ? W.characterOf(topic) : "chick";
    const ch = W && W.CHARACTERS[charId] ? W.CHARACTERS[charId] : { name: "小算", emoji: "🐤", catchphrase: "加油！" };
    const hook = W ? W.hookFor(run.unit, run.courseId) : (run.unit.storyBeat || "");
    body.innerHTML = `
      <div class="run-intro">
        <div class="run-mascot">${ch.emoji}</div>
        <div class="run-region">${region ? region.name : run.courseId}</div>
        <div class="run-story">${esc(region ? region.story : "")}</div>
        <div class="run-hook">“${esc(hook)}”</div>
        <div class="run-catch">${ch.catchphrase}</div>
        <button class="btn btn-primary run-start">开始冒险 🚀</button>
        <button class="btn btn-ghost run-skip-intro">跳过剧情 →</button>
      </div>`;
    const start = () => { run.phase++; renderPhase(); };
    $(".run-start", body).addEventListener("click", start);
    $(".run-skip-intro", body).addEventListener("click", start);
    // 15s 自动进入（仅当页面仍挂载时）
    run.autoTimer = setTimeout(() => {
      const alive = run.phaseBody === body && !run.destroyed &&
        (body.isConnected !== false) && (run.container.isConnected !== false);
      if (alive) start();
    }, 15000);
  }

  /* ---------- 精讲（基础难度动画） ---------- */
  function renderExplain(body) {
    const stage = el("div", "player-embed");
    body.appendChild(stage);
    run.playerStage = stage;
    const script = window.QIAO_SCRIPTS.get(run.unit, "basic", run.courseId);
    if (!script) { body.appendChild(el("div", "run-error", "该单元暂无动画脚本")); finishReward(); return; }
    window.QIAO_PLAYER.play(script, {
      stage,
      difficulty: "basic",
      onEnd: res => {
        run.explainStars = res && res.stars ? res.stars : 0;
        if (res && res.skipped) { run.explainStars = 0; }
        run.phase++; renderPhase();
      }
    });
  }

  /* ---------- 引导练习（2–4 道引导题） ---------- */
  function renderGuided(body) {
    const list = pickQuestions(run.courseId, 2, 3, run.wrongQids);
    if (!list.length) { run.guidedTotal = 0; run.guidedOk = 0; run.phase++; renderPhase(); return; }
    run.questionList = list; run.questionIdx = 0; run.guidedTotal = list.length;
    renderQuestion(body, list, false, res => {
      if (res) run.guidedOk++;
      run.phase++; renderPhase();
    });
  }

  /* ---------- 挑战（进阶/挑战动画 + 闯关题） ---------- */
  function renderChallenge(body) {
    const diff = run.difficulty === "challenge" ? "challenge" : "advanced";
    const stage = el("div", "player-embed");
    body.appendChild(stage);
    run.playerStage = stage;
    const script = window.QIAO_SCRIPTS.get(run.unit, diff, run.courseId);
    const doAnim = script ? new Promise(resolve => {
      window.QIAO_PLAYER.play(script, {
        stage,
        difficulty: diff,
        onEnd: res => {
          // 挑战全对 → 徽章碎片
          if (diff === "challenge" && res && res.stars >= 3 && window.QIAO_FUNX) {
            try { window.QIAO_FUNX.addShard(run.courseId); } catch (e) {}
          }
          resolve(res);
        }
      });
    }) : Promise.resolve(null);
    doAnim.then(() => {
      const list = pickQuestions(run.courseId, 3, 2, run.wrongQids);
      if (!list.length) { run.challengeTotal = 0; run.challengeOk = 0; run.phase++; renderPhase(); return; }
      run.questionList = list; run.questionIdx = 0; run.challengeTotal = list.length;
      renderQuestion(body, list, true, res => {
        if (res) run.challengeOk++;
        run.phase++; renderPhase();
      });
    });
  }

  /* ---------- 题目渲染（引导/闯关共用） ---------- */
  function renderQuestion(body, list, isChallenge, onDone) {
    const q = list[run.questionIdx];
    if (!q) { onDone(run.questionIdx === run.guidedTotal && !isChallenge ? run.guidedOk === run.guidedTotal : run.challengeOk === run.challengeTotal); return; }
    const c = (window.QIAO_DATA && window.QIAO_DATA.CATEGORIES && window.QIAO_DATA.CATEGORIES[q.cat]) || {};
    const idx = run.questionIdx + 1, total = list.length;
    let optsHtml = "";
    if (q.type === "fill") {
      optsHtml = `<input class="fill-input" id="rq_fill" placeholder="写出答案"/><button class="btn btn-primary" id="rq_sub">提交 ✓</button>`;
    } else {
      optsHtml = (q.options || []).map((o, i) =>
        `<button class="opt rq-opt" data-opt="${esc(o)}">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join("");
    }
    body.innerHTML = `
      <div class="run-question card">
        <div class="rq-prog">${isChallenge ? "🏆 闯关题" : "💪 引导题"} ${idx} / ${total} · ${c.icon || ""}${c.name || ""}</div>
        <div class="rq-stem">${esc(q.stem)}</div>
        <div class="opt-list" id="rq_opts">${optsHtml}</div>
        <div id="rq_fb"></div>
      </div>`;

    const fb = $("#rq_fb", body);
    const next = correct => {
      const F = window.QIAO_FUN;
      if (correct) {
        if (F) { F.sfx.ok(); F.mascot.cheer(); }
        if (window.QIAO_STORE) window.QIAO_STORE.submitAnswer(q, true);
        fb.innerHTML = `<div class="fb-ok">🎉 答对啦！</div><button class="btn btn-primary" id="rq_next" style="width:100%">继续 →</button>`;
      } else {
        if (F) { F.sfx.wrong(); F.mascot.encourage(); }
        if (window.QIAO_STORE) window.QIAO_STORE.submitAnswer(q, false);
        run.wrongQids.push(q.id);
        scheduler.enqueue(run.courseId + "-" + run.unit.no, q.id);
        fb.innerHTML = `<div class="fb-err">再想想～ 正确答案：${esc(q.answer)}</div>
          <div class="explain"><div class="explain-h">💡 解析</div><div class="explain-b">${esc(q.explanation)}</div></div>
          <button class="btn btn-primary" id="rq_next" style="width:100%">下一题 →</button>`;
      }
      $("#rq_next", body).addEventListener("click", () => {
        run.questionIdx++;
        if (run.questionIdx >= list.length) onDone(correct);
        else renderQuestion(body, list, isChallenge, onDone);
      });
    };

    if (q.type === "fill") {
      const sb = $("#rq_sub", body);
      if (sb) sb.addEventListener("click", () => {
        const v = ($("#rq_fill", body) || {}).value || "";
        next(norm(v) === norm(q.answer));
      });
    } else {
      body.querySelectorAll(".rq-opt").forEach(b => b.addEventListener("click", () => {
        body.querySelectorAll(".rq-opt").forEach(x => x.disabled = true);
        next(b.dataset.opt === q.answer);
      }));
    }
  }
  function norm(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, "").toLowerCase(); }

  /* ---------- 奖励复盘 ---------- */
  function renderReward(body) {
    const W = window.QIAO_WORLD;
    const topic = W ? W.topicOf(run.unit, run.courseId) : run.courseId;
    const win = W ? W.winFor(run.unit, run.courseId) : "太棒了！";
    // 星级：看完精讲得 1 基础星（跳过精讲 0 星）+ 引导全对 1 + 闯关全对 1（上限 3）
    let stars = run.explainStars >= 1 ? 1 : 0;
    if (run.guidedTotal && run.guidedOk === run.guidedTotal) stars++;
    if (run.challengeTotal && run.challengeOk === run.challengeTotal) stars++;
    stars = Math.min(3, stars);
    let award = null;
    if (window.QIAO_FUNX) {
      award = window.QIAO_FUNX.awardLessonStars(run.courseId + "-" + run.unit.no, stars, { difficulty: run.difficulty });
    }
    // 复习模式：推进复习队列
    if (run.opts.review) {
      scheduler.advance(run.courseId + "-" + run.unit.no);
    }
    body.innerHTML = `
      <div class="run-reward">
        <div class="rr-emoji">${award && award.levelUp ? "👑" : stars === 3 ? "🏆" : "⭐"}</div>
        <div class="rr-title">单元完成！</div>
        <div class="rr-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <div class="rr-win">${esc(win)}</div>
        ${award && award.levelUp ? `<div class="rr-level">🎊 升级啦！</div>` : ""}
        ${run.wrongQids.length ? `<div class="rr-wrong">已把 ${run.wrongQids.length} 道错题加入复习队列（明天来巩固～）</div>` : ""}
        <button class="btn btn-primary run-finish" style="width:100%">完成，返回课程 →</button>
      </div>`;
    $(".run-finish", body).addEventListener("click", () => {
      if (typeof run.opts.onExit === "function") { run.opts.onExit(run.courseId); }
      else if (window.QIAO_ROUTER) { window.QIAO_ROUTER.go("/course/" + run.courseId); }
    });
    if (window.QIAO_FUN) { try { window.QIAO_FUN.confetti(60, stars === 3); } catch (e) {} }
    // 连续学习提示
    runSessionCount();
  }

  function runSessionCount() {
    run.sessionCount = (run.sessionCount || 0) + 1;
    if (run.sessionCount >= 3) {
      setTimeout(() => toast("连续学了 3 个单元啦，喝口水，休息一下吧 💧"), 600);
      run.sessionCount = 0;
    }
  }

  function finishReward() {
    if (run.destroyed) return;
    if (run.container) {
      run.container.innerHTML = "";
      run.container.appendChild(el("div", "run-reward",
        `<div class="rr-title">🎉 完成！</div>
         <button class="btn btn-primary run-finish" style="width:100%">返回课程 →</button>`));
      const b = $(".run-finish", run.container);
      if (b) b.addEventListener("click", () => {
        if (typeof run.opts.onExit === "function") run.opts.onExit(run.courseId);
        else if (window.QIAO_ROUTER) window.QIAO_ROUTER.go("/course/" + run.courseId);
      });
    }
  }

  function pause() {
    if (window.QIAO_PLAYER) window.QIAO_PLAYER.pause();
  }
  function resume() {
    if (window.QIAO_PLAYER) window.QIAO_PLAYER.resume();
  }
  function nextPhase() {
    if (run.phase < FLOW.length - 1) { run.phase++; renderPhase(); }
  }
  function destroyRun() {
    run.destroyed = true;
    if (run.autoTimer) clearTimeout(run.autoTimer);
    if (window.QIAO_PLAYER) { try { window.QIAO_PLAYER.destroy(); } catch (e) {} }
  }

  /* ============================================================
   * 错题间隔复习调度器（1/3/7 日）
   * ============================================================ */
  const scheduler = {
    enqueue(unitId, qid) {
      const S = window.QIAO_STORE;
      if (!S || !S.user) return;
      const u = S.user;
      if (!u.reviewQueue) u.reviewQueue = [];
      const today = new Date();
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const dueAt = tomorrow.toISOString().slice(0, 10);
      const lastWrongAt = today.toISOString().slice(0, 10);
      const exist = u.reviewQueue.find(x => x.unitId === unitId && x.qid === qid);
      if (exist) {
        exist.lastWrongAt = lastWrongAt;
        // 重复入队仅更新 lastWrongAt（不重置 stage）
      } else {
        u.reviewQueue.push({ unitId, qid, lastWrongAt, dueAt, stage: 1 });
      }
      // 上限 200 条，超出按 dueAt 淘汰
      if (u.reviewQueue.length > 200) {
        u.reviewQueue.sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
        u.reviewQueue = u.reviewQueue.slice(0, 200);
      }
      S.save(u);
    },

    dueToday() {
      const S = window.QIAO_STORE;
      if (!S || !S.user || !S.user.reviewQueue) return [];
      const today = new Date().toISOString().slice(0, 10);
      return S.user.reviewQueue.filter(x => x.dueAt <= today);
    },

    advance(unitId) {
      const S = window.QIAO_STORE;
      if (!S || !S.user || !S.user.reviewQueue) return;
      const u = S.user;
      const today = new Date();
      const keep = [];
      u.reviewQueue.forEach(it => {
        if (it.unitId !== unitId) { keep.push(it); return; }
        const nd = new Date(today);
        if (it.stage === 1) { it.stage = 2; nd.setDate(nd.getDate() + 3); }
        else if (it.stage === 2) { it.stage = 3; nd.setDate(nd.getDate() + 7); }
        else {
          // stage=3 复习完成 → 移出队列（不自动删 wrong，保留错题本手动作业）
          return;
        }
        it.dueAt = nd.toISOString().slice(0, 10);
        keep.push(it);
      });
      u.reviewQueue = keep;
      S.save(u);
    },

    remove(unitId, qid) {
      const S = window.QIAO_STORE;
      if (!S || !S.user || !S.user.reviewQueue) return;
      S.user.reviewQueue = S.user.reviewQueue.filter(x => !(x.unitId === unitId && (!qid || x.qid === qid)));
      S.save(S.user);
    },

    weeklyReview() {
      const S = window.QIAO_STORE;
      if (!S || !S.user || !S.user.reviewQueue) return [];
      return S.user.reviewQueue.filter(x => x.stage >= 2);
    }
  };

  window.QIAO_RHYTHM = {
    FLOW, runUnit, nextPhase, pause, resume, scheduler, findUnit, resolveUnitIdForQ,
    _run: run
  };
})();
