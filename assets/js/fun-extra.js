/* ============================================================
 * 浅奥乐园 · 奖励扩展（QIAO_FUNX）
 * 职责：课时星结算、动画内连击会话、徽章碎片合成、皮肤解锁、
 *       可选 TTS。全部复用 QIAO_STORE / QIAO_FUN，向后兼容。
 * 依赖：store.js（QIAO_STORE）、fun.js（QIAO_FUN）、difficulty.js（QIAO_DIFF）
 * 暴露：window.QIAO_FUNX
 * ============================================================ */
(function () {
  "use strict";

  function S() { return window.QIAO_STORE; }
  function F() { return window.QIAO_FUN; }

  /* ---------- 课时星结算 ---------- */
  function awardLessonStars(unitId, stars, opts) {
    opts = opts || {};
    const store = S();
    if (!store) return { delta: 0, newStars: 0, levelUp: false };
    const u = store.ensure ? store.ensure() : store.user;
    stars = Math.max(0, Math.min(3, stars || 0));
    if (!u.courseStars) u.courseStars = {};
    const cur = u.courseStars[unitId] || { basic: 0, advanced: 0, challenge: 0, best: 0 };
    const best = Math.max(cur.best || 0, stars);
    const delta = best - (cur.best || 0);
    cur.best = best;
    u.courseStars[unitId] = cur;

    // 难度分档记录（若传入 difficulty）
    if (opts.difficulty) {
      cur[opts.difficulty] = Math.max(cur[opts.difficulty] || 0, stars);
    }
    // 解锁进度同步
    if (window.QIAO_DIFF && window.QIAO_DIFF.recordComplete) {
      try { window.QIAO_DIFF.recordComplete(unitId, opts.difficulty || "basic", stars); } catch (e) {}
    }

    // 星星增量计入 totalStars + 等级晋升
    let levelUp = false;
    if (delta > 0) {
      const oldLevel = u.level;
      store.award(delta);
      levelUp = u.level !== oldLevel;
    }

    // 撒花 + 音效
    const fun = F();
    if (fun) {
      if (levelUp) { try { fun.confetti(90, true); fun.sfx.levelup(); fun.mascot.celebrate(); } catch (e) {} }
      else if (stars > 0) { try { fun.confetti(40, false); fun.sfx.star(); } catch (e) {} }
    }
    return { delta, newStars: best, levelUp };
  }

  /* ---------- 动画内连击会话（独立于答题连击） ---------- */
  const comboSession = {
    count: 0,
    bump() {
      this.count++;
      let bonus = 0;
      if (this.count === 3 || this.count === 6 || this.count === 10 ||
          (this.count > 10 && this.count % 5 === 0)) bonus = 1;
      if (bonus) {
        const store = S();
        if (store) { try { store.award(bonus); } catch (e) {} }
        const fun = F();
        if (fun && fun.sfx) { try { fun.sfx.star(); } catch (e) {} }
      }
      if (window.QIAO_EVENTS) { try { window.QIAO_EVENTS.emit("interact:correct", { count: this.count, bonus }); } catch (e) {} }
      return { count: this.count, bonus };
    },
    reset() { this.count = 0; },
    get value() { return this.count; }
  };

  /* ---------- 徽章碎片 ---------- */
  function addShard(topicId) {
    const store = S();
    if (!store || !store.user) return { shards: 0, composed: false };
    const u = store.user;
    if (!u.badgeShards) u.badgeShards = {};
    const next = (u.badgeShards[topicId] || 0) + 1;
    u.badgeShards[topicId] = next;
    let composed = false;
    if (next >= 3) {
      u.badgeShards[topicId] = 0;
      composed = composeBadge(topicId);
    }
    store.save(u);
    return { shards: next, composed };
  }

  function topicBadgeDef(topicId) {
    const W = window.QIAO_WORLD;
    const region = W && W.WORLD && W.WORLD.regions[topicId];
    const names = {
      calc: "计算小能手·课时", geo: "图形大师·课时", logic: "逻辑高手·课时",
      word: "应用达人·课时", nt: "数论博士·课时", travel: "行程冠军·课时",
      comb: "计数达人·课时", think: "思考之星·课时"
    };
    const icons = { calc: "🔢", geo: "📐", logic: "🧩", word: "📝", nt: "🧮", travel: "🐢", comb: "🐧", think: "🦉" };
    return {
      id: "b_topic_" + topicId,
      name: names[topicId] || (region ? region.name + "·课时" : topicId),
      icon: icons[topicId] || (region && region.mascotId ? (W.CHARACTERS[region.mascotId] || {}).emoji || "🏅" : "🏅"),
      cond: "挑战难度全对 3 次，集齐 3 枚碎片"
    };
  }

  function composeBadge(topicId) {
    const store = S();
    if (!store || !store.user) return false;
    const u = store.user;
    const def = topicBadgeDef(topicId);
    // 注册进 D.BADGES（成就页可见），幂等
    const D = window.QIAO_DATA;
    if (D && D.BADGES && !D.BADGES.some(b => b.id === def.id)) {
      D.BADGES.push(def);
    }
    if (!u.badges.includes(def.id)) {
      u.badges.push(def.id);
      store.save(u);
      const fun = F();
      if (fun) { try { fun.confetti(70, true); fun.sfx.levelup(); fun.mascot.celebrate(); } catch (e) {} }
      if (window.QIAO_EVENTS) { try { window.QIAO_EVENTS.emit("lesson:reward", { type: "badge", badge: def }); } catch (e) {} }
      return true;
    }
    return false;
  }

  /* ---------- 皮肤解锁（P2，星星兑换） ---------- */
  const SKIN_COST = { "hat-red": 20, "scarf-blue": 30, "cape-gold": 50, "glasses": 25 };
  function unlockSkin(skinId) {
    const store = S();
    if (!store || !store.user) return { ok: false, reason: "no-store" };
    const u = store.user;
    const cost = SKIN_COST[skinId] == null ? 20 : SKIN_COST[skinId];
    if (u.skins && u.skins.includes(skinId)) return { ok: false, reason: "owned" };
    if (u.totalStars < cost) return { ok: false, reason: "stars", need: cost - u.totalStars };
    store.award(-cost);
    u.skins = u.skins || [];
    u.skins.push(skinId);
    store.save(u);
    const fun = F();
    if (fun) { try { fun.sfx.levelup(); } catch (e) {} }
    return { ok: true, cost };
  }
  function ownedSkins() { return (S() && S().user && S().user.skins) || []; }

  /* ---------- TTS（P2，默认静音/可选） ---------- */
  let ttsEnabled = false;
  function setTts(v) { ttsEnabled = !!v; }
  function tts(text, tone) {
    if (!ttsEnabled) return;
    try {
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(String(text || ""));
      u.lang = "zh-CN";
      u.rate = 1.1;
      if (tone === "cheer") u.pitch = 1.2;
      else if (tone === "tease") u.pitch = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  window.QIAO_FUNX = {
    awardLessonStars, comboSession, addShard, composeBadge,
    unlockSkin, ownedSkins, tts, setTts, topicBadgeDef
  };
})();
