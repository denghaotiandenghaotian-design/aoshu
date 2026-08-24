/* ============================================================
 * 浅奥乐园 · 难度过滤引擎（QIAO_DIFF）
 * 职责：三档难度同源生成（避免 93×3 套内容）、单元解锁判定、
 *       完成记录写入 unitProgress（与 QIAO_STORE 解耦读取）。
 * 依赖：store.js（QIAO_STORE）
 * 暴露：window.QIAO_DIFF
 * ============================================================ */
(function () {
  "use strict";

  const DIFF = { basic: "basic", advanced: "advanced", challenge: "challenge" };
  const ORDER = ["basic", "advanced", "challenge"];

  /* 每档允许的交互类型 */
  const ALLOWED_TYPE = {
    basic: ["tap"],
    advanced: ["tap", "click", "fill"],
    challenge: ["tap", "click", "drag", "sort", "fill"]
  };

  /* ---------- 深拷贝工具 ---------- */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ============================================================
   * filter(script, level)：同源过滤
   * ============================================================ */
  function filter(script, level) {
    if (!script) return script;
    const lv = ORDER.includes(level) ? level : DIFF.basic;
    if (lv === DIFF.basic) {
      // 基础：字幕全开、讲解全开、仅 tap 交互（difficulty 含 basic）
      const out = clone(script);
      out.difficulty = DIFF.basic;
      out.steps = (script.steps || []).map((s, i) => {
        const st = clone(s);
        if (st.interaction) {
          const diffOk = (st.interaction.difficulty || []).includes(DIFF.basic);
          const typeOk = ALLOWED_TYPE.basic.includes(st.interaction.type);
          if (!diffOk || !typeOk) st.interaction = null;
          else st.interaction.maxTries = st.interaction.maxTries || 3;
        }
        st.duration = clampDur(s.duration, i === (script.steps.length - 1));
        return st;
      });
      out.timeline = recomputeTimeline(out);
      return out;
    }

    if (lv === DIFF.advanced) {
      const out = clone(script);
      out.difficulty = DIFF.advanced;
      out.steps = (script.steps || []).map((s, i) => {
        const st = clone(s);
        if (st.interaction) {
          const diffOk = (st.interaction.difficulty || []).includes(DIFF.advanced);
          const typeOk = ALLOWED_TYPE.advanced.includes(st.interaction.type);
          if (!diffOk || !typeOk) st.interaction = null;
          else st.interaction.maxTries = st.interaction.maxTries || 3;
        }
        // 非关键帧加速（仅当脚本显式标注 key 时生效）
        if (s.key === false) st.duration = Math.round(clampDur(s.duration, false) * 0.7);
        else st.duration = clampDur(s.duration, i === (script.steps.length - 1));
        return st;
      });
      out.timeline = recomputeTimeline(out);
      return out;
    }

    // challenge
    const out = clone(script);
    out.difficulty = DIFF.challenge;
    let steps = (script.steps || []).map((s, i) => {
      const st = clone(s);
      if (st.interaction) {
        const diffOk = (st.interaction.difficulty || []).includes(DIFF.challenge);
        const typeOk = ALLOWED_TYPE.challenge.includes(st.interaction.type);
        if (!diffOk || !typeOk) st.interaction = null;
        else st.interaction.maxTries = st.interaction.maxTries || 3;
      }
      st.duration = clampDur(s.duration, i === (script.steps.length - 1));
      return st;
    });
    // 挑战可打乱：脚本级 challenge.sort
    if (script.challenge && script.challenge.sort && steps.length >= 3) {
      const original = steps.map((s, i) => ({ i, sub: s.subtitle || ("第" + (i + 1) + "步") }));
      let shuffled = original.slice().sort(() => Math.random() - 0.5);
      // 确保打乱非恒等：若恰好原序则交换前两项，保证排序挑战有意义、初始序不恒判对
      if (shuffled.length > 1 && shuffled.every((o, idx) => o.i === idx)) {
        const t = shuffled[0]; shuffled[0] = shuffled[1]; shuffled[1] = t;
      }
      // 首帧注入 sort 交互：让儿童把打乱的步骤按原序重排
      const sortItems = shuffled.map(o => original[o.i].sub);
      // correctOrder[p] = 第 p 个位置应放的 sortItems 下标（即原第 p 步的字幕在 sortItems 中的位置）
      // 这样 interactions 中 cur[pos] 与 correctOrder 逐位相等 = 已排回原序
      const correctOrder = original.map(o => sortItems.indexOf(o.sub));
      const sortStep = clone(steps[0]);
      sortStep.interaction = {
        type: "sort",
        target: null,
        prompt: "把解题步骤按正确顺序排好！",
        maxTries: 3,
        difficulty: ["challenge"],
        correct: [],
        sortItems,
        correctOrder,
        wrongTaunt: "顺序不对，再想想先做哪一步～"
      };
      sortStep.action = "reveal";
      steps = [sortStep].concat(steps);
    }
    out.steps = steps;
    out.timeline = recomputeTimeline(out);
    return out;
  }

  function clampDur(d, last) {
    const base = d == null ? 2500 : d;
    return Math.max(1500, Math.min(6000, base));
  }

  function recomputeTimeline(script) {
    const total = (script.steps || []).reduce((a, s) => a + (s.duration || 0), 0);
    return { mode: "auto", totalDurationMs: total };
  }

  /* ============================================================
   * 解锁判定 + 完成记录
   * ============================================================ */
  function progressOf(unitId) {
    const S = window.QIAO_STORE;
    if (!S) return null;
    const user = S.ensure ? S.ensure() : S.user;
    if (!user) return null;
    if (!user.unitProgress) user.unitProgress = {};
    if (!user.unitProgress[unitId]) {
      user.unitProgress[unitId] = {
        basicDone: false, advancedDone: false, challengeDone: false,
        basicStars: 0, advancedStars: 0, challengeStars: 0, best: 0
      };
    }
    return user.unitProgress[unitId];
  }

  function canUnlock(unitId, level) {
    if (level === DIFF.basic) return true;
    const p = progressOf(unitId);
    if (!p) return level === DIFF.basic;
    if (level === DIFF.advanced) return p.basicDone;
    if (level === DIFF.challenge) return p.advancedDone;
    return true;
  }

  /* 完成记录：stars 由播放器 onEnd 传入（0-3） */
  function recordComplete(unitId, level, stars) {
    const p = progressOf(unitId);
    const lv = ORDER.includes(level) ? level : DIFF.basic;
    stars = Math.max(0, Math.min(3, stars || 0));
    p[lv + "Stars"] = Math.max(p[lv + "Stars"] || 0, stars);
    p.best = Math.max(p.best || 0, stars);
    if (lv === DIFF.basic && stars >= 1) p.basicDone = true;
    if (lv === DIFF.advanced && stars >= 2) p.advancedDone = true;
    if (lv === DIFF.challenge && stars >= 3) p.challengeDone = true;
    // 解锁链单调：完成进阶/挑战隐含基础已完成；完成挑战隐含进阶已完成
    if (lv === DIFF.advanced || lv === DIFF.challenge) p.basicDone = true;
    if (lv === DIFF.challenge) p.advancedDone = true;
    const S = window.QIAO_STORE;
    if (S && S.save) { try { S.save(S.user); } catch (e) {} }
    return p;
  }

  /* 难度按钮态：返回 {unlocked, label} */
  function tabInfo(unitId, level) {
    return {
      level,
      unlocked: canUnlock(unitId, level),
      label: level === DIFF.basic ? "基础" : level === DIFF.advanced ? "进阶" : "挑战"
    };
  }

  window.QIAO_DIFF = {
    DIFF, ORDER, filter, canUnlock, recordComplete, tabInfo, progressOf
  };
})();
