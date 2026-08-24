/* ============================================================
 * 浅奥乐园 · 角色 / 世界观 / 吐槽词库（QIAO_WORLD）
 * 职责：8 吉祥物人设（6 表情 × 吐槽词库）、8 专题故事线、
 *       专题 → 单元映射（派生规则，不写 93 条）。
 * 依赖：无（纯数据；可选读取 QIAO_COURSES 做 type→topic 推导）
 * 暴露：window.QIAO_WORLD
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 8 角色人设（id 全局唯一，与 anim.js MASCOT 一致） ---------- */
  const CHARACTERS = {
    chick: {
      id: "chick", topic: "calc", name: "小算", emoji: "🐤",
      trait: "急性子、爱数数", catchphrase: "先凑十，再搞定！",
      emotions: {
        curious:   { emoji: "🐤", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🐤", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🐤", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🐤", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🐤", bubble: "这颗在睡觉哦",  anim: "a-wob" },
        celebrate: { emoji: "🐤", bubble: "搞定！",        anim: "a-spin" }
      },
      taunts: [
        "9 还差 1 才到 10，你把 1 藏哪啦？",
        "这个选项在睡觉，叫醒它再选～",
        "别急，先数清楚再点哦",
        "那个数好像多算了一次，再数数看",
        "凑十先看大数，别盯小数发呆呀"
      ]
    },
    cat: {
      id: "cat", topic: "geo", name: "阿图", emoji: "🐱",
      trait: "爱观察、强迫症", catchphrase: "看边看角，别漏啦",
      emotions: {
        curious:   { emoji: "🐱", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🐱", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🐱", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🐱", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🐱", bubble: "这块还没轮到哦", anim: "a-wob" },
        celebrate: { emoji: "🐱", bubble: "拼好啦！",      anim: "a-spin" }
      },
      taunts: [
        "这条边好像没数到，再看看角～",
        "那块图形转个方向再看一眼",
        "数边要沿着走一圈，别跳着数",
        "这个角是直角吗？量一量再选",
        "图形有点困，翻个身就好啦"
      ]
    },
    fox: {
      id: "fox", topic: "logic", name: "狐推理", emoji: "🦊",
      trait: "冷静、爱反问", catchphrase: "真的吗？再想想",
      emotions: {
        curious:   { emoji: "🦊", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🦊", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🦊", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🦊", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🦊", bubble: "这个线索是假的", anim: "a-wob" },
        celebrate: { emoji: "🦊", bubble: "推理成功！",    anim: "a-spin" }
      },
      taunts: [
        "这个条件用不上，再找找别的线索",
        "真假话里，总有人在说谎哦",
        "先看规律再说，别急着猜",
        "这一步跳得太快，回头补一步",
        "规律在睡觉，把它叫醒再看"
      ]
    },
    rabbit: {
      id: "rabbit", topic: "word", name: "兔小用", emoji: "🐰",
      trait: "热心、爱讲故事", catchphrase: "把故事画成图",
      emotions: {
        curious:   { emoji: "🐰", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🐰", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🐰", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🐰", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🐰", bubble: "这个数跑偏了",  anim: "a-wob" },
        celebrate: { emoji: "🐰", bubble: "讲明白啦！",    anim: "a-spin" }
      },
      taunts: [
        "把故事画成图，再看图就知道啦",
        "这个量在故事里没出现过哦",
        "谁比谁多，先画出来比一比",
        "单位不一样，先换成一家人",
        "小故事里藏着大线索，再读一遍"
      ]
    },
    bear: {
      id: "bear", topic: "nt", name: "熊素数", emoji: "🐻",
      trait: "慢性子、爱收藏", catchphrase: "2、3、5、7 都是宝",
      emotions: {
        curious:   { emoji: "🐻", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🐻", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🐻", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🐻", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🐻", bubble: "这颗不是宝石",  anim: "a-wob" },
        celebrate: { emoji: "🐻", bubble: "收藏成功！",    anim: "a-spin" }
      },
      taunts: [
        "这个数还能被别的数整除，不是质数",
        "2 是唯一的偶质数，别忘啦",
        "个位是 0 或 5，一定能被 5 整除",
        "把这个数拆小一点再看看",
        "宝石只藏在质数里，再找找"
      ]
    },
    turtle: {
      id: "turtle", topic: "travel", name: "龟速速", emoji: "🐢",
      trait: "慢悠悠但稳", catchphrase: "路程=速度×时间",
      emotions: {
        curious:   { emoji: "🐢", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🐢", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🐢", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🐢", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🐢", bubble: "速度没对上",    anim: "a-wob" },
        celebrate: { emoji: "🐢", bubble: "到终点啦！",    anim: "a-spin" }
      },
      taunts: [
        "路程 = 速度 × 时间，三个量对一对",
        "单位先统一：米/千米、秒/分/时",
        "这题是同时出发吗？再读一遍",
        "速度不能直接相加，除非是同向",
        "先找路程，再找时间，最后求速度"
      ]
    },
    penguin: {
      id: "penguin", topic: "comb", name: "企鹅数数", emoji: "🐧",
      trait: "一板一眼", catchphrase: "不重不漏，数一个划一个",
      emotions: {
        curious:   { emoji: "🐧", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🐧", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🐧", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🐧", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🐧", bubble: "这个数过了",    anim: "a-wob" },
        celebrate: { emoji: "🐧", bubble: "数完啦！",      anim: "a-spin" }
      },
      taunts: [
        "数一个划一个，就不会重啦",
        "这个顺序已经数过了，换个方向",
        "先分类再数，别混在一起",
        "是不是漏了开头那一个？",
        "排好队再数，队伍乱了可不行"
      ]
    },
    owl: {
      id: "owl", topic: "think", name: "猫头鹰博士", emoji: "🦉",
      trait: "智慧、爱提问", catchphrase: "换个角度想",
      emotions: {
        curious:   { emoji: "🦉", bubble: "？",           anim: "a-bob" },
        explain:   { emoji: "🦉", bubble: "看这里～",      anim: "a-float" },
        cheer:     { emoji: "🦉", bubble: "太棒了！",      anim: "a-bob" },
        amazed:    { emoji: "🦉", bubble: "哇！",         anim: "a-spin" },
        tease:     { emoji: "🦉", bubble: "换个角度看看",  anim: "a-wob" },
        celebrate: { emoji: "🦉", bubble: "思考成功！",    anim: "a-spin" }
      },
      taunts: [
        "从后往前推一步，答案自己会出来",
        "换个角度想，这条路不通就换一条",
        "把大问题拆成小问题试试",
        "极端情况想一想：全都一样会怎样？",
        "先猜再验，试几次就找到规律了"
      ]
    }
  };

  /* ---------- 8 专题故事线（地图区域） ---------- */
  const WORLD = {
    regions: {
      calc:   { id: "calc",   name: "数字城堡",  mascotId: "chick",   color: "var(--c-calc)",
                story: "帮小算整理混乱的方块仓库",
                hook: "门锁要凑 10 才能打开！",
                win: "仓库门开了！里面还有更多算式等着你～" },
      geo:    { id: "geo",    name: "形状森林",  mascotId: "cat",     color: "var(--c-geo)",
                story: "和阿图修复倒塌的七巧板桥",
                hook: "拼出小鱼，桥就修好啦！",
                win: "小桥修好了！形状森林又恢复了生机～" },
      logic:  { id: "logic",  name: "谜题沙漠",  mascotId: "fox",     color: "var(--c-logic)",
                story: "和狐推理破解金字塔谜题",
                hook: "谜题的钥匙藏在规律里！",
                win: "金字塔大门打开了！下一个谜题在等你～" },
      word:   { id: "word",   name: "故事小镇",  mascotId: "rabbit",  color: "var(--c-word)",
                story: "帮兔小用解决村民的数学难题",
                hook: "把故事画成图就清楚了！",
                win: "村民的问题解决了！小镇又充满欢笑～" },
      nt:     { id: "nt",     name: "素数山脉",  mascotId: "bear",    color: "var(--c-nt)",
                story: "和熊素数寻找神秘质数宝石",
                hook: "宝石藏在质数里！",
                win: "又找到一颗质数宝石！山脉深处还有秘密～" },
      travel: { id: "travel", name: "速度海湾",  mascotId: "turtle",  color: "var(--c-travel)",
                story: "和龟速速完成环海接力赛",
                hook: "路程=速度×时间，出发！",
                win: "接力赛完成！下一段航程在等你～" },
      comb:   { id: "comb",   name: "计数冰原",  mascotId: "penguin", color: "var(--c-comb)",
                story: "和企鹅数数清点迁徙的鱼群",
                hook: "不重不漏，数一个划一个！",
                win: "鱼群数清楚了！冰原上还有更多要数～" },
      think:  { id: "think",  name: "智慧之塔",  mascotId: "owl",     color: "var(--c-think)",
                story: "和猫头鹰博士登塔取思考徽章",
                hook: "换个角度想，塔门就开！",
                win: "又上一层楼！思考徽章在塔顶等你～" }
    }
  };

  /* ---------- 派生映射：模板 type → 专题 ---------- */
  const TYPE_TOPIC = {};
  (function buildTypeTopic() {
    const cs = window.QIAO_COURSES;
    if (!cs || !cs.length) return;
    cs.forEach(co => {
      (co.units || []).forEach(u => {
        if (u.anim && u.anim.type && !TYPE_TOPIC[u.anim.type]) TYPE_TOPIC[u.anim.type] = co.id;
      });
    });
  })();
  // 兜底：个别未被 courses 覆盖的模板名（安全默认）
  const TYPE_TOPIC_FALLBACK = {
    numberLine: "calc", countBlocks: "calc", arrayGrid: "calc", gauss: "calc",
    fraction: "calc", sequence: "logic", lGraph: "logic", oddOneOut: "logic",
    shapeSort: "geo", tangram: "geo", perimeter: "geo", foldSymmetry: "geo",
    barModel: "word", parityColor: "nt", divisible: "nt",
    twoCars: "travel", treeBranch: "comb", reverseArrow: "think", drawDiagram: "think"
  };

  /* ---------- 工具 ---------- */
  function topicOf(unit, courseId) {
    if (courseId && WORLD.regions[courseId]) return courseId;
    if (unit && unit.courseId && WORLD.regions[unit.courseId]) return unit.courseId;
    if (unit && unit.anim && unit.anim.type) {
      const t = TYPE_TOPIC[unit.anim.type] || TYPE_TOPIC_FALLBACK[unit.anim.type];
      if (t) return t;
    }
    return "calc";
  }

  function characterOf(topic) {
    const r = WORLD.regions[topic];
    return r ? r.mascotId : "chick";
  }

  function hookFor(unit, courseId) {
    if (unit && unit.storyBeat) return unit.storyBeat;
    const t = topicOf(unit, courseId);
    return WORLD.regions[t] ? WORLD.regions[t].hook : "";
  }

  function winFor(unit, courseId) {
    if (unit && unit.storyBeatWin) return unit.storyBeatWin;
    const t = topicOf(unit, courseId);
    return WORLD.regions[t] ? WORLD.regions[t].win : "太棒了！";
  }

  function randomTaunt(charId) {
    const ch = CHARACTERS[charId] || CHARACTERS.chick;
    const arr = ch.taunts || CHARACTERS.chick.taunts;
    return arr[(Math.random() * arr.length) | 0];
  }

  function emotionOf(charId, key) {
    const ch = CHARACTERS[charId] || CHARACTERS.chick;
    return ch.emotions[key] || ch.emotions.curious;
  }

  window.QIAO_WORLD = {
    CHARACTERS, WORLD,
    topicOf, characterOf, hookFor, winFor, randomTaunt, emotionOf,
    TYPE_TOPIC
  };
})();
