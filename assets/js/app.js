/* ============================================================
 * 浅奥乐园 · 应用主层（页面 / 组件 / 交互）
 * 依赖：data.js → store.js → router.js
 * 路由分发：window.QIAO_APP.render(route)
 * ============================================================ */
(function () {
  const D = window.QIAO_DATA;
  const S = window.QIAO_STORE;
  const R = window.QIAO_ROUTER;
  const app = () => document.getElementById("app");

  const CHAPTERS = D.buildChapters();
  const QBYID = {}; D.QUESTIONS.forEach(q => QBYID[q.id] = q);
  const KBYID = {}; D.KNOWLEDGE.forEach(k => KBYID[k.id] = k);

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function stars(n) { return "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n); }
  function diffStars(n) { return "★".repeat(n) + "☆".repeat(3 - n); }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function modal(html) {
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = `<div class="modal">${html}</div>`;
    mask.addEventListener("click", e => { if (e.target === mask) mask.remove(); });
    document.body.appendChild(mask);
    return mask;
  }

  function starBurst() {
    const s = document.createElement("div");
    s.className = "star-burst"; s.textContent = "⭐";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }

  /* ---------- 解锁判定（全部开启） ---------- */
  function chapterUnlocked(ch) { return true; }
  function levelUnlocked(ch, idx) { return true; }

  /* ---------- 底部标签栏 ---------- */
  const TABS = [
    { name: "home", icon: "🏠", label: "首页" },
    { name: "courses", icon: "📚", label: "课程" },
    { name: "bank", icon: "🧠", label: "题库" },
    { name: "wrong", icon: "❓", label: "错题" },
    { name: "achievements", icon: "🏅", label: "成就" },
    { name: "profile", icon: "🙂", label: "我" }
  ];
  function renderTabbar(active) {
    const bar = document.getElementById("tabbar");
    bar.innerHTML = TABS.map(t =>
      `<a href="#/${t.name}" class="${t.name === active ? "active" : ""}">
         <span style="font-size:22px">${t.icon}</span><span>${t.label}</span></a>`).join("");
    const side = document.getElementById("sideNav");
    if (side) side.innerHTML = TABS.map(t =>
      `<a href="#/${t.name}" class="${t.name === active ? "active" : ""}"><span style="font-size:20px">${t.icon}</span>${t.label}</a>`).join("");
  }

  /* ============================================================
   * 路由分发
   * ============================================================ */
  function render(route) {
    S.ensure(); S.touchStreak();
    const r = route || R.parse();
    renderTabbar(r.name === "welcome" ? "" : r.name);
    const map = {
      welcome: pageWelcome, home: pageHome, courses: pageCourses,
      course: pageCourseDetail, bank: pageBank,
      level: pageLevel, practice: pagePractice, wrong: pageWrong,
      profile: pageProfile, achievements: pageAchievements, support: pageSupport,
      run: pageCourseRun
    };
    const fn = map[r.name] || pageHome;
    const out = fn(r);
    app().innerHTML = out.html;
    document.getElementById("tabbar").style.display = (r.name === "welcome" || r.name === "practice") ? "none" : "flex";
    if (out.mount) out.mount();
    // —— 趣味层：吉祥物与静音键 ——
    if (window.QIAO_FUN) {
      const F = window.QIAO_FUN;
      F.mascot.init();
      F.mascot.refresh();
      document.getElementById("mascot").style.display = (r.name === "welcome") ? "none" : "flex";
      ensureMuteBtn(F);
    }
    window.scrollTo(0, 0);
  }

  /* 悬浮静音键（首次渲染时创建一次） */
  function ensureMuteBtn(F) {
    let b = document.getElementById("muteBtn");
    if (!b) {
      b = document.createElement("button");
      b.id = "muteBtn"; b.className = "mute-btn";
      b.addEventListener("click", () => {
        const m = F.toggleMute();
        b.textContent = m ? "🔇" : "🔊";
        if (!m) F.sfx.tap();
        toast(m ? "已静音" : "声音开启");
      });
      document.body.appendChild(b);
    }
    b.textContent = F.isMuted() ? "🔇" : "🔊";
  }

  /* ============================================================
   * 页面：入学分级
   * ============================================================ */
  function pageWelcome() {
    const html = `
    <div class="page welcome">
      <div class="welcome-hero">
        <div class="welcome-emoji">🧮✨</div>
        <h1 class="welcome-title">浅奥乐园</h1>
        <p class="welcome-sub">和小朋友一起，把数学变成闯关冒险！</p>
      </div>
      <div class="card">
        <label class="field-label">你的名字</label>
        <input id="w_name" class="input" placeholder="例如：小明" maxlength="8"/>
        <label class="field-label" style="margin-top:16px">你的年龄</label>
        <div class="age-row">
          ${[6,7,8,9,10,11,12,13].map(a=>`<button class="age-btn" data-age="${a}">${a}</button>`).join("")}
        </div>
        <button id="w_start" class="btn btn-primary" style="width:100%;margin-top:20px">开始冒险 🚀</button>
      </div>
      <p class="welcome-tip">我们将根据你的年龄安排合适的年级题目，所有进度只存在本机。</p>
    </div>`;
    const mount = () => {
      let age = 0;
      document.querySelectorAll(".age-btn").forEach(b => b.addEventListener("click", () => {
        document.querySelectorAll(".age-btn").forEach(x => x.classList.remove("sel"));
        b.classList.add("sel"); age = +b.dataset.age;
      }));
      document.getElementById("w_start").addEventListener("click", () => {
        const name = document.getElementById("w_name").value.trim() || "小勇士";
        const grade = age <= 7 ? 1 : age === 8 ? 2 : age === 9 ? 3 : age === 10 ? 4 : age === 11 ? 5 : 6;
        const u = S.ensure();
        u.name = name; u.age = age; u.grade = grade; S.save(u);
        R.go("/home");
      });
    };
    return { html, mount };
  }

  /* ============================================================
   * 页面：首页（关卡地图）
   * ============================================================ */
  function pageHome() {
    const u = S.user;
    let chaptersHtml = CHAPTERS.map(ch => {
      const open = chapterUnlocked(ch);
      const levels = ch.levels.map((lv, i) => {
        const unlocked = levelUnlocked(ch, i);
        const st = u.levelStars[lv.id] || 0;
        const c = D.CATEGORIES[lv.cat];
        return `<a class="level-card ${unlocked ? "" : "locked"}" href="${unlocked ? "#/level/" + lv.id : "#"}">
          <div class="level-emoji">${unlocked ? c.icon : "🔒"}</div>
          <div class="level-main">
            <div class="level-title">${esc(lv.title)}</div>
            <div class="level-meta">${lv.questionIds.length} 题 · <span class="tag tag-${lv.cat}">${c.name}</span></div>
          </div>
          <div class="level-stars ${st ? "on" : ""}">${unlocked ? stars(st) : ""}</div>
        </a>`;
      }).join("");
      return `<div class="chapter ${open ? "" : "locked-ch"}">
        <div class="chapter-head"><span class="chapter-emoji">${open ? "🌟" : "🔒"}</span>
          <h2 class="chapter-title">${esc(ch.name)}</h2></div>
        <div class="level-list">${levels}</div>
      </div>`;
    }).join("");

    const html = `
    <div class="page">
      <div class="card support-card">
        <div class="sc-glow"></div>
        <div class="sc-badge">💖 自愿赞助通道</div>
        <div class="sc-text">由于模型 Token 调用成本较高，为了维持服务稳定运行，现开启自愿赞助通道。如果您觉得本应用对您有帮助，欢迎扫码支持服务器及 Token 费用。金额不限，您的支持是我持续维护的动力！</div>
        <div class="sc-qr" id="supportQr">
          <img src="assets/images/support-planet.png" alt="赞助二维码" loading="lazy"/>
        </div>
        <div class="sc-foot">微信扫码 · 金额不限 · 自愿支持</div>
      </div>

      <div class="card guide-card">
        <div class="guide-h">🧭 怎么用浅奥乐园</div>
        <ol class="guide-list">
          <li><b>首页闯关</b>：在星球地图上选关卡，每天来挑战就能攒星星；别忘了点「每日幸运大转盘」领额外奖励。</li>
          <li><b>课程中心</b>：八大专题任选，每个单元都有「知识点精讲 → 方法公式 → 例题精讲 → 易错点 → 配套练习」，建议先看再练。</li>
          <li><b>题库练习</b>：按年级 / 分类 / 难度筛选题目，随时开练；点任意一题即进入作答。</li>
          <li><b>作答互动</b>：选择题点选项、填空题输答案；答错可看讲解、收藏、重做，就地弄懂。</li>
          <li><b>错题与成就</b>：做错的题自动进错题本，可反复练；星星和徽章在「成就」里收集。</li>
          <li><b>进度说明</b>：所有学习进度只存在本机，清理浏览器或更换设备不会保留，记得常来玩～</li>
        </ol>
      </div>

      <div class="home-top card">
        <div class="home-avatar">${u.name ? u.name[0] : "🙂"}</div>
        <div class="home-info">
          <div class="home-name">${esc(u.name || "小勇士")} <span class="home-lv">${u.level}</span></div>
          <div class="home-sub">连续打卡 🔥 ${u.streak} 天</div>
        </div>
        <div class="home-stars">⭐ ${u.totalStars}</div>
      </div>
      <a class="home-course" href="#/courses">
        <span class="hc-ico">📚</span>
        <span class="hc-txt"><b>课程中心</b><br>先看知识点精讲，再去做题，学练不慌</span>
        <span class="hc-arrow">→</span>
      </a>
      <div class="home-review" id="homeReview" style="display:none"></div>
      <div class="home-wheel" id="homeWheel">
        <span class="hw-ico">🎡</span>
        <span class="hw-txt"><b>每日幸运大转盘</b><br><span id="wheelHint">转一转，领今日奖励星星 ✨</span></span>
        <span class="hw-btn">去转 →</span>
      </div>
      <div class="home-banner">选一个关卡，开始今天的挑战吧！👇</div>
      ${chaptersHtml}
    </div>`;
    const mount = () => {
      const F = window.QIAO_FUN;
      if (F) {
        F.mascot.greet();
        const hint = document.getElementById("wheelHint");
        if (hint) hint.textContent = F.canSpinToday() ? "转一转，领今日奖励星星 ✨" : "今天已经转过啦，明天再来～";
        const w = document.getElementById("homeWheel");
        if (w) w.addEventListener("click", () => {
          F.dailyWheel(prize => {
            toast("🎡 +" + prize + "⭐ 到账！");
            render(R.parse());
          });
        });
        const sq = document.getElementById("supportQr");
        if (sq) sq.addEventListener("click", () => {
          modal(`
            <div class="support-modal">
              <div class="support-modal-title">💖 自愿赞助通道</div>
              <div class="support-modal-sub">由于模型 Token 调用成本较高，为了维持服务稳定运行，现开启自愿赞助通道。如果您觉得本应用对您有帮助，欢迎扫码支持服务器及 Token 费用。</div>
              <img class="support-modal-img" src="assets/images/support-planet.png" alt="赞助二维码"/>
              <div class="support-modal-foot">金额不限，您的支持是我持续维护的动力！</div>
              <button class="btn btn-primary support-modal-btn" onclick="this.closest('.modal-mask').remove()">我知道了</button>
            </div>
          `);
        });
        mountReviewCard();
      }
    };
    return { html, mount };
  }

  /* 首页「每日一复」卡片：到期错题 → 挑战难度动画重放 */
  function mountReviewCard() {
    const box = document.getElementById("homeReview");
    if (!box || !window.QIAO_RHYTHM) return;
    const due = window.QIAO_RHYTHM.scheduler.dueToday();
    if (!due.length) return;
    const item = due[0];
    const found = window.QIAO_RHYTHM.findUnit(item.unitId);
    const title = found ? found.u.title : (item.unitId || "错题复习");
    box.style.display = "block";
    box.innerHTML = `
      <div class="home-review-card">
        <div class="hr-ico">📅</div>
        <div class="hr-main">
          <b>每日一复 · ${due.length} 道错题待巩固</b>
          <span>${esc(title)}</span>
        </div>
        <button class="hr-btn" id="hrGo">去复习 →</button>
      </div>`;
    document.getElementById("hrGo").addEventListener("click", () => {
      if (found) R.go("/run/" + found.co.id + "/" + found.u.no + "?diff=challenge&review=1");
      else toast("请在错题本中重做该题");
    });
  }

  /* ============================================================
   * 页面：支持与说明（赞助通道 + 使用指南）
   * ============================================================ */
  function pageSupport() {
    const html = `
    <div class="page">
      <a class="back" href="#/home">← 返回首页</a>
      <h1 class="h1">💝 支持与说明</h1>
      <p class="course-intro">浅奥乐园完全免费、无广告。下面是自愿赞助通道，以及一份简短的使用指南。</p>

      <div class="card support-card">
        <div class="sc-glow"></div>
        <div class="sc-badge">💖 自愿赞助通道</div>
        <div class="sc-text">由于模型 Token 调用成本较高，为了维持服务稳定运行，现开启自愿赞助通道。如果您觉得本应用对您有帮助，欢迎扫码支持服务器及 Token 费用。金额不限，您的支持是我持续维护的动力！</div>
        <div class="sc-qr" id="supportQr">
          <img src="assets/images/support-planet.png" alt="赞助二维码" loading="lazy"/>
        </div>
        <div class="sc-foot">微信扫码 · 金额不限 · 自愿支持</div>
      </div>

      <div class="card guide-card">
        <div class="guide-h">🧭 怎么用浅奥乐园</div>
        <ol class="guide-list">
          <li><b>首页闯关</b>：在星球地图上选关卡，每天来挑战就能攒星星；别忘了点「每日幸运大转盘」领额外奖励。</li>
          <li><b>课程中心</b>：八大专题任选，每个单元都有「知识点精讲 → 方法公式 → 例题精讲 → 易错点 → 配套练习」，建议先看再练。</li>
          <li><b>题库练习</b>：按年级 / 分类 / 难度筛选题目，随时开练；点任意一题即进入作答。</li>
          <li><b>作答互动</b>：选择题点选项、填空题输答案；答错可看讲解、收藏、重做，就地弄懂。</li>
          <li><b>错题与成就</b>：做错的题自动进错题本，可反复练；星星和徽章在「成就」里收集。</li>
          <li><b>进度说明</b>：所有学习进度只存在本机，清理浏览器或更换设备不会保留，记得常来玩～</li>
        </ol>
      </div>
    </div>`;
    const mount = () => {
      const qr = document.getElementById("supportQr");
      if (qr) qr.addEventListener("click", () => {
        modal(`
          <div class="support-modal">
            <div class="support-modal-title">💖 自愿赞助通道</div>
            <div class="support-modal-sub">由于模型 Token 调用成本较高，为了维持服务稳定运行，现开启自愿赞助通道。如果您觉得本应用对您有帮助，欢迎扫码支持服务器及 Token 费用。</div>
            <img class="support-modal-img" src="assets/images/support-planet.png" alt="赞助二维码"/>
            <div class="support-modal-foot">金额不限，您的支持是我持续维护的动力！</div>
            <button class="btn btn-primary support-modal-btn" onclick="this.closest('.modal-mask').remove()">我知道了</button>
          </div>
        `);
      });
    };
    return { html, mount };
  }

  /* ---------- 轻量 Markdown 渲染（课程讲义用） ---------- */
  function md(src) {
    if (!src) return "";
    let s = esc(src);
    s = s.replace(/```[\s\S]*?```/g, m => {
      const code = m.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
      return `<pre class="md-pre">${code}</pre>`;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    return s.split(/\n{2,}/).map(b => {
      const lines = b.split("\n").filter(x => x.trim() !== "");
      if (!lines.length) return "";
      if (lines.every(l => /^[-*]\s+/.test(l)))
        return "<ul>" + lines.map(l => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("") + "</ul>";
      if (/^\d+[.、]\s+/.test(lines[0]))
        return "<ol>" + lines.map(l => `<li>${l.replace(/^\d+[.、]\s+/, "")}</li>`).join("") + "</ol>";
      return "<p>" + lines.join("<br>") + "</p>";
    }).join("");
  }

  /* ============================================================
   * 页面：课程中心（八大专题目录）
   * ============================================================ */
  function pageCourses() {
    const courses = window.QIAO_COURSES || [];
    const cards = courses.map(co => {
      const units = co.units.length;
      const ex = co.units.reduce((a, u) => a + (u.examples ? u.examples.length : 0), 0);
      const banked = co.cat ? `<span class="tag tag-${co.cat}">可练</span>` : `<span class="tag tag-soon">待接入题库</span>`;
      return `<a class="course-card" href="#/course/${co.id}">
        <div class="cc-ico" style="background:${co.color}1a;color:${co.color}">${co.icon}</div>
        <div class="cc-main">
          <div class="cc-title">${co.name}</div>
          <div class="cc-desc">${esc(co.desc)}</div>
          <div class="cc-meta">${units} 个单元 · ${ex} 道例题 ${banked}</div>
        </div>
        <div class="cc-arrow">→</div>
      </a>`;
    }).join("");
    const html = `
    <div class="page">
      <h1 class="h1">📚 课程中心</h1>
      <p class="course-intro">八大专题、先学后练。点开任意专题，里面有「知识点精讲 → 方法公式 → 例题 → 易错点 → 配套练习」。</p>
      <div class="course-grid">${cards}</div>
    </div>`;
    return { html };
  }

  /* ============================================================
   * 页面：课程详情（单元手风琴 + 五段讲义）
   * ============================================================ */
  function pageCourseDetail(r) {
    const id = r.params[0];
    const co = (window.QIAO_COURSES || []).find(c => c.id === id);
    if (!co) return { html: `<div class="page"><div class="card">课程不存在</div></div>` };
    const units = co.units.map(u => {
      const goBtn = co.cat
        ? `<button class="btn btn-primary cu-go" data-go="${co.cat}">去练习 ${esc(co.name)} 题目 →</button>`
        : `<div class="cu-soon">对应题库待接入，先把这部分知识点学扎实吧～</div>`;
      const unitId = co.id + "-" + u.no;
      const starsEarned = (S.user.courseStars && S.user.courseStars[unitId] && S.user.courseStars[unitId].best) || 0;
      const diffTabs = diffTabsHtml(unitId);
      return `<div class="unit">
        <div class="unit-head" data-unit="${u.no}">
          <span class="unit-no">${u.no}</span>
          <span class="unit-title">${esc(u.title)}</span>
          <span class="unit-toggle">▾</span>
        </div>
        <div class="unit-body">
          <div class="anim-launch">
            <div class="al-head">
              <span class="al-title">🎬 动画课</span>
              <span class="al-stars">课时星 ${diffStars(starsEarned)}</span>
            </div>
            ${diffTabs}
            <div class="al-btns">
              <button class="btn btn-primary anim-play-btn" data-course="${co.id}" data-unit="${u.no}">▶ 播放动画</button>
              <button class="btn btn-secondary anim-run-btn" data-course="${co.id}" data-unit="${u.no}">🚀 完整学习</button>
            </div>
            <div class="player-mount" id="pm_${unitId}" style="display:none"></div>
          </div>
          ${(window.QIAO_ANIM ? window.QIAO_ANIM.build(u, co.id) : "")}
          <div class="cu-sec"><div class="cu-h">📖 知识点精讲</div><div class="cu-b">${md(u.knowledge)}</div></div>
          <div class="cu-sec"><div class="cu-h">🧮 方法公式</div><div class="cu-b">${u.method && u.method.length ? "<ul>" + u.method.map(m => `<li>${md(m)}</li>`).join("") + "</ul>" : "—"}</div></div>
          <div class="cu-sec"><div class="cu-h">📝 例题精讲</div><div class="cu-b">${(u.examples || []).map(e => `<div class="exp"><div class="exp-t">${esc(e.t)}</div><div class="exp-b">${md(e.b)}</div></div>`).join("")}</div></div>
          <div class="cu-sec"><div class="cu-h">⚠️ 易错点</div><div class="cu-b">${u.pitfalls && u.pitfalls.length ? "<ul>" + u.pitfalls.map(p => `<li>${md(p)}</li>`).join("") + "</ul>" : "—"}</div></div>
          <div class="cu-sec"><div class="cu-h">🔗 配套练习</div><div class="cu-b">${md(u.practice)}</div>${goBtn}</div>
        </div>
      </div>`;
    }).join("");

    const html = `
    <div class="page">
      <a class="back" href="#/courses">← 返回课程中心</a>
      <div class="card course-hero" style="border-color:${co.color}55">
        <div class="ch-ico" style="background:${co.color}1a;color:${co.color}">${co.icon}</div>
        <div>
          <h1 class="ch-title">${esc(co.name)} 专题</h1>
          <div class="ch-desc">${esc(co.desc)}</div>
          <div class="ch-meta">${co.units.length} 个单元 · 共 ${co.units.reduce((a, u) => a + (u.examples ? u.examples.length : 0), 0)} 道例题</div>
        </div>
      </div>
      <div class="unit-list">${units}</div>
    </div>`;
    const mount = () => {
      document.querySelectorAll(".unit-head").forEach(h => h.addEventListener("click", () => {
        h.parentElement.classList.toggle("open");
      }));
      document.querySelectorAll(".cu-go").forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();
        bankFilter.cat = b.dataset.go;
        R.go("/bank?cat=" + b.dataset.go);
      }));
      // 难度选择
      document.querySelectorAll(".diff-tab").forEach(tab => tab.addEventListener("click", () => {
        const group = tab.closest(".difficulty-tabs");
        if (tab.classList.contains("locked")) return;
        group.querySelectorAll(".diff-tab").forEach(x => x.classList.remove("on"));
        tab.classList.add("on");
      }));
      // 播放动画
      document.querySelectorAll(".anim-play-btn").forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();
        playUnitAnim(b.dataset.course, +b.dataset.unit);
      }));
      // 完整学习动线
      document.querySelectorAll(".anim-run-btn").forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();
        R.go("/run/" + b.dataset.course + "/" + b.dataset.unit);
      }));
    };
    return { html, mount };
  }

  /* 难度选项卡 HTML */
  function diffTabsHtml(unitId) {
    const D2 = window.QIAO_DIFF;
    const defs = [["basic", "基础"], ["advanced", "进阶"], ["challenge", "挑战"]];
    return `<div class="difficulty-tabs">` + defs.map(([lv, label], i) => {
      const unlocked = !D2 || D2.canUnlock(unitId, lv);
      return `<button class="diff-tab ${i === 0 ? "on" : ""} ${unlocked ? "" : "locked"}"
        data-diff="${lv}" title="${unlocked ? label : "完成上一档解锁"}">${label}</button>`;
    }).join("") + `</div>`;
  }

  /* 播放单元动画（当前难度档） */
  function playUnitAnim(courseId, no) {
    const co = (window.QIAO_COURSES || []).find(c => c.id === courseId);
    if (!co) return;
    const u = co.units.find(x => x.no === no);
    if (!u) return;
    const unitId = courseId + "-" + no;
    const mount = document.getElementById("pm_" + unitId);
    if (!mount || !window.QIAO_SCRIPTS || !window.QIAO_PLAYER) { toast("动画引擎未就绪"); return; }
    // 取该单元启动条内的当前难度
    let difficulty = "basic";
    const launch = mount.closest ? mount.closest(".anim-launch") : null;
    const tabGroup = launch ? launch.querySelector(".difficulty-tabs") : document.querySelector(".difficulty-tabs");
    const onTab = tabGroup && tabGroup.querySelector(".diff-tab.on");
    if (onTab && !onTab.classList.contains("locked")) difficulty = onTab.dataset.diff;
    const script = window.QIAO_SCRIPTS.get(u, difficulty, courseId);
    if (!script) { toast("该单元暂无动画脚本"); return; }
    mount.style.display = "block";
    mount.scrollIntoView({ behavior: "smooth", block: "center" });
    const F = window.QIAO_FUN;
    if (F && F.sfx) F.sfx.tap();
    window.QIAO_PLAYER.play(script, {
      stage: mount,
      difficulty,
      onEnd: res => {
        if (!res || res.skipped) return;
        if (window.QIAO_FUNX) {
          const award = window.QIAO_FUNX.awardLessonStars(unitId, res.stars, { difficulty });
          if (award && award.delta > 0) toast("🎬 课时星 +" + award.delta + " ⭐");
        }
        if (window.QIAO_FUN && window.QIAO_FUN.mascot) window.QIAO_FUN.mascot.celebrate();
      }
    });
  }

  /* ============================================================
   * 页面：完整学习动线（course-run）
   * ============================================================ */
  function pageCourseRun(r) {
    const courseId = r.params[0], no = +r.params[1];
    const co = (window.QIAO_COURSES || []).find(c => c.id === courseId);
    const u = co && co.units.find(x => x.no === no);
    if (!co || !u) return { html: `<div class="page"><div class="card">单元不存在</div></div>` };
    const html = `
    <div class="page run-page">
      <a class="back" href="#/course/${courseId}">← 返回课程</a>
      <div class="run-title">${esc(co.name)} · 单元 ${no}：${esc(u.title)}</div>
      <div id="runStage"></div>
    </div>`;
    const mount = () => {
      if (!window.QIAO_RHYTHM) { toast("节奏引擎未就绪"); return; }
      const diff = (r.query && r.query.diff) || "basic";
      const review = !!(r.query && r.query.review);
      window.QIAO_RHYTHM.runUnit(co.id + "-" + no, {
        courseId: co.id,
        difficulty: diff,
        review,
        container: document.getElementById("runStage"),
        onExit: () => R.go("/course/" + courseId)
      });
    };
    return { html, mount };
  }

  /* ============================================================
   * 页面：关卡详情
   * ============================================================ */
  function pageLevel(r) {
    const id = r.params[0];
    let lv, ch;
    CHAPTERS.forEach(c => c.levels.forEach(l => { if (l.id === id) { lv = l; ch = c; } }));
    if (!lv) return { html: `<div class="page"><div class="card">关卡不存在</div></div>` };
    const c = D.CATEGORIES[lv.cat];
    const qs = lv.questionIds.map(qid => QBYID[qid]);
    const preview = qs.slice(0, 3).map(q =>
      `<li class="q-preview">${c.icon} ${esc(q.stem.slice(0, 18))}…</li>`).join("");
    const html = `
    <div class="page">
      <a class="back" href="#/home">← 返回地图</a>
      <div class="card level-detail">
        <div class="ld-emoji">${c.icon}</div>
        <h1 class="ld-title">${esc(lv.title)}</h1>
        <div class="ld-tags"><span class="tag tag-${lv.cat}">${c.name}</span>
          <span class="tag">难度 ${diffStars(lv.diff)}</span>
          <span class="tag">${qs.length} 题</span></div>
        <ul class="ld-preview">${preview}${qs.length > 3 ? `<li class="q-preview more">…还有 ${qs.length - 3} 题</li>` : ""}</ul>
        <button class="btn btn-primary" style="width:100%" id="ld_start">开始闯关 🚀</button>
      </div>
    </div>`;
    const mount = () => document.getElementById("ld_start").addEventListener("click", () => R.go("/practice?level=" + id + "&q=0"));
    return { html, mount };
  }

  /* ============================================================
   * 页面：题库（筛选浏览）
   * ============================================================ */
  let bankFilter = { grade: 0, cat: "", diff: 0 };
  function pageBank(r) {
    if (r && r.query && r.query.cat) bankFilter.cat = r.query.cat;
    const u = S.user;
    const gradeBtns = [0,1,2,3,4,5,6].map(g =>
      `<button class="chip ${bankFilter.grade === g ? "on" : ""}" data-g="${g}">${g === 0 ? "全部" : g + "年级"}</button>`).join("");
    const catBtns = [["", "全部"], ["calc", "🔢计算"], ["geo", "📐图形"], ["logic", "🧩逻辑"], ["word", "📝应用"], ["nt", "🧮数论"]]
      .map(([k, n]) => `<button class="chip ${bankFilter.cat === k ? "on" : ""}" data-c="${k}">${n}</button>`).join("");
    const diffBtns = [0,1,2,3].map(d =>
      `<button class="chip ${bankFilter.diff === d ? "on" : ""}" data-d="${d}">${d === 0 ? "全部" : "★".repeat(d)}</button>`).join("");

    let list = D.QUESTIONS.filter(q =>
      (!bankFilter.grade || q.grade === bankFilter.grade) &&
      (!bankFilter.cat || q.cat === bankFilter.cat) &&
      (!bankFilter.diff || q.diff === bankFilter.diff));
    if (u.grade) list = list.sort((a, b) => Math.abs(a.grade - u.grade) - Math.abs(b.grade - u.grade));
    const items = list.map(q => {
      const c = D.CATEGORIES[q.cat];
      const done = (S.user.levelStars[q.id]); // 单题不记关卡星，仅展示分类
      return `<a class="bank-card" href="#/practice?qid=${q.id}">
        <div class="bank-top"><span class="tag tag-${q.cat}">${c.icon}${c.name}</span>
          <span class="bank-diff">难度 ${diffStars(q.diff)}</span></div>
        <div class="bank-stem">${esc(q.stem)}</div>
        <div class="bank-foot">${q.grade}年级 · 点击练习</div>
      </a>`;
    }).join("");

    const html = `
    <div class="page">
      <h1 class="h1">浅奥题库</h1>
      <div class="filter-group"><div class="filter-label">年级</div><div class="chip-row">${gradeBtns}</div></div>
      <div class="filter-group"><div class="filter-label">分类</div><div class="chip-row">${catBtns}</div></div>
      <div class="filter-group"><div class="filter-label">难度</div><div class="chip-row">${diffBtns}</div></div>
      <div class="bank-count">共 ${list.length} 题</div>
      <div class="bank-list">${items}</div>
    </div>`;
    const mount = () => {
      document.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => { bankFilter.grade = +b.dataset.g; render(); }));
      document.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => { bankFilter.cat = b.dataset.c; render(); }));
      document.querySelectorAll("[data-d]").forEach(b => b.addEventListener("click", () => { bankFilter.diff = +b.dataset.d; render(); }));
    };
    return { html, mount };
  }

  /* ============================================================
   * 页面：闯关作答（核心交互）
   * ============================================================ */
  let session = null;
  function startSession(opt) {
    if (opt.level) {
      let lv; CHAPTERS.forEach(c => c.levels.forEach(l => { if (l.id === opt.level) lv = l; }));
      if (!lv) return R.go("/home");
      session = { qs: lv.questionIds.slice(), idx: 0, correct: 0, levelId: lv.id, single: false, wrongThis: {} };
    } else if (opt.qid) {
      session = { qs: [opt.qid], idx: 0, correct: 0, levelId: null, single: true, wrongThis: {} };
    }
    R.go("/practice?q=" + session.idx);
  }

  function pagePractice(r) {
    const opt = r.query;
    if (!session) {
      if (opt.level) startSession({ level: opt.level });
      else if (opt.qid) startSession({ qid: opt.qid });
      else return { html: `<div class="page"><div class="card">没有可练习的题目</div></div>` };
      return pagePractice(R.parse());
    }
    const qid = session.qs[session.idx];
    const q = QBYID[qid];
    const c = D.CATEGORIES[q.cat];
    const total = session.qs.length;
    const prog = Math.round((session.idx) / total * 100);

    let optsHtml;
    if (q.type === "fill") {
      optsHtml = `<input id="fillInput" class="fill-input" placeholder="在这里写出答案，然后点提交 ✓" />
        <button class="btn btn-primary" style="width:100%" id="fillSubmit">提交答案 ✓</button>`;
    } else if (q.type === "bool") {
      optsHtml = (q.options || []).map(o => `<button class="opt opt-bool" data-opt="${esc(o)}">${esc(o)}</button>`).join("");
    } else {
      optsHtml = (q.options || []).map((o, i) => `<button class="opt" data-opt="${esc(o)}">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join("");
    }

    const html = `
    <div class="page practice">
      <div class="p-bar"><div class="p-bar-fill" style="width:${prog}%"></div></div>
      <div class="p-prog">第 ${session.idx + 1} / ${total} 题 · ${c.icon}${c.name}</div>
      <div class="card q-card">
        <div class="q-stem">${esc(q.stem)}</div>
        <div class="opt-list" id="optList">${optsHtml}</div>
        <div id="fb"></div>
      </div>
    </div>`;

    const mount = () => {
      if (q.type === "fill") {
        const sb = document.getElementById("fillSubmit");
        if (sb) sb.addEventListener("click", () => answer(null, q));
        const inp = document.getElementById("fillInput");
        if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") answer(null, q); });
      } else {
        const list = document.getElementById("optList");
        list.querySelectorAll(".opt").forEach(btn => btn.addEventListener("click", () => answer(btn, q)));
      }
    };
    return { html, mount };
  }

  function norm(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, "").toLowerCase(); }
  function answer(btn, q) {
    const isFill = q.type === "fill";
    const chosen = isFill ? ((document.getElementById("fillInput") || {}).value || "") : btn.dataset.opt;
    const correct = norm(chosen) === norm(q.answer);
    const list = document.getElementById("optList");
    if (!isFill) {
      list.querySelectorAll(".opt").forEach(b => {
        b.disabled = true;
        if (b.dataset.opt === q.answer) b.classList.add("right");
        if (b === btn && !correct) b.classList.add("wrong");
      });
    } else {
      const inp = document.getElementById("fillInput"); if (inp) inp.disabled = true;
      const sb = document.getElementById("fillSubmit"); if (sb) sb.disabled = true;
    }
    const fb = document.getElementById("fb");
    const F = window.QIAO_FUN;
    if (correct) {
      starBurst();
      if (F) { F.sfx.ok(); F.mascot.cheer(); F.confetti(22, false); }
      S.submitAnswer(q, true, { fromWrong: session.wrongThis[q.id] });
      if (!session.wrongThis[q.id]) session.correct++;
      let bonusLine = "";
      if (F) {
        const cb = F.combo.bump();
        if (cb.bonus) { S.award(cb.bonus); bonusLine = `<div class="fb-bonus">🔥 连击 x${cb.count}，奖励 +${cb.bonus}⭐！</div>`; }
      }
      const praise = (F && F.mascot.praiseWord) ? F.mascot.praiseWord() : "答对啦！";
      fb.innerHTML = `<div class="fb-ok">🎉 ${esc(praise)}</div>${bonusLine}
        <button class="btn btn-primary" style="width:100%" id="next">下一题 →</button>`;
    } else {
      session.wrongThis[q.id] = true;
      if (F) { F.sfx.wrong(); F.mascot.encourage(); F.combo.reset(); }
      S.submitAnswer(q, false);
      // 错题复习调度：1/3/7 日间隔入队
      if (window.QIAO_RHYTHM && window.QIAO_RHYTHM.scheduler && window.QIAO_RHYTHM.resolveUnitIdForQ) {
        try {
          const uid = window.QIAO_RHYTHM.resolveUnitIdForQ(q);
          if (uid) window.QIAO_RHYTHM.scheduler.enqueue(uid, q.id);
        } catch (e) {}
      }
      const kp = KBYID[q.kp];
      fb.innerHTML = `<div class="fb-err">再想想～ 正确答案：${esc(q.answer)}</div>
        <div class="explain">
          <div class="explain-h">💡 解析</div>
          <div class="explain-b">${esc(q.explanation)}</div>
          ${kp ? `<div class="kp" id="kp"><div class="explain-h">📺 知识点回放：${esc(kp.title)}</div>
            <div class="explain-b">${esc(kp.replay)}</div>
            <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="master">我懂了，标记掌握 ✓</button></div>` : ""}
        </div>
        <button class="btn btn-secondary" style="width:100%" id="retry">重做本题 🔁</button>
        <button class="btn btn-primary" style="width:100%;margin-top:10px" id="next">下一题 →</button>`;
      const retry = document.getElementById("retry");
      if (retry) retry.addEventListener("click", () => render(R.parse()));
      const master = document.getElementById("master");
      if (master) master.addEventListener("click", () => { S.markKpMastered(q.kp); toast("已标记掌握：" + (kp ? kp.title : "")); });
    }
    const next = document.getElementById("next");
    next.addEventListener("click", () => {
      session.idx++;
      if (session.idx >= session.qs.length) finishSession();
      else R.go("/practice?q=" + session.idx);
    });
  }

  function finishSession() {
    const total = session.qs.length;
    const pct = session.correct / total;
    const earned = pct === 1 ? 3 : pct >= 0.8 ? 2 : pct >= 0.6 ? 1 : 0;
    const levelId = session.levelId;
    const oldLevel = S.user.level;
    if (levelId && earned > 0) S.completeLevel(levelId, earned);
    const newly = S.checkBadges();
    const newLevel = S.user.level;
    const levelUp = newLevel !== oldLevel;
    const wasSingle = session.single;
    session = null;

    const F = window.QIAO_FUN;
    if (F) {
      if (levelUp) { F.confetti(120, true); F.sfx.levelup(); F.mascot.celebrate(); }
      else if (newly.length || earned > 0) { F.confetti(50, false); if (newly.length) F.sfx.levelup(); }
    }

    let badgeLine = newly.length
      ? `<div class="result-badges">🎉 解锁新徽章：${newly.map(b => b.icon + b.name).join("、")}</div>` : "";
    let levelLine = levelUp
      ? `<div class="result-levelup">🎊 升级啦！你现在是「${newLevel}」</div>` : "";
    const html = `
      <div class="modal">
        <div class="result-emoji">${levelUp ? "👑" : earned === 3 ? "🏆" : earned > 0 ? "⭐" : "💪"}</div>
        <h2>${levelUp ? "升级啦！" : earned === 3 ? "完美通关！" : earned > 0 ? "闯关成功！" : "完成练习！"}</h2>
        ${levelLine}
        <div class="result-stars">${stars(earned)}</div>
        <div class="result-pct">正确率 ${Math.round(pct * 100)}%</div>
        ${badgeLine}
        <button class="btn btn-primary" style="width:100%;margin-top:12px" id="r_back">返回地图</button>
        ${wasSingle ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px" id="r_wrong">去看错题本</button>` : ""}
      </div>`;
    const m = modal(html);
    m.querySelector("#r_back").addEventListener("click", () => { m.remove(); R.go(wasSingle ? "/wrong" : "/home"); });
    const rw = m.querySelector("#r_wrong");
    if (rw) rw.addEventListener("click", () => { m.remove(); R.go("/wrong"); });
  }

  /* ============================================================
   * 页面：错题本
   * ============================================================ */
  function pageWrong() {
    const wrong = S.user.wrong || {};
    const ids = Object.keys(wrong);
    if (!ids.length) return { html: `<div class="page"><div class="card empty">🎉 太棒了，暂时没有错题！</div></div>` };
    const items = ids.map(qid => {
      const q = QBYID[qid]; if (!q) return "";
      const c = D.CATEGORIES[q.cat];
      const mastered = S.user.kpMastered.includes(q.kp);
      return `<div class="wrong-card">
        <div class="wrong-top"><span class="tag tag-${q.cat}">${c.icon}${c.name}</span>
          <span class="wrong-times">错 ${wrong[qid].times} 次</span></div>
        <div class="wrong-stem">${esc(q.stem)}</div>
        <div class="wrong-ans">正确答案：${esc(q.answer)}</div>
        <div class="wrong-btns">
          <a class="btn btn-secondary" href="#/practice?qid=${qid}">重做本题 🔁</a>
          <button class="btn btn-ghost" data-rm="${qid}">移出错错本</button>
        </div>
      </div>`;
    }).join("");
    const html = `<div class="page"><h1 class="h1">我的错题本</h1>${items}</div>`;
    const mount = () => document.querySelectorAll("[data-rm]").forEach(b =>
      b.addEventListener("click", () => { S.removeWrong(b.dataset.rm); render(); }));
    return { html, mount };
  }

  /* ============================================================
   * 页面：学情档案
   * ============================================================ */
  function ring(pct) {
    const r = 52, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<svg class="ring" viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="#E3EAF6" stroke-width="12"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--c-primary)" stroke-width="12"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
        transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" class="ring-num">${pct}%</text>
      <text x="60" y="78" text-anchor="middle" class="ring-cap">正确率</text>
    </svg>`;
  }
  function pageProfile() {
    const u = S.user;
    const acc = S.accuracy();
    const cats = ["calc", "geo", "logic", "word", "nt"].map(k => {
      const a = S.catAccuracy(k); const c = D.CATEGORIES[k];
      const weak = a && a < 60;
      return `<div class="stat-row">
        <span class="stat-name">${c.icon}${c.name}</span>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${a}%;background:${weak ? "var(--c-err)" : c.color}"></div></div>
        <span class="stat-pct">${a}%</span></div>`;
    }).join("");
    const weakCats = ["calc", "geo", "logic", "word", "nt"].filter(k => S.catAccuracy(k) && S.catAccuracy(k) < 60)
      .map(k => `<span class="tag" style="background:#FFE9E9;color:var(--c-err)">${D.CATEGORIES[k].icon}需加强</span>`).join("") || `<span class="tag">暂无薄弱点，真棒！</span>`;

    const html = `
    <div class="page">
      <div class="card profile-top">
        <div class="profile-avatar">${u.name ? u.name[0] : "🙂"}</div>
        <div>
          <div class="profile-name">${esc(u.name || "小勇士")}</div>
          <div class="profile-lv">等级：${u.level} · ⭐ ${u.totalStars} · 🔥 ${u.streak}天</div>
          <div class="profile-grade">${u.grade}年级 · 已掌握 ${u.kpMastered.length} 个知识点</div>
        </div>
      </div>
      <div class="card ring-card">${ring(acc)}<div class="ring-side">总体正确率<br><b>${u.stats.correct}/${u.stats.answered}</b> 题</div></div>
      <div class="card">
        <h2 class="h2">分类正确率</h2>
        ${cats}
        <div class="weak-box"><span class="weak-label">薄弱点：</span>${weakCats}</div>
      </div>
      <div class="card parent">
        <h2 class="h2">👪 家长专区</h2>
        <button class="btn btn-ghost" style="width:100%" id="exp">导出学情 JSON</button>
        <button class="btn btn-danger" style="width:100%;margin-top:10px" id="rst">重置全部进度</button>
      </div>
    </div>`;
    const mount = () => {
      document.getElementById("exp").addEventListener("click", () => {
        const blob = new Blob([S.exportJSON()], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = "qiao_learning.json"; a.click(); toast("已导出学情");
      });
      document.getElementById("rst").addEventListener("click", () => {
        const m = modal(`<h2>确定重置？</h2><p>所有星星、关卡、错题都会清空，且无法恢复。</p>
          <button class="btn btn-danger" style="width:100%" id="ok">确定重置</button>
          <button class="btn btn-ghost" style="width:100%;margin-top:8px" id="no">再想想</button>`);
        m.querySelector("#ok").addEventListener("click", () => { m.remove(); S.reset(); location.hash = "#/welcome"; R.go("/welcome"); });
        m.querySelector("#no").addEventListener("click", () => m.remove());
      });
    };
    return { html, mount };
  }
  function modalClosed() {}

  /* ============================================================
   * 页面：成就（徽章墙 + 等级）
   * ============================================================ */
  function pageAchievements() {
    const u = S.user;
    const badges = D.BADGES.map(b => {
      const got = u.badges.includes(b.id);
      return `<div class="badge ${got ? "" : "lock"}">
        <div class="badge-ico">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-cond">${got ? "已解锁 ✓" : b.cond}</div>
      </div>`;
    }).join("");
    const lvIdx = D.LEVELS.findIndex(l => l.key === u.level);
    const next = D.LEVELS[lvIdx + 1];
    const need = next ? Math.max(0, next.need - u.totalStars) : 0;
    const html = `
    <div class="page">
      <div class="card ach-top">
        <div class="ach-lv">${u.level}</div>
        <div class="ach-stars">⭐ ${u.totalStars}</div>
        <div class="ach-next">${next ? "距「" + next.key + "」还差 " + need + " ⭐" : "已是最高等级 👑"}</div>
      </div>
      <h2 class="h2">徽章墙</h2>
      <div class="badge-wall">${badges}</div>
    </div>`;
    return { html };
  }

  /* ---------- 暴露 ---------- */
  window.QIAO_APP = { render };

  /* ---------- 启动 ---------- */
  if (!S.user || !S.user.name) R.go("/welcome");
  else R.render();
})();
