/* ============================================================
 * 浅奥乐园 · 状态与存储层（Store）
 * 负责：用户档案读写（localStorage）、答题统计、关卡星级、
 *       徽章判定、等级晋升。键名统一 qiao_ 前缀。
 * ============================================================ */
(function () {
  const D = window.QIAO_DATA;
  const USER_KEY = "qiao_user";

  const defaultUser = () => ({
    name: "", age: 0, grade: 1, level: "萌芽",
    totalStars: 0, streak: 0, lastActive: "",
    retryOk: 0,
    stats: { answered: 0, correct: 0, byCat: { calc: 0, geo: 0, logic: 0, word: 0 } },
    levelStars: {},     // { levelId: bestStars }
    wrong: {},          // { qid: { times, lastWrong } }
    badges: [],         // 已解锁徽章 id
    kpMastered: [],     // 已掌握知识点 id
    lastSpin: "",       // 大转盘最近一次日期（每日限一次）
    // —— 课程内容三维度优化新增字段（带默认值，向后兼容）——
    courseStars: {},    // { [unitId]: { basic:0, advanced:0, challenge:0, best:0 } } 课时星
    badgeShards: {},    // { [topicId]: 0..3 } 徽章碎片
    skins: [],          // ["hat-red", ...] 皮肤
    unitProgress: {},   // { [unitId]: { basicDone, advancedDone, challengeDone, basicStars, advancedStars, challengeStars, best } }
    reviewQueue: [],    // [{ unitId, qid, lastWrongAt, dueAt, stage }] 复习调度队列
    storyMode: false    // P2：剧情逐关解锁开关（默认关，保持全部解锁）
  });

  function load() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return Object.assign(defaultUser(), JSON.parse(raw));
    } catch (e) { return null; }
  }

  function save(u) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {}
  }

  let user = load();

  /* 今日打卡：跨天则 streak+1，断更则重置为 1 */
  function touchStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (user.lastActive === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    user.streak = (user.lastActive === yStr) ? user.streak + 1 : 1;
    user.lastActive = today;
    save(user);
  }

  /* 等级晋升判定 */
  function computeLevel(stars) {
    let lv = "萌芽";
    D.LEVELS.forEach(l => { if (stars >= l.need) lv = l.key; });
    return lv;
  }

  /* 徽章判定：返回新解锁的徽章数组 */
  function checkBadges() {
    const newly = [];
    D.BADGES.forEach(b => {
      if (user.badges.includes(b.id)) return;
      const ok = b.check ? b.check(user.stats, user) : false;
      if (ok) { user.badges.push(b.id); newly.push(b); }
    });
    if (newly.length) save(user);
    return newly;
  }

  /* 提交一次作答结果 */
  function submitAnswer(q, isCorrect, opts) {
    opts = opts || {};
    user.stats.answered++;
    user.stats.catAns = user.stats.catAns || { calc: 0, geo: 0, logic: 0, word: 0 };
    user.stats.catAns[q.cat] = (user.stats.catAns[q.cat] || 0) + 1;
    if (isCorrect) {
      user.stats.correct++;
      user.stats.byCat[q.cat] = (user.stats.byCat[q.cat] || 0) + 1;
      if (opts.fromWrong && !user.kpMastered.includes(q.kp)) user.retryOk = (user.retryOk || 0) + 1;
    } else {
      user.wrong[q.id] = { times: (user.wrong[q.id]?.times || 0) + 1, lastWrong: new Date().toISOString().slice(0, 10) };
    }
    save(user);
  }

  /* 关卡完成：记录最佳星级 */
  function completeLevel(levelId, stars) {
    const prev = user.levelStars[levelId] || 0;
    if (stars > prev) {
      user.totalStars += (stars - prev);
      user.levelStars[levelId] = stars;
    }
    user.level = computeLevel(user.totalStars);
    save(user);
  }

  function markKpMastered(kpId) {
    if (!user.kpMastered.includes(kpId)) { user.kpMastered.push(kpId); save(user); }
  }
  function removeWrong(qid) {
    delete user.wrong[qid]; save(user);
  }

  function accuracy() {
    return user.stats.answered ? Math.round(user.stats.correct / user.stats.answered * 100) : 0;
  }
  function catAccuracy(cat) {
    const ans = (user.stats.catAns && user.stats.catAns[cat]) || 0;
    if (!ans) return 0;
    return Math.round((user.stats.byCat[cat] || 0) / ans * 100);
  }

  /* 奖励星（连击 / 大转盘）：加星并重新算等级 */
  function award(n) {
    user.totalStars += n;
    user.level = computeLevel(user.totalStars);
    save(user);
  }

  function reset() {
    user = defaultUser();
    save(user);
  }
  function exportJSON() {
    return JSON.stringify(user, null, 2);
  }

  window.QIAO_STORE = {
    get user() { return user; },
    ensure() { if (!user) { user = defaultUser(); save(user); } return user; },
    save, touchStreak, submitAnswer, completeLevel, checkBadges,
    markKpMastered, removeWrong, accuracy, catAccuracy, computeLevel, award,
    reset, exportJSON, defaultUser
  };
})();
