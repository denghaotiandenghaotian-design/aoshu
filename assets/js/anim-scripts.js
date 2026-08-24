/* ============================================================
 * 浅奥乐园 · 动画脚本数据层（QIAO_SCRIPTS）
 * 职责：
 *   1. scriptify() 迁移器：把 anim.js 91 模板的 {frames,captions}
 *      零重写升级为结构化动画脚本（基础难度全量）
 *   2. ANIM_SCRIPTS 注册表：8 个代表单元专属脚本（含剧情/角色/交互）
 *   3. QIAO_EVENTS 轻量事件总线（模块解耦，约 20 行）
 * 依赖：anim.js（QIAO_ANIM.TEMPLATES）、world.js（QIAO_WORLD）
 * 暴露：window.QIAO_SCRIPTS / window.ANIM_SCRIPTS / window.QIAO_EVENTS
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 轻量事件总线 ---------- */
  const EVENTS = {};
  const QIAO_EVENTS = {
    on(evt, fn) {
      (EVENTS[evt] = EVENTS[evt] || []).push(fn);
    },
    emit(evt, payload) {
      (EVENTS[evt] || []).slice().forEach(fn => {
        try { fn(payload); } catch (e) {}
      });
    },
    off(evt, fn) {
      if (!EVENTS[evt]) return;
      EVENTS[evt] = EVENTS[evt].filter(f => f !== fn);
    }
  };

  /* ---------- 文本工具 ---------- */
  /* 截断到 n 个字符（含结尾"…"）：超限时保留 n-1 字 + "…"，总长 ≤ n */
  function truncate(s, n) {
    s = String(s == null ? "" : s).trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  /* 字幕提炼：取第一分句，>12 字截断 */
  function subtitleOf(s) {
    s = String(s == null ? "" : s).trim();
    const parts = s.split(/[，。！？；、\n]/).map(x => x.trim()).filter(Boolean);
    const first = parts[0] || s;
    return truncate(first, 12);
  }

  /* ---------- 注册表 ---------- */
  const registry = {};

  /* 登记脚本：key = unitId；value = { [difficulty]: script } */
  function register(script) {
    if (!script || !script.unitId) return;
    const entry = registry[script.unitId] || (registry[script.unitId] = {});
    entry[script.difficulty || "basic"] = script;
  }

  function unitIdOf(unit, courseId) {
    if (unit && unit.id && /^[a-z]+-\d+$/.test(unit.id)) return unit.id;
    const cid = courseId || (unit && unit.courseId) || "auto";
    return cid + "-" + (unit && unit.no != null ? unit.no : "0");
  }

  /* ---------- scriptify 迁移器 ---------- */
  function scriptify(type, params, unit, courseId) {
    const ANIM = window.QIAO_ANIM;
    const WORLD = window.QIAO_WORLD;
    const tpl = ANIM && ANIM.TEMPLATES[type];
    if (!tpl) return null;
    const out = tpl(params || {});
    const frames = out.frames || [], caps = out.captions || [];
    if (!frames.length) return null;
    const topic = WORLD ? WORLD.topicOf(unit, courseId) : "calc";
    const charId = WORLD ? WORLD.characterOf(topic) : "chick";
    const region = WORLD && WORLD.WORLD.regions[topic];
    const storyBeat = WORLD ? WORLD.hookFor(unit, courseId) : "";
    const unitId = unitIdOf(unit, courseId);

    const steps = frames.map((svgStr, i) => {
      const last = i === frames.length - 1;
      const caption = caps[i] || "";
      const celebration = last && /star|sparkle|🎉|⭐/.test(svgStr);
      return {
        frame: i + 1,
        action: i === 0 ? "reveal" : last ? "conclude" : "transform",
        layer: { bg: null, fg: null, highlight: null },
        svg: svgStr,
        narration: truncate(caption, 25),
        subtitle: subtitleOf(caption),
        sfx: i === 0 ? "count_tick" : last ? "fanfare" : "pop",
        duration: last ? 3000 : 2500,
        interaction: null,
        targets: [],
        timeline: [],
        celebration
      };
    });

    return {
      id: unitId + "_" + type + "_basic",
      unitId, type, difficulty: "basic",
      scene: region ? { id: region.id, label: region.name, bg: "" } : { id: topic, label: "", bg: "" },
      characters: [{ id: charId, emotion: "curious", role: "guide" }],
      storyBeat,
      steps,
      timeline: { mode: "auto", totalDurationMs: steps.reduce((a, s) => a + s.duration, 0) },
      fallback: {
        staticSvg: frames[frames.length - 1],
        steps: caps.slice()
      }
    };
  }

  /* ---------- 取脚本（优先级：专属三档 → 专属基础 → 自动升级 → 过滤） ---------- */
  function get(unit, difficulty, courseId) {
    const uid = unitIdOf(unit, courseId);
    const entry = registry[uid];
    const diff = difficulty || "basic";
    let script = null;
    if (entry) script = entry[diff] || entry.basic || null;
    if (!script) {
      const a = unit && (unit.anim || (window.QIAO_ANIM && window.QIAO_ANIM.pick ? window.QIAO_ANIM.pick(unit.cat, unit.title, courseId) : null));
      if (!a || !a.type) return null;
      script = scriptify(a.type, a.params, unit, courseId);
    }
    if (!script) return null;
    if (window.QIAO_DIFF && window.QIAO_DIFF.filter) {
      return window.QIAO_DIFF.filter(script, diff);
    }
    return script;
  }

  /* ============================================================
   * 8 个代表单元专属脚本（每专题 1 个；其余 85 单元走自动升级）
   * 生成方式：复用模板帧图 + 注入剧情/角色/交互（帧 2 tap）
   * ============================================================ */
  function makeFeatured(unitId, courseId, type, params, topic, charId, storyBeat, prompt, hint, taunt) {
    const ANIM = window.QIAO_ANIM;
    const WORLD = window.QIAO_WORLD;
    const tpl = ANIM.TEMPLATES[type];
    const out = tpl(params || {});
    const frames = out.frames || [], caps = out.captions || [];
    const region = WORLD.WORLD.regions[topic];
    const steps = frames.map((svgStr, i) => {
      const last = i === frames.length - 1;
      const caption = caps[i] || "";
      const inter = (i === 1) ? {
        type: "tap",
        target: null,
        hitArea: { shape: "rect", x: 40, y: 55, w: 240, h: 100 },
        prompt, hint,
        maxTries: 3,
        difficulty: ["basic", "advanced", "challenge"],
        correct: [],
        wrongTaunt: taunt
      } : null;
      return {
        frame: i + 1,
        action: i === 0 ? "reveal" : last ? "conclude" : "transform",
        layer: { bg: null, fg: null, highlight: null },
        svg: svgStr,
        narration: truncate(caption, 25),
        subtitle: subtitleOf(caption),
        sfx: i === 0 ? "count_tick" : last ? "fanfare" : "pop",
        duration: last ? 3000 : 2500,
        interaction: inter,
        targets: [],
        timeline: [{ target: "#tap-target", action: "pop-in", delay: 300 }],
        celebration: last && /star|sparkle|🎉|⭐/.test(svgStr)
      };
    });
    return {
      id: unitId + "_" + type + "_basic",
      unitId, type, difficulty: "basic",
      scene: region ? { id: region.id, label: region.name, bg: "" } : { id: topic, label: "", bg: "" },
      characters: [{ id: charId, emotion: "curious", role: "guide" }],
      storyBeat,
      steps,
      timeline: { mode: "auto", totalDurationMs: steps.reduce((a, s) => a + s.duration, 0) },
      fallback: {
        staticSvg: frames[frames.length - 1],
        steps: caps.slice()
      }
    };
  }

  const F = makeFeatured;
  const featured = [
    // calc-1 凑十法（数字城堡 · 小算）
    F("calc-1", "calc", "countBlocks", { a: 9, b: 7 }, "calc", "chick",
      "方块仓库的门锁坏了！帮小算凑出 10，门就能打开～",
      "点一点绿色方块，把 1 送到 9 那边凑十！",
      "看绿色那堆，拆 1 给 9",
      "9 还差 1 才到 10，你把 1 藏哪啦？"),
    // geo-4 七巧板（形状森林 · 阿图）
    F("geo-4", "geo", "tangram", {}, "geo", "cat",
      "七巧板桥塌了！和阿图一起拼出小鱼，修好小桥～",
      "点一点小鱼身体，把它拼上去！",
      "看橙色那块三角形",
      "这块还没轮到它哦，再找找～"),
    // logic-1 数列规律（谜题沙漠 · 狐推理）
    F("logic-1", "logic", "sequence", { n: 8 }, "logic", "fox",
      "金字塔的密码丢了！和狐推理找出数列规律，解开密码～",
      "点一点下一个数该出现的位置！",
      "先看相邻两个数的差",
      "这个条件用不上，再找找别的线索"),
    // word-1 加减法应用（故事小镇 · 兔小用）
    F("word-1", "word", "barModel", { parts: [3, 5] }, "word", "rabbit",
      "村民的水果摊乱了！帮兔小用画出长条图，算清多与少～",
      "点一点长条图里多的那部分！",
      "长的条代表数量多",
      "把故事画成图，再看图就知道啦"),
    // nt-1 奇偶性（素数山脉 · 熊素数）
    F("nt-1", "nt", "parityColor", { n: 10 }, "nt", "bear",
      "素数山脉的宝石会变色！帮熊素数找出奇偶规律，点亮宝石～",
      "点一点偶数颜色的宝石！",
      "个位是 0、2、4、6、8 的是偶数",
      "这个数还能被别的数整除，再想想"),
    // travel-1 基本行程（速度海湾 · 龟速速）
    F("travel-1", "travel", "twoCars", {}, "travel", "turtle",
      "环海接力赛开始了！和龟速速用速度×时间，算准每一段路程～",
      "点一点两车相遇的位置！",
      "路程 = 速度 × 时间",
      "路程、速度、时间三个量对一对"),
    // comb-1 加法原理（计数冰原 · 企鹅数数）
    F("comb-1", "comb", "treeBranch", {}, "comb", "penguin",
      "鱼群分成两队迁徙！帮企鹅数数数清每一队的鱼，不重不漏～",
      "点一点第一层的分支！",
      "分类相加，数一个划一个",
      "这个顺序已经数过了，换个方向"),
    // think-1 枚举法（智慧之塔 · 猫头鹰博士）
    F("think-1", "think", "enumerate", {}, "think", "owl",
      "智慧之塔的台阶会变化！和猫头鹰博士把所有可能列出来，找到钥匙～",
      "点一点把可能都列出来的地方！",
      "先猜再验，试几次就找到规律了",
      "换个角度想，这条路不通就换一条")
  ];
  featured.forEach(register);

  window.QIAO_SCRIPTS = {
    registry, register, scriptify, get, unitIdOf, subtitleOf, truncate
  };
  // 兼容命名：设计文档同时使用 ANIM_SCRIPTS 指代注册表
  window.ANIM_SCRIPTS = registry;
  window.QIAO_EVENTS = QIAO_EVENTS;
})();
