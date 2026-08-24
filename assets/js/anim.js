/* ============================================================
 * 浅奥乐园 · 课程图解引擎 v3（window.QIAO_ANIM）
 * 每个单元生成一张静态图示卡：最终结果图 + 三步解题说明，不再播放动画。
 * 模板返回 3 帧 SVG + 3 条字幕；build 取末帧作插画、字幕作步骤。
 * 用法：QIAO_ANIM.build(unit, courseId) / pick(cat,title,id)
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 调色板（明快、儿童友好） ---------- */
  const C = {
    blue: "#2E6BFF", green: "#16B364", purple: "#8B5CF6",
    orange: "#F97316", sky: "#0EA5E9", pink: "#EC4899",
    yellow: "#F5B50A", ink: "#3A4A66", line: "#D8E0EE", red: "#EF4444",
    cream: "#FFF7E6"
  };

  /* ---------- 解说小宠物（随专题变化） ---------- */
  const MASCOT = {
    calc: "🐤", geo: "🐱", logic: "🦊", word: "🐰", nt: "🐻",
    travel: "🐢", comb: "🐧", think: "🦉"
  };
  function mascotFor(id) { return MASCOT[id] || "🐤"; }

  /* ---------- 小工具 ---------- */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function svg(inner, vb) {
    return `<svg viewBox="${vb || "0 0 320 200"}" class="anim-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }
  function text(x, y, str, color, size, anchor) {
    return `<text class="a-fade" x="${x}" y="${y}" fill="${color || C.ink}" font-size="${size || 16}" text-anchor="${anchor || "start"}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-weight="700">${esc(str)}</text>`;
  }
  /* 会弹入的方块 */
  function pRect(x, y, w, h, rx, fill, delay, stroke, sw) {
    return `<rect class="a-pop" style="animation-delay:${(delay || 0).toFixed(2)}s" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke || "#fff"}" stroke-width="${sw || 2}"/>`;
  }
  /* 会弹入的圆 */
  function pCircle(cx, cy, r, fill, delay, extra) {
    return `<circle class="a-pop" style="animation-delay:${(delay || 0).toFixed(2)}s" cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra || ""}/>`;
  }
  function blocks(n, color, x0, y0, base) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      s += pRect(x0 + col * 26, y0 + row * 26, 22, 22, 5, color, (base || 0) + i * 0.04);
    }
    return s;
  }
  const ARROWDEF = `<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="${C.orange}"/></marker><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.ink}"/></marker></defs>`;
  function arrow(y, x1, x2) {
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.orange}" stroke-width="4" marker-end="url(#ah)"/>`;
  }
  function star(x, y, size, delay) {
    return `<text class="a-spin" style="animation-delay:${(delay || 0).toFixed(2)}s" x="${x}" y="${y}" font-size="${size || 22}" text-anchor="middle">⭐</text>`;
  }
  function turtle(x, y) { return `<text class="a-bob" x="${x}" y="${y}" font-size="22" text-anchor="middle">🐢</text>`; }
  function sparkle(x, y, delay) { return `<text class="a-float" style="animation-delay:${(delay || 0).toFixed(2)}s" x="${x}" y="${y}" font-size="15" text-anchor="middle">✨</text>`; }

  /* ============================================================
   * 14 个动画模板：每个返回 { frames:[svg...], captions:[文字...] }
   * 每帧元素带动画 class，播放时真的动起来。
   * ============================================================ */
  const TEMPLATES = {

    /* 计算：凑十法 / 进位加法 */
    countBlocks(p) {
      p = p || {}; const a = p.a == null ? 9 : p.a, b = p.b == null ? 7 : p.b;
      const sum = a + b;
      return {
        frames: [
          svg(blocks(a, C.blue, 20, 18) + blocks(b, C.green, 20, 92) + text(250, 36, "a=" + a, C.blue) + text(250, 110, "b=" + b, C.green)),
          svg(blocks(a, C.blue, 20, 18) + blocks(b, C.green, 20, 92)
            + `<rect class="a-wob" x="16" y="14" width="216" height="30" rx="8" fill="none" stroke="${C.yellow}" stroke-width="3" stroke-dasharray="6 5"/>`
            + text(248, 34, "凑十", C.yellow)),
          svg(text(160, 95, a + " + " + b + " = " + sum, C.ink, 30, "middle")
            + star(110, 140, 26, 0) + star(160, 150, 30, 0.2) + star(210, 140, 26, 0.4)
            + sparkle(70, 60, 0) + sparkle(250, 70, 0.3) + sparkle(160, 50, 0.6))
        ],
        captions: [
          `先把两堆小方块数清楚：左边 ${a} 个，右边 ${b} 个。`,
          `把 10 个圈成一组（凑十法），算起来更轻松～`,
          `合起来，答案就是 ${sum}！🎉`
        ]
      };
    },

    /* 计算：数轴跳步（加减） */
    numberLine(p) {
      p = p || {}; const a = p.a == null ? 13 : p.a, b = p.b == null ? 5 : p.b;
      const op = p.op === "-" ? "-" : "+";
      const max = op === "-" ? a : a + b;
      const x0 = 20, w = 280, px = v => x0 + (v / max) * w;
      let ticks = "";
      for (let v = 0; v <= max; v++)
        ticks += `<line x1="${px(v)}" y1="100" x2="${px(v)}" y2="110" stroke="${C.line}" stroke-width="2"/><text class="a-fade" x="${px(v)}" y="128" text-anchor="middle" font-size="11" fill="${C.ink}">${v}</text>`;
      const res = op === "-" ? a - b : a + b;
      return {
        frames: [
          svg(ARROWDEF + `<line x1="${x0}" y1="100" x2="${x0 + w}" y2="100" stroke="${C.ink}" stroke-width="3"/>` + ticks + turtle(px(0), 92)),
          svg(ARROWDEF + `<line x1="${x0}" y1="100" x2="${x0 + w}" y2="100" stroke="${C.ink}" stroke-width="3"/>` + ticks + arrow(100, px(0), px(a)) + turtle(px(a), 92) + text(px(a), 80, "先跳到 " + a, C.blue, 15, "middle")),
          svg(ARROWDEF + `<line x1="${x0}" y1="100" x2="${x0 + w}" y2="100" stroke="${C.ink}" stroke-width="3"/>` + ticks + arrow(100, px(a), px(res)) + turtle(px(res), 92)
            + text(160, 165, `${a} ${op} ${b} = ${res}`, C.ink, 18, "middle") + star(160, 50, 24, 0))
        ],
        captions: [
          `在数轴上，从 0 出发。`,
          `先向右跳 ${a} 步，停在第 ${a}。`,
          `再跳 ${b} 步，落在 ${res}。这就是答案！`
        ]
      };
    },

    /* 计算：乘法=点阵 */
    arrayGrid(p) {
      p = p || {}; const rows = p.rows == null ? 3 : p.rows, cols = p.cols == null ? 4 : p.cols;
      const prod = rows * cols;
      const dots = (hi) => {
        let d = "";
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const hl = r === hi;
          d += pCircle(60 + c * 40, 50 + r * 40, 12, hl ? C.green : C.blue, (r * cols + c) * 0.03, hl ? ` stroke="${C.yellow}" stroke-width="3"` : "");
        }
        return d;
      };
      return {
        frames: [
          svg(dots(-1) + text(160, 178, `每行 ${cols} 个，共 ${rows} 行`, C.ink, 15, "middle")),
          svg(dots(0) + text(160, 178, "先看一排有几个", C.green, 15, "middle")),
          svg(dots(-1) + text(160, 178, `行 × 列 = ${rows} × ${cols} = ${prod}`, C.orange, 16, "middle") + star(160, 40, 26, 0))
        ],
        captions: [
          `乘法就是「几行几列」的点阵。`,
          `一行有 ${cols} 个，先数清楚一行。`,
          `一共 ${rows} 行，所以 ${rows} × ${cols} = ${prod}。`
        ]
      };
    },

    /* 图形：认识图形 / 数边 */
    shapeSort(p) {
      const sq = pRect(40, 55, 60, 60, 6, C.blue, 0);
      const ci = pCircle(170, 85, 32, C.green, 0.1);
      const tr = `<polygon class="a-pop" style="animation-delay:.2s" points="250,50 220,115 280,115" fill="${C.orange}"/>`;
      return {
        frames: [
          svg(sq + ci + tr + text(70, 142, "正方形", C.ink, 14, "middle") + text(170, 142, "圆", C.ink, 14, "middle") + text(250, 142, "三角形", C.ink, 14, "middle")),
          svg(sq + ci + tr + `<rect class="a-wob" x="36" y="51" width="68" height="68" rx="8" fill="none" stroke="${C.yellow}" stroke-width="3"/>` + text(70, 142, "4 条直边", C.yellow, 14, "middle")),
          svg(sq + ci + tr + `<polygon class="a-wob" points="250,50 220,115 280,115" fill="none" stroke="${C.yellow}" stroke-width="3"/>` + text(250, 142, "3 条直边", C.yellow, 14, "middle") + star(160, 168, 22, 0))
        ],
        captions: [
          "图形王国里有正方形、圆、三角形。",
          "正方形有 4 条直直的边、4 个角。",
          "三角形有 3 条直边。数边数，就能认出图形！"
        ]
      };
    },

    /* 图形：轴对称 / 对折 */
    foldSymmetry(p) {
      const left = `<path class="a-wob" d="M160 40 C120 50 120 110 160 132" fill="none" stroke="${C.purple}" stroke-width="6" stroke-linecap="round"/>`;
      const right = `<path class="a-pop" style="animation-delay:.25s" d="M160 40 C200 50 200 110 160 132" fill="none" stroke="${C.purple}" stroke-width="6" stroke-linecap="round"/>`;
      return {
        frames: [
          svg(`<line x1="160" y1="28" x2="160" y2="150" stroke="${C.line}" stroke-width="2" stroke-dasharray="6 5"/>` + left + right + text(160, 178, "沿着虚线对折", C.ink, 14, "middle")),
          svg(`<line x1="160" y1="28" x2="160" y2="150" stroke="${C.line}" stroke-width="2" stroke-dasharray="6 5"/>` + left),
          svg(`<line x1="160" y1="28" x2="160" y2="150" stroke="${C.line}" stroke-width="2" stroke-dasharray="6 5"/>` + left + right
            + `<path class="a-pop" style="animation-delay:.3s" d="M160 40 C120 50 120 110 160 132 C200 110 200 50 160 40 Z" fill="${C.pink}" opacity="0.25"/>`
            + star(160, 165, 22, 0))
        ],
        captions: [
          "对称图形：能沿着一条线对折。",
          "先把左半边画出来。",
          "右半边和左半边一模一样、能重合——这就是轴对称！"
        ]
      };
    },

    /* 应用：条形图（新加坡建模法） */
    barModel(p) {
      p = p || {}; const a = (p.parts && p.parts[0]) == null ? 3 : (p.parts && p.parts[0]);
      const b = (p.parts && p.parts[1]) == null ? 5 : (p.parts && p.parts[1]);
      const whole = a + b, uw = 22, y1 = 70, y2 = 122;
      const ba = pRect(40, y1, a * uw, 30, 6, C.blue, 0) + text(40 + a * uw / 2, y1 + 20, a, "#fff", 15, "middle");
      const bb = pRect(40 + a * uw + 10, y1, b * uw, 30, 6, C.green, 0.1) + text(40 + a * uw + 10 + b * uw / 2, y1 + 20, b, "#fff", 15, "middle");
      const wholeBar = pRect(40, y2, whole * uw, 30, 6, C.orange, 0.2) + text(40 + whole * uw / 2, y2 + 20, whole, "#fff", 15, "middle");
      return {
        frames: [
          svg(ba + bb + text(160, 42, "一部分 + 一部分", C.ink, 15, "middle")),
          svg(ba + `<rect class="a-wob" x="${40 + a * uw}" y="${y1}" width="10" height="30" fill="${C.line}"/>` + bb + text(160, 42, "把它们拼起来", C.ink, 15, "middle")),
          svg(wholeBar + text(160, 42, `合起来 = ${a} + ${b} = ${whole}`, C.orange, 15, "middle") + star(160, 168, 22, 0))
        ],
        captions: [
          "应用题常用条形图：蓝色是一部分，绿色是另一部分。",
          "把两部分拼在一起。",
          `总共就是 ${whole}。画图一看就明白！`
        ]
      };
    },

    /* 逻辑：找规律 */
    sequence(p) {
      const dots = [2, 4, 6, 8, 10];
      const row = dots.map((d, i) => `<circle class="a-pop" style="animation-delay:${(i * 0.08).toFixed(2)}s" cx="${40 + i * 58}" cy="100" r="${d / 2 + 4}" fill="${i % 2 ? C.green : C.blue}"/>`).join("");
      const ring = `<circle class="a-blink" cx="${40 + 4 * 58}" cy="100" r="${dots[4] / 2 + 10}" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
      return {
        frames: [
          svg(row + text(160, 165, "每次多 2 个", C.ink, 15, "middle")),
          svg(row + ring + text(160, 165, "看规律：越来越大", C.ink, 15, "middle")),
          svg(row + ring + text(298, 100, "下个→12", C.yellow, 14, "end") + star(160, 45, 22, 0))
        ],
        captions: [
          "图形一排排变大。",
          "每次都比前一个多 2 个——这就是规律。",
          "按规律，下一个应该是 12 个！"
        ]
      };
    },

    /* 逻辑：找不同 */
    oddOneOut(p) {
      const s = [
        pRect(30, 70, 50, 50, 8, C.blue, 0),
        pRect(100, 70, 50, 50, 8, C.green, 0.08),
        `<circle class="a-pop" style="animation-delay:.16s" cx="200" cy="95" r="28" fill="${C.orange}"/>`,
        pRect(250, 70, 50, 50, 8, C.purple, 0.24)
      ].join("");
      return {
        frames: [
          svg(s),
          svg(s + `<circle class="a-blink" cx="200" cy="95" r="40" fill="none" stroke="${C.red}" stroke-width="3"/>`),
          svg(s + `<circle class="a-blink" cx="200" cy="95" r="40" fill="none" stroke="${C.red}" stroke-width="3"/>` + text(200, 152, "它是圆的，不一样！", C.red, 14, "middle") + star(200, 40, 22, 0))
        ],
        captions: [
          "四个图形里，有三个长得像。",
          "圈出那个不一样的。",
          "圆形没有方角，它就是「odd one out」！"
        ]
      };
    },

    /* 数论：奇偶性 */
    parityColor(p) {
      p = p || {}; const n = p.n == null ? 10 : p.n;
      let cells = "", hl = "";
      for (let i = 1; i <= n; i++) {
        const idx = i - 1, col = idx % 5, row = Math.floor(idx / 5);
        const even = i % 2 === 0;
        cells += pRect(30 + col * 55, 40 + row * 55, 46, 46, 8, even ? C.blue : C.pink, i * 0.03)
          + text(30 + col * 55 + 23, 40 + row * 55 + 30, i, "#fff", 15, "middle");
      }
      for (let i = 2; i <= n; i += 2) {
        const idx = i - 1, col = idx % 5, row = Math.floor(idx / 5);
        hl += `<rect class="a-blink" x="${30 + col * 55 - 2}" y="${40 + row * 55 - 2}" width="50" height="50" rx="9" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
      }
      return {
        frames: [
          svg(cells + text(160, 188, "数一数：1 到 " + n, C.ink, 14, "middle")),
          svg(cells + hl + text(160, 188, "蓝色是双数(偶数)，能两两配对", C.blue, 14, "middle")),
          svg(cells + hl + text(160, 188, "粉色是单数(奇数)，会多出一个", C.pink, 14, "middle") + star(160, 22, 20, 0))
        ],
        captions: [
          `把 1 到 ${n} 排好。`,
          "蓝色的是双数：两个一对，正好分完。",
          "粉色的是单数：分完会多 1 个——奇偶一眼看出！"
        ]
      };
    },

    /* 数论：整除与余数 */
    divisible(p) {
      p = p || {}; const n = p.n == null ? 14 : p.n, k = p.k == null ? 4 : p.k;
      const groups = Math.floor(n / k), r = n % k;
      let dots = "";
      for (let g = 0; g < groups; g++) for (let i = 0; i < k; i++)
        dots += pCircle(40 + (i % k) * 26, 50 + (g % 3) * 32, 9, C.green, (g * k + i) * 0.03);
      for (let i = 0; i < r; i++)
        dots += pCircle(40 + i * 26, 50 + groups * 32, 9, C.orange, (groups * k + i) * 0.03);
      return {
        frames: [
          svg(dots + text(160, 188, n + " 个圆圈，每 " + k + " 个圈一组", C.ink, 14, "middle")),
          svg(dots + `<rect class="a-wob" x="34" y="44" width="${k * 26}" height="24" rx="8" fill="none" stroke="${C.yellow}" stroke-width="3" stroke-dasharray="5 4"/>` + text(160, 188, "每组 " + k + " 个", C.yellow, 14, "middle")),
          svg(dots + text(160, 188, `分成 ${groups} 组，还剩 ${r} 个 → 余 ${r}`, C.orange, 14, "middle") + star(160, 22, 20, 0))
        ],
        captions: [
          `${n} 个小圆圈，要每 ${k} 个分一组。`,
          "用虚线把每组圈起来。",
          `能分 ${groups} 组，剩下 ${r} 个，所以 ${n} ÷ ${k} 余 ${r}。`
        ]
      };
    },

    /* 行程：相遇问题 */
    twoCars(p) {
      const road = `<line x1="30" y1="120" x2="290" y2="120" stroke="${C.line}" stroke-width="4"/>`;
      const carL = x => `<text class="a-run" x="${x}" y="100" font-size="26" text-anchor="middle">🚗</text>`;
      const carR = x => `<text class="a-run" x="${x}" y="100" font-size="26" text-anchor="middle">🚙</text>`;
      return {
        frames: [
          svg(road + carL(60) + carR(260) + text(160, 160, "两辆车分别出发", C.ink, 14, "middle")),
          svg(road + carL(130) + carR(190) + text(160, 160, "面对面开过来", C.ink, 14, "middle")),
          svg(road + `<text class="a-pop" style="animation-delay:.1s" x="160" y="100" font-size="24" text-anchor="middle">💥</text>` + text(160, 160, "在中间相遇啦！", C.orange, 14, "middle") + star(110, 60, 24, 0) + star(210, 60, 24, 0.2))
        ],
        captions: [
          "小明和小红从两头同时出发。",
          "两个人面对面走，越走越近。",
          "走到中间「相遇」——相遇时两人走的总路程就是全长！"
        ]
      };
    },

    /* 组合计数：加法/乘法原理（分支图） */
    treeBranch(p) {
      const node = (x, y, l, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="${y}" r="14" fill="${C.blue}"/>` + text(x, y + 5, l, "#fff", 14, "middle");
      const ln = (x1, y1, x2, y2, d) => `<line class="a-fade" style="animation-delay:${(d || 0).toFixed(2)}s" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.line}" stroke-width="2"/>`;
      return {
        frames: [
          svg(node(160, 40, "开", 0) + text(160, 185, "做一件事有几种选法？", C.ink, 14, "middle")),
          svg(node(160, 40, "开", 0) + ln(160, 54, 90, 100, .1) + ln(160, 54, 230, 100, .1) + node(90, 110, "A", .25) + node(230, 110, "B", .35)),
          svg(node(160, 40, "开", 0) + ln(160, 54, 90, 100, .1) + ln(160, 54, 230, 100, .1) + node(90, 110, "A", .25) + node(230, 110, "B", .35)
            + ln(90, 124, 60, 162, .5) + ln(90, 124, 120, 162, .55) + ln(230, 124, 200, 162, .5) + ln(230, 124, 260, 162, .55)
            + `<circle class="a-pop" style="animation-delay:.6s" cx="60" cy="170" r="10" fill="${C.green}"/><circle class="a-pop" style="animation-delay:.66s" cx="120" cy="170" r="10" fill="${C.green}"/><circle class="a-pop" style="animation-delay:.72s" cx="200" cy="170" r="10" fill="${C.green}"/><circle class="a-pop" style="animation-delay:.78s" cx="260" cy="170" r="10" fill="${C.green}"/>`
            + text(160, 192, "分支越多，方法越多", C.ink, 14, "middle") + star(160, 24, 20, 0))
        ],
        captions: [
          "遇到「有几种方法」的问题。",
          "第一步有 A、B 两种选法。",
          "每一步都把分支画出来，最后数一数所有终点，就是总数！"
        ]
      };
    },

    /* 综合思想：倒推法 */
    reverseArrow(p) {
      const box = (x, l, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="80" width="50" height="40" rx="8" fill="${C.purple}"/><text class="a-fade" x="${x + 25}" y="105" text-anchor="middle" fill="#fff" font-size="16" font-weight="700">${l}</text>`;
      const a1 = `<line class="a-fade" x1="80" y1="100" x2="110" y2="100" stroke="${C.ink}" stroke-width="3" marker-end="url(#ar)"/>`;
      const a2 = `<line class="a-fade" x1="160" y1="100" x2="190" y2="100" stroke="${C.ink}" stroke-width="3" marker-end="url(#ar)"/>`;
      return {
        frames: [
          svg(ARROWDEF + box(30, "?", .1) + a1 + box(110, "?", .2) + a2 + box(190, "24", .3) + text(160, 160, "已知最后结果是 24", C.ink, 14, "middle")),
          svg(ARROWDEF + box(30, "?", .1) + a1 + box(110, "12", .2) + a2 + box(190, "24", .3) + text(160, 160, "往前推：24 ÷ 2 = 12", C.green, 14, "middle")),
          svg(ARROWDEF + box(30, "6", .1) + a1 + box(110, "12", .2) + a2 + box(190, "24", .3) + text(160, 160, "再往前：12 ÷ 2 = 6，原来就是 6！", C.orange, 13, "middle") + star(160, 50, 22, 0))
        ],
        captions: [
          "有些题只告诉最后结果 24。",
          "用「倒推法」：从结果往回算，24 ÷ 2 = 12。",
          "再倒一步：12 ÷ 2 = 6，一开始就是 6！"
        ]
      };
    },

    /* 综合思想：画图法 */
    drawDiagram(p) {
      const kid = (x, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="80" r="12" fill="${C.blue}"/><rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x - 10}" y="94" width="20" height="30" rx="6" fill="${C.green}"/>`;
      return {
        frames: [
          svg(kid(70, 0) + kid(130, .1) + kid(190, .2) + kid(250, .3) + text(160, 160, "队伍里站成一排", C.ink, 14, "middle")),
          svg(kid(70, 0) + kid(130, .1) + kid(190, .2) + kid(250, .3) + `<rect class="a-wob" x="58" y="60" width="84" height="70" rx="8" fill="none" stroke="${C.yellow}" stroke-width="3"/>` + text(160, 160, "圈出从左边数前 3 个", C.yellow, 13, "middle")),
          svg(kid(70, 0) + kid(130, .1) + kid(190, .2) + kid(250, .3) + `<rect class="a-wob" x="58" y="60" width="84" height="70" rx="8" fill="none" stroke="${C.yellow}" stroke-width="3"/>` + text(160, 160, "画成图，数量一眼就清", C.ink, 14, "middle") + star(160, 45, 22, 0))
        ],
        captions: [
          "排队问题，先画出小朋友。",
          "题目问前 3 个，就把他们圈出来。",
          "把题目画成图，关系就清楚啦！"
        ]
      };
    }
  ,

  /* 图形：七巧板拼图 */
  tangram(p) {
    const sq = `<polygon class="a-pop" points="30,100 110,20 190,100 110,180" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`;
    const lines = `<line x1="110" y1="20" x2="110" y2="180" stroke="${C.line}" stroke-width="2"/>` +
      `<line x1="30" y1="100" x2="190" y2="100" stroke="${C.line}" stroke-width="2"/>` +
      `<line x1="110" y1="100" x2="150" y2="140" stroke="${C.line}" stroke-width="2"/>`;
    const fish = `<polygon class="a-pop" style="animation-delay:.2s" points="45,120 95,80 150,120 95,165" fill="${C.orange}" stroke="${C.ink}" stroke-width="2"/>` +
      `<polygon class="a-pop" style="animation-delay:.35s" points="95,80 158,72 150,120" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`;
    return {
      frames: [
        svg(sq + lines + text(110, 196, "七巧板：大方形切成 7 块", C.ink, 14, "middle")),
        svg(fish + text(100, 192, "两块小三角拼出小鱼身体", C.ink, 13, "middle")),
        svg(fish + `<text class="a-float" x="110" y="42" font-size="20" text-anchor="middle">🐟</text>` + text(110, 196, "七巧板能拼出上千种图形！", C.orange, 13, "middle") + star(180, 50, 20, 0))
      ],
      captions: [
        "七巧板把大正方形切成 7 块：5 个三角形、1 个正方形、1 个平行四边形。",
        "拿两块小三角形，就能拼出小鱼的身体。",
        "不同摆法能拼出人、船、动物……发挥想象力吧！"
      ]
    };
  },

  /* 图形：数线段与数角 */
  countSegments(p) {
    const xs = [40, 115, 190, 265];
    const dots = xs.map((x, i) => pCircle(x, 100, 6, C.blue, i * 0.06)).join("");
    const labels = xs.map((x, i) => text(x, 122, (i + 1) + "", C.ink, 12, "middle")).join("");
    const seg = `<line class="a-wob" x1="40" y1="100" x2="190" y2="100" stroke="${C.yellow}" stroke-width="4"/>`;
    const seg2 = `<line class="a-wob" x1="40" y1="100" x2="265" y2="100" stroke="${C.orange}" stroke-width="4"/>`;
    return {
      frames: [
        svg(dots + labels + text(160, 160, "线上有 4 个点", C.ink, 14, "middle")),
        svg(dots + labels + seg + text(110, 80, "选 2 个点连成线段", C.yellow, 13, "middle")),
        svg(dots + labels + seg + seg2 + text(160, 160, "共有 C(4,2)=6 条线段", C.orange, 14, "middle") + star(160, 44, 22, 0))
      ],
      captions: [
        "一条直线上放了 4 个点。",
        "任意选 2 个点，就能连出一条线段。",
        "从 4 个点选 2 个，一共 6 种选法 = 6 条线段！"
      ]
    };
  },

  /* 图形：周长——绕边走一圈 */
  perimeter(p) {
    p = p || {}; const L = p.L == null ? 8 : p.L, W = p.W == null ? 5 : p.W;
    const rect = `<rect class="a-pop" x="50" y="55" width="220" height="100" rx="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`;
    const walk = `<rect class="a-wob" x="50" y="55" width="220" height="100" rx="6" fill="none" stroke="${C.yellow}" stroke-width="4" stroke-dasharray="8 6"/>`;
    return {
      frames: [
        svg(rect + text(160, 178, "一个长方形", C.ink, 14, "middle")),
        svg(rect + walk + text(160, 178, "周长 = 沿着四边走一圈", C.yellow, 14, "middle")),
        svg(rect + walk + text(160, 178, `(长+宽)×2 = (${L}+${W})×2 = ${(L + W) * 2}`, C.orange, 14, "middle") + star(160, 40, 22, 0))
      ],
      captions: [
        "这是长方形，有两条长、两条宽。",
        "周长就是把四条边的长度加起来，像沿着边走一圈。",
        `公式：(长+宽)×2。长 ${L} 宽 ${W}，周长就是 (${L}+${W})×2 = ${(L + W) * 2}！`
      ]
    };
  },

  /* 图形：数正方形（网格） */
  squareCount(p) {
    let g = "";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      g += pRect(50 + c * 60, 30 + r * 55, 52, 48, 5, C.blue, (r * 3 + c) * 0.03);
    const big = `<rect class="a-wob" x="46" y="26" width="172" height="160" rx="7" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
    return {
      frames: [
        svg(g + text(160, 194, "3×3 网格：先数最小的 9 个", C.ink, 13, "middle")),
        svg(g + big + text(160, 194, "再圈出 2×2 的大正方形", C.yellow, 13, "middle")),
        svg(g + big + text(160, 194, "分类数：1²+2²+3² = 14 个", C.orange, 13, "middle") + star(230, 38, 20, 0))
      ],
      captions: [
        "网格里最小的正方形先数：3×3 = 9 个。",
        "再圈出由 4 个小格拼成的 2×2 大正方形。",
        "按边长分类：1×1、2×2、3×3，一共 1²+2²+3² = 14 个！"
      ]
    };
  },

  /* 图形：面积——铺小方格 */
  area(p) {
    p = p || {}; const cols = p.cols == null ? 6 : p.cols, rows = p.rows == null ? 3 : p.rows;
    const frame = pRect(28, 36, cols * 42 + 4, rows * 34 + 4, 6, C.cream, 0, C.ink, 2);
    const cells = () => {
      let d = "";
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        d += pRect(30 + c * 42, 38 + r * 34, 38, 30, 4, C.green, (r * cols + c) * 0.02);
      return d;
    };
    return {
      frames: [
        svg(frame + text(160, 186, "一个长方形", C.ink, 14, "middle")),
        svg(cells() + text(160, 186, "在里面铺满小方格", C.green, 14, "middle")),
        svg(cells() + text(160, 186, `长×宽 = ${cols} × ${rows} = ${cols * rows} 格`, C.orange, 14, "middle") + star(160, 28, 22, 0))
      ],
      captions: [
        "面积就是图形占了多少「地面」。",
        "在长方形里铺满一样大的小方格。",
        `横着 ${cols} 格、竖着 ${rows} 格，长×宽 = ${cols}×${rows} = ${cols * rows} 格！`
      ]
    };
  },

  /* 图形：剪拼与火柴棒 */
  cutPuzzle(p) {
    const L = `<path class="a-pop" d="M40 60 H200 V120 H120 V165 H40 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`;
    const move = `<path class="a-wob" d="M120 120 H200 V165 H120 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="2"/>`;
    const rect = `<rect class="a-pop" style="animation-delay:.3s" x="40" y="60" width="160" height="105" rx="4" fill="${C.orange}" stroke="${C.ink}" stroke-width="2" opacity="0.55"/>`;
    return {
      frames: [
        svg(L + text(160, 190, "一个 L 形（缺了角的方块）", C.ink, 13, "middle")),
        svg(L + move + text(160, 190, "把这一块剪下、挪一挪", C.orange, 13, "middle")),
        svg(rect + text(160, 190, "拼一拼，变规整长方形！", C.green, 13, "middle") + star(225, 42, 20, 0))
      ],
      captions: [
        "图形剪拼：把一个不规则形，剪成几块再拼成规则形。",
        "把缺角那块剪下来，平移到缺口处。",
        "重拼后正好是长方形——面积不变，形状更整齐！"
      ]
    };
  },

  /* 图形：格点多边形（皮克定理） */
  pickGrid(p) {
    let dots = "";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
      dots += pCircle(50 + c * 55, 40 + r * 45, 3, C.line, 0);
    const tri = `<polygon class="a-pop" points="50,130 160,40 215,130" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`;
    const inner = `<circle class="a-blink" cx="130" cy="105" r="9" fill="none" stroke="${C.red}" stroke-width="3"/>`;
    return {
      frames: [
        svg(dots + tri + text(160, 182, "格点上的三角形", C.ink, 13, "middle")),
        svg(dots + tri + inner + text(160, 182, "内部点 I=1，边界点 B=6", C.red, 13, "middle")),
        svg(dots + tri + inner + text(160, 182, "面积 = I + B/2 - 1 = 3", C.orange, 13, "middle") + star(160, 26, 20, 0))
      ],
      captions: [
        "顶点都落在格点上的多边形，叫格点多边形。",
        "数一数：内部点 I=1，边上的点 B=6。",
        "皮克定理：面积 = I + B/2 - 1 = 1 + 3 - 1 = 3！"
      ]
    };
  },

  /* 图形：立体图形（正方体/长方体） */
  solid(p) {
    const cube = `<polygon class="a-pop" points="115,40 195,70 195,150 115,120" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>` +
      `<polygon class="a-pop" style="animation-delay:.15s" points="65,70 115,40 115,120 65,150" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>` +
      `<polygon class="a-pop" style="animation-delay:.3s" points="65,70 195,70 195,150 65,150" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`;
    let grid = "";
    for (let k = 0; k < 3; k++)
      grid += `<rect class="a-pop" style="animation-delay:${(k * 0.15).toFixed(2)}s" x="${75 + k * 30}" y="${82 + k * 18}" width="28" height="26" rx="3" fill="${C.purple}" stroke="#fff" stroke-width="1.5"/>`;
    return {
      frames: [
        svg(cube + text(130, 182, "立体图形有长、宽、高", C.ink, 13, "middle")),
        svg(cube + grid + text(130, 182, "数一数：2×2×2 = 8 个小方块", C.purple, 13, "middle")),
        svg(cube + grid + text(130, 182, "表面积 = 每个面都算上", C.orange, 13, "middle") + star(165, 32, 20, 0))
      ],
      captions: [
        "立体图形不像平面只有长和宽，还有高——是「胖」的。",
        "数一数：2 长 2 宽 2 高，一共 2×2×2 = 8 个小方块。",
        "表面积要把露在外面的每个小面都加起来算！"
      ]
    };
  }

  ,

  /* 逻辑：比较高矮 / 快慢 */
  compareTall(p) {
    const kid = (x, h, c, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x - 14}" y="${150 - h}" width="28" height="${h}" rx="8" fill="${c}"/><circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="${150 - h - 14}" r="14" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    const hi = `<rect class="a-wob" x="20" y="${150 - 100 - 22}" width="60" height="${100 + 30}" rx="10" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
    return {
      frames: [
        svg(kid(60, 70, C.blue, 0) + kid(120, 100, C.green, 0.1) + kid(180, 50, C.orange, 0.2) + kid(245, 85, C.purple, 0.3) + text(160, 184, "三个小朋友，谁最高？", C.ink, 14, "middle")),
        svg(kid(60, 70, C.blue, 0) + kid(120, 100, C.green, 0.1) + kid(180, 50, C.orange, 0.2) + kid(245, 85, C.purple, 0.3) + hi + text(120, 184, "绿色最高！", C.green, 14, "middle")),
        svg(kid(60, 70, C.blue, 0) + kid(120, 100, C.green, 0.1) + kid(180, 50, C.orange, 0.2) + kid(245, 85, C.purple, 0.3) + hi + text(120, 184, "把头顶对齐比一比就清楚", C.orange, 13, "middle") + star(120, 40, 22, 0))
      ],
      captions: ["三个小朋友站成一排，个子不一样高。", "把头顶放在同一条线上比一比。", "绿色小朋友最高，比出来啦！"]
    };
  },

  /* 逻辑：排队问题（第几个） */
  queue(p) {
    const k = (x, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="80" r="12" fill="${C.blue}"/><rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x - 10}" y="94" width="20" height="34" rx="6" fill="${C.green}"/>`;
    const ring = `<rect class="a-wob" x="98" y="60" width="84" height="78" rx="10" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
    const labels = [60, 120, 180, 240].map((x, i) => text(x, 152, (i + 1) + "", C.ink, 12, "middle")).join("");
    return {
      frames: [
        svg(k(60, 0) + k(120, .1) + k(180, .2) + k(240, .3) + labels + text(160, 186, "一排 4 人，从左边数", C.ink, 14, "middle")),
        svg(k(60, 0) + k(120, .1) + k(180, .2) + k(240, .3) + labels + ring + text(160, 186, "第 3 个被圈出来", C.yellow, 14, "middle")),
        svg(k(60, 0) + k(120, .1) + k(180, .2) + k(240, .3) + labels + ring + text(160, 186, "画图数位置，排队不再乱", C.orange, 13, "middle") + star(180, 40, 22, 0))
      ],
      captions: ["队伍里站成一排小朋友。", "题目问「第 3 个」，就把他圈出来。", "画成图、标上号，前后左右一眼清！"]
    };
  },

  /* 逻辑：等量代换（天平） */
  balance(p) {
    const pan = (cx, y) => `<line x1="${cx - 50}" y1="${y}" x2="${cx + 50}" y2="${y}" stroke="${C.ink}" stroke-width="3"/><line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + 14}" stroke="${C.ink}" stroke-width="3"/>`;
    const beam = `<line x1="100" y1="70" x2="220" y2="70" stroke="${C.ink}" stroke-width="4"/>`;
    const stand = `<line x1="160" y1="70" x2="160" y2="130" stroke="${C.ink}" stroke-width="4"/><line x1="135" y1="130" x2="185" y2="130" stroke="${C.ink}" stroke-width="4"/>`;
    const apple = `<circle class="a-bob" cx="110" cy="55" r="14" fill="${C.red}" stroke="#fff" stroke-width="2"/>`;
    const orng = `<circle class="a-bob" style="animation-delay:.2s" cx="210" cy="55" r="11" fill="${C.orange}" stroke="#fff" stroke-width="2"/><circle class="a-bob" style="animation-delay:.35s" cx="210" cy="30" r="11" fill="${C.orange}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(stand + beam + pan(110, 58) + pan(210, 58) + apple + orng + text(160, 168, "天平两边一样重", C.ink, 14, "middle")),
        svg(stand + beam + pan(110, 58) + pan(210, 58) + apple + orng + text(110, 182, "1 苹果", C.red, 13, "middle") + text(210, 182, "= 2 橘子", C.orange, 13, "middle")),
        svg(stand + beam + pan(110, 58) + pan(210, 58) + apple + orng + text(160, 168, "1 苹果 = 2 橘子，能互相换！", C.orange, 13, "middle") + star(160, 40, 22, 0))
      ],
      captions: ["天平平衡，说明两边一样重。", "左边 1 个苹果，右边 2 个橘子，一样重。", "所以 1 苹果 = 2 橘子，做题时能互相替换！"]
    };
  },

  /* 逻辑：数独（行列不重复） */
  sudoku(p) {
    let g = "";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      g += pRect(55 + c * 70, 40 + r * 48, 64, 42, 6, C.cream, (r * 3 + c) * 0.02, C.line, 2);
    const nums = [[1, "", 3], ["", 2, ""], [3, "", 1]];
    let n = "";
    nums.forEach((row, r) => row.forEach((v, c) => { if (v !== "") n += text(55 + c * 70 + 32, 40 + r * 48 + 30, v, C.ink, 18, "middle"); }));
    const hl = `<rect class="a-wob" x="125" y="88" width="64" height="42" rx="6" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
    return {
      frames: [
        svg(g + n + text(160, 184, "3×3 数独：每行每列不重复", C.ink, 13, "middle")),
        svg(g + n + hl + text(160, 184, "看这一格：行列缺几？", C.yellow, 13, "middle")),
        svg(g + n + hl + text(157, 118, "2", C.green, 18, "middle") + text(160, 184, "推出空格填 2", C.orange, 13, "middle") + star(160, 28, 20, 0))
      ],
      captions: ["数独规则：每行、每列数字不重复。", "盯着一个空格，看它所在的行和列已经有哪些数。", "缺的那个就是答案——这里填 2！"]
    };
  },

  /* 逻辑：一笔画（奇点） */
  euler(p) {
    const node = (x, y, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="${y}" r="10" fill="${C.blue}"/>`;
    const edge = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="3"/>`;
    const g = edge(80, 100, 160, 60) + edge(160, 60, 240, 100) + edge(80, 100, 160, 140) + edge(160, 140, 240, 100) + edge(160, 60, 160, 140);
    const odd = `<circle class="a-blink" cx="80" cy="100" r="14" fill="none" stroke="${C.red}" stroke-width="3"/><circle class="a-blink" cx="240" cy="100" r="14" fill="none" stroke="${C.red}" stroke-width="3"/>`;
    return {
      frames: [
        svg(node(80, 100, 0) + node(160, 60, .1) + node(240, 100, .2) + node(160, 140, .3) + g + text(160, 184, "一个图，能一笔画完吗？", C.ink, 14, "middle")),
        svg(node(80, 100, 0) + node(160, 60, .1) + node(240, 100, .2) + node(160, 140, .3) + g + odd + text(160, 184, "数「奇点」：连奇数条线的点", C.red, 13, "middle")),
        svg(node(80, 100, 0) + node(160, 60, .1) + node(240, 100, .2) + node(160, 140, .3) + g + odd + text(160, 184, "奇点 = 0 或 2 才能一笔画", C.orange, 13, "middle") + star(160, 28, 20, 0))
      ],
      captions: ["一笔画：笔不离开纸、线不重复画完。", "数「奇点」——连着奇数条线的点。", "奇点有 0 个或 2 个，才能一笔画成！"]
    };
  },

  /* 逻辑：抽屉原理（鸽巢） */
  pigeonhole(p) {
    const box = (x, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="90" width="56" height="60" rx="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`;
    const bird = (x, y, d) => `<text class="a-bob" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="${y}" font-size="20" text-anchor="middle">🕊️</text>`;
    return {
      frames: [
        svg(box(50, 0) + box(130, 0.1) + box(210, 0.2) + text(160, 184, "3 个抽屉，放进 4 只鸽子", C.ink, 14, "middle")),
        svg(box(50, 0) + box(130, 0.1) + box(210, 0.2) + bird(78, 80, 0) + bird(158, 80, .1) + bird(238, 80, .2) + bird(110, 66, .3) + text(160, 184, "鸽子一个个飞进去", C.ink, 13, "middle")),
        svg(box(50, 0) + box(130, 0.1) + box(210, 0.2) + bird(78, 80, 0) + bird(158, 80, .1) + bird(238, 80, .2) + bird(110, 66, .3) + text(160, 184, "总有一个抽屉 ≥ 2 只！", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["抽屉原理：东西比抽屉多，必有抽屉装 ≥2。", "4 只鸽子飞进 3 个抽屉。", "所以至少有一个抽屉里有 2 只或更多鸽子！"]
    };
  },

  /* 逻辑：真假话（谁说真话） */
  truthTable(p) {
    const bx = (x, l, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="70" width="90" height="70" rx="8" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(x + 45, 112, l, C.ink, 16, "middle");
    return {
      frames: [
        svg(bx(50, "A盒", 0) + bx(180, "B盒", .1) + text(160, 184, "两盒：一个全真，一个全假", C.ink, 14, "middle")),
        svg(bx(50, "A盒", 0) + bx(180, "B盒", .1) + text(115, 166, "我装糖", C.red, 13, "middle") + text(225, 166, "我装石", C.green, 13, "middle")),
        svg(bx(50, "A盒", 0) + bx(180, "B盒", .1) + text(160, 184, "只有一个说真话，推理出真相", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["真假话题：两盒一个说真话、一个说假话。", "根据「只有一句真」，假设 A 真推出矛盾就换 B。", "用假设法一个个试，就能找出谁在说谎！"]
    };
  }

  ,

  /* 应用：比较多少（一一对应） */
  compareMore(p) {
    const a = (x, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="70" r="12" fill="${C.red}" stroke="#fff" stroke-width="2"/>`;
    const o = (x, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="130" r="12" fill="${C.orange}" stroke="#fff" stroke-width="2"/>`;
    let left = "", right = "";
    for (let i = 0; i < 3; i++) left += a(50 + i * 28, 0);
    for (let i = 0; i < 5; i++) right += o(50 + i * 28, 0.1);
    const link = `<line class="a-wob" x1="50" y1="82" x2="50" y2="118" stroke="${C.line}" stroke-width="2"/>` +
      `<line class="a-wob" x1="106" y1="82" x2="106" y2="118" stroke="${C.line}" stroke-width="2"/>` +
      `<line class="a-wob" x1="162" y1="82" x2="162" y2="118" stroke="${C.line}" stroke-width="2"/>`;
    return {
      frames: [
        svg(left + right + text(100, 40, "3 个苹果", C.red, 14, "middle") + text(130, 165, "5 个橘子", C.orange, 14, "middle")),
        svg(left + right + link + text(130, 185, "一一配对，多出来就算多", C.ink, 13, "middle")),
        svg(left + right + link + text(130, 185, "5 > 3，橘子更多！", C.orange, 14, "middle") + star(200, 60, 22, 0))
      ],
      captions: ["左边 3 个苹果，右边 5 个橘子。", "一个对一个连起来（一一对应）。", "橘子那边多出来，说明 5 比 3 多！"]
    };
  },

  /* 应用：倍数（长条是几份） */
  timesBar(p) {
    p = p || {}; const k = p.k == null ? 3 : p.k;
    const short = `<rect class="a-pop" x="40" y="80" width="40" height="40" rx="6" fill="${C.blue}" stroke="#fff" stroke-width="2"/>`;
    let long = "";
    for (let i = 0; i < k; i++) long += `<rect class="a-pop" style="animation-delay:${(i * 0.12).toFixed(2)}s" x="${100 + i * 44}" y="80" width="40" height="40" rx="6" fill="${C.green}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(short + text(60, 140, "1 份", C.blue, 14, "middle")),
        svg(short + long + text(120 + k * 22, 140, k + " 份连起来", C.green, 13, "middle")),
        svg(short + long + text(160, 52, `绿色是蓝色的 ${k} 倍`, C.orange, 14, "middle") + star(160, 175, 20, 0))
      ],
      captions: ["蓝色是 1 份。", `绿色把这样的 ${k} 份连在一起。`, `所以绿色是蓝色的 ${k} 倍！`]
    };
  },

  /* 应用：和差问题 */
  sumDiff(p) {
    p = p || {}; const sum = p.sum == null ? 18 : p.sum, diff = p.diff == null ? 4 : p.diff;
    const a = (sum + diff) / 2, b = (sum - diff) / 2;
    const ba = `<rect class="a-pop" x="40" y="70" width="${a * 9}" height="34" rx="6" fill="${C.blue}" stroke="#fff" stroke-width="2"/>` + text(40 + a * 9 / 2, 92, a, C.ink, 15, "middle");
    const bb = `<rect class="a-pop" style="animation-delay:.15s" x="40" y="120" width="${b * 9}" height="34" rx="6" fill="${C.green}" stroke="#fff" stroke-width="2"/>` + text(40 + b * 9 / 2, 142, b, C.ink, 15, "middle");
    return {
      frames: [
        svg(ba + bb + text(160, 40, `两数之和 = ${sum}`, C.ink, 14, "middle")),
        svg(ba + bb + text(160, 40, `两数之差 = ${diff}`, C.yellow, 14, "middle")),
        svg(ba + bb + text(160, 178, `大数=(${sum}+${diff})÷2=${a}，小数=${b}`, C.orange, 13, "middle") + star(160, 28, 20, 0))
      ],
      captions: ["知道两数加起来是多少、差多少。", "画两条不一样长的条形。", `大数=(${sum}+${diff})÷2，小数=(${sum}-${diff})÷2，一套公式搞定！`]
    };
  },

  /* 应用：年龄问题（差不变） */
  ageBar(p) {
    const pa = `<rect class="a-pop" x="40" y="60" width="120" height="34" rx="6" fill="${C.blue}" stroke="#fff" stroke-width="2"/>` + text(100, 82, "父 30", C.ink, 14, "middle");
    const so = `<rect class="a-pop" style="animation-delay:.15s" x="40" y="115" width="40" height="34" rx="6" fill="${C.green}" stroke="#fff" stroke-width="2"/>` + text(60, 137, "子 10", C.ink, 14, "middle");
    const gap = `<line class="a-wob" x1="40" y1="100" x2="160" y2="100" stroke="${C.yellow}" stroke-width="2" stroke-dasharray="5 4"/>`;
    return {
      frames: [
        svg(pa + so + text(160, 40, "今年：父 30，子 10", C.ink, 14, "middle")),
        svg(pa + so + gap + text(160, 178, "年龄差永远是 20 岁", C.yellow, 13, "middle")),
        svg(pa + so + gap + text(160, 178, "过几年，差不变只年龄长", C.orange, 13, "middle") + star(160, 28, 20, 0))
      ],
      captions: ["今年爸爸 30 岁，儿子 10 岁。", "用条形比一比，中间虚线是年龄差。", "年龄差永远不变，这是解题关键！"]
    };
  },

  /* 应用：排队问题（画人排队） */
  queueBar(p) {
    const k = (x, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="80" r="12" fill="${C.blue}"/><rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x - 10}" y="94" width="20" height="34" rx="6" fill="${C.green}"/>`;
    const ring = `<rect class="a-wob" x="98" y="58" width="84" height="80" rx="10" fill="none" stroke="${C.yellow}" stroke-width="3"/>`;
    return {
      frames: [
        svg(k(60, 0) + k(120, .1) + k(180, .2) + k(240, .3) + text(160, 184, "一共 4 人排成一队", C.ink, 14, "middle")),
        svg(k(60, 0) + k(120, .1) + k(180, .2) + k(240, .3) + ring + text(160, 184, "小明在第 3 个", C.yellow, 14, "middle")),
        svg(k(60, 0) + k(120, .1) + k(180, .2) + k(240, .3) + ring + text(160, 184, "前面 2 人、后面 1 人", C.orange, 13, "middle") + star(180, 40, 22, 0))
      ],
      captions: ["队伍里站成一排，先数共有几人。", "问「第几个」，从一端开始数到他。", "前面有几人、后面有几人，加减就清楚！"]
    };
  },

  /* 应用：植树问题（间隔 + 1） */
  plant(p) {
    const line = `<line x1="30" y1="110" x2="290" y2="110" stroke="${C.ink}" stroke-width="3"/>`;
    const trees = `<text class="a-pop" x="30" y="100" font-size="22" text-anchor="middle">🌳</text>` +
      `<text class="a-pop" style="animation-delay:.1s" x="90" y="100" font-size="22" text-anchor="middle">🌳</text>` +
      `<text class="a-pop" style="animation-delay:.2s" x="150" y="100" font-size="22" text-anchor="middle">🌳</text>` +
      `<text class="a-pop" style="animation-delay:.3s" x="210" y="100" font-size="22" text-anchor="middle">🌳</text>` +
      `<text class="a-pop" style="animation-delay:.4s" x="270" y="100" font-size="22" text-anchor="middle">🌳</text>`;
    const gaps = `<line class="a-blink" x1="60" y1="120" x2="120" y2="120" stroke="${C.red}" stroke-width="3"/>`;
    return {
      frames: [
        svg(line + trees + text(160, 165, "5 棵树，种在一条路上", C.ink, 14, "middle")),
        svg(line + trees + gaps + text(110, 140, "每段间隔", C.red, 13, "middle") + text(160, 165, "4 个间隔", C.red, 13, "middle")),
        svg(line + trees + gaps + text(160, 165, "棵数 = 间隔 + 1 = 5", C.orange, 14, "middle") + star(160, 40, 22, 0))
      ],
      captions: ["路的一边种树，两端都种。", "树与树之间是「间隔」。", "棵数 = 间隔数 + 1，记住这个！"]
    };
  },

  /* 应用：和倍 / 差倍问题 */
  heBao(p) {
    p = p || {}; const sum = p.sum == null ? 24 : p.sum, k = p.k == null ? 3 : p.k;
    const one = sum / (k + 1);
    let bars = "";
    for (let i = 0; i < k + 1; i++) bars += `<rect class="a-pop" style="animation-delay:${(i * 0.1).toFixed(2)}s" x="${30 + i * 44}" y="70" width="40" height="40" rx="6" fill="${i === 0 ? C.blue : C.green}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(bars + text(160, 40, `两数之和 = ${sum}`, C.ink, 14, "middle")),
        svg(bars + text(160, 140, `小数 1 份，大数是它的 ${k} 倍`, C.green, 13, "middle")),
        svg(bars + text(160, 178, `共 ${k + 1} 份 = ${sum}，1 份 = ${one}`, C.orange, 13, "middle") + star(160, 28, 20, 0))
      ],
      captions: ["和倍：两数之和知道，还知道倍数关系。", `把小数看成 1 份，大数就是 ${k} 份。`, `总共 ${k + 1} 份等于和，1 份 = 和÷(${k} + 1)！`]
    };
  }

  ,

  /* 数论：质数（埃氏筛） */
  primeSieve(p) {
    const ns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    let cells = "", cross = "";
    ns.forEach((n, i) => {
      const x = 20 + (i % 5) * 58, y = 40 + Math.floor(i / 5) * 60;
      const isP = [2, 3, 5, 7, 11].indexOf(n) >= 0;
      cells += `<rect class="a-pop" style="animation-delay:${(i * 0.05).toFixed(2)}s" x="${x}" y="${y}" width="46" height="44" rx="6" fill="${isP ? C.green : C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(x + 23, y + 28, n, C.ink, 15, "middle");
      if (!isP) cross += `<line class="a-blink" x1="${x}" y1="${y}" x2="${x + 46}" y2="${y + 44}" stroke="${C.red}" stroke-width="3"/><line class="a-blink" x1="${x + 46}" y1="${y}" x2="${x}" y2="${y + 44}" stroke="${C.red}" stroke-width="3"/>`;
    });
    return {
      frames: [
        svg(cells + text(160, 178, "2 到 11，哪些是质数？", C.ink, 14, "middle")),
        svg(cells + cross + text(160, 178, "划掉合数（能再分），剩质数", C.red, 13, "middle")),
        svg(cells + cross + text(160, 178, "质数：2,3,5,7,11", C.green, 14, "middle") + star(160, 24, 20, 0))
      ],
      captions: ["质数是只能被 1 和它本身整除的数。", "把合数（能再分解的）一个个划掉。", "剩下的绿色就是质数：2、3、5、7、11！"]
    };
  },

  /* 数论：约数与倍数 */
  factorList(p) {
    p = p || {}; const n = p.n == null ? 12 : p.n;
    const divs = [1, 2, 3, 4, 6, 12].filter(d => d <= n && n % d === 0);
    let cells = "";
    divs.forEach((d, i) => { const x = 24 + i * 48; cells += `<rect class="a-pop" style="animation-delay:${(i * 0.08).toFixed(2)}s" x="${x}" y="60" width="42" height="40" rx="6" fill="${C.blue}" stroke="#fff" stroke-width="2"/>` + text(x + 21, 84, d, C.ink, 15, "middle"); });
    return {
      frames: [
        svg(cells + text(160, 180, `${n} 能被哪些数整除？`, C.ink, 14, "middle")),
        svg(cells + text(160, 180, `${n} 的约数（因数）`, C.blue, 14, "middle")),
        svg(cells + text(160, 180, `几个数公有的最大约数 = 最大公约数`, C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: [`找 ${n} 的约数：能整除 ${n} 的数。`, `这些约数都是 ${n} 的因数。`, "几个数公有的最大约数叫最大公约数，公有最小倍数叫最小公倍数！"]
    };
  },

  /* 数论：完全平方数 */
  squareNum(p) {
    const sq = (n) => { let d = ""; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) d += pRect(60 + c * 30, 55 + r * 30, 26, 26, 4, C.green, (r * n + c) * 0.02); return d; };
    return {
      frames: [
        svg(pRect(60, 55, 26, 26, 4, C.blue, 0) + text(160, 170, "1 = 1×1 = 1²", C.ink, 14, "middle")),
        svg(sq(2) + text(160, 170, "4 = 2×2 = 2²", C.blue, 14, "middle")),
        svg(sq(3) + text(160, 170, "9 = 3×3 = 3²，边长都是整数！", C.green, 14, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["完全平方数 = 某个整数 × 自己。", "1=1×1，4=2×2，都能铺成实心正方形。", "边长正好是整数，这就是完全平方数！"]
    };
  },

  /* 数论：进制（位值） */
  baseConvert(p) {
    const bit = (x, on, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="70" width="44" height="44" rx="6" fill="${on ? C.purple : C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(x + 22, 110, on ? "1" : "0", C.ink, 15, "middle");
    const val = (x, v) => text(x + 22, 52, v, C.orange, 13, "middle");
    return {
      frames: [
        svg(bit(40, 0, 0) + bit(90, 0, .1) + bit(140, 1, .2) + bit(190, 0, .3) + bit(240, 1, .4) + text(160, 172, "二进制：每位是 1、2、4、8…", C.ink, 13, "middle")),
        svg(bit(40, 0, 0) + bit(90, 0, .1) + bit(140, 1, .2) + bit(190, 0, .3) + bit(240, 1, .4) + val(140, "4") + val(240, "1") + text(160, 172, "亮起的一位代表对应权值", C.orange, 13, "middle")),
        svg(bit(40, 0, 0) + bit(90, 0, .1) + bit(140, 1, .2) + bit(190, 0, .3) + bit(240, 1, .4) + val(140, "4") + val(240, "1") + text(160, 172, "101(二) = 4+1 = 5(十)", C.green, 14, "middle") + star(160, 30, 20, 0))
      ],
      captions: ["二进制只有 0 和 1，每位代表 1、2、4、8…", "把亮着的 1 对应的权值加起来。", "所以 101(二进制) = 4+1 = 5(十进制)！"]
    };
  }

  ,

  /* 行程：追及问题 */
  catchUp(p) {
    const road = `<line x1="30" y1="120" x2="290" y2="120" stroke="${C.line}" stroke-width="4"/>`;
    const fast = x => `<text class="a-run" x="${x}" y="100" font-size="26" text-anchor="middle">🚗</text>`;
    const slow = x => `<text class="a-run" x="${x}" y="100" font-size="26" text-anchor="middle">🚙</text>`;
    return {
      frames: [
        svg(road + fast(220) + slow(80) + text(160, 160, "快的在前，慢的在后", C.ink, 14, "middle")),
        svg(road + fast(200) + slow(150) + text(160, 160, "慢的越追越近", C.ink, 14, "middle")),
        svg(road + `<text class="a-pop" style="animation-delay:.1s" x="185" y="100" font-size="24" text-anchor="middle">💥</text>` + text(160, 160, "追上啦！追及时间 = 路程差 ÷ 速度差", C.orange, 13, "middle") + star(110, 60, 24, 0) + star(210, 60, 24, 0.2))
      ],
      captions: ["快的在前面跑，慢的在后面追。", "慢的快、快的慢，距离一点点缩短。", "追上时：追及时间 = 路程差 ÷ 速度差！"]
    };
  },

  /* 行程：火车过桥 */
  trainBridge(p) {
    const bridge = `<rect class="a-pop" x="40" y="120" width="220" height="30" rx="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(150, 140, "桥", C.ink, 14, "middle");
    const train = (x) => `<rect class="a-bob" x="${x}" y="80" width="80" height="30" rx="6" fill="${C.blue}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(bridge + train(20) + text(160, 178, "火车头刚上桥", C.ink, 14, "middle")),
        svg(bridge + train(120) + text(160, 178, "车尾还没下桥", C.ink, 14, "middle")),
        svg(bridge + train(180) + text(160, 178, "总路程 = 车长 + 桥长", C.orange, 14, "middle") + star(160, 50, 22, 0))
      ],
      captions: ["火车过桥：从车头上桥到车尾离桥。", "这段时间里，车头要多走一个车身长。", "所以总路程 = 火车长 + 桥长！"]
    };
  },

  /* 行程：环形跑道 */
  roundTrack(p) {
    const ring = `<circle class="a-pop" cx="160" cy="100" r="70" fill="none" stroke="${C.ink}" stroke-width="4"/>`;
    const a = `<text class="a-run" x="160" y="60" font-size="22" text-anchor="middle">🏃</text>`;
    const b = `<text class="a-run" style="animation-delay:.2s" x="160" y="142" font-size="22" text-anchor="middle">🚶</text>`;
    return {
      frames: [
        svg(ring + a + b + text(160, 186, "同一点出发", C.ink, 14, "middle")),
        svg(ring + a + b + text(160, 186, "同向：快的要多跑一圈才追上", C.yellow, 13, "middle")),
        svg(ring + a + b + text(160, 186, "反向：两人路程和 = 一圈周长", C.orange, 13, "middle") + star(160, 30, 20, 0))
      ],
      captions: ["环形跑道，两人同一点出发。", "同向跑：快的比慢的多跑整整一圈才追上。", "反向跑：相遇时两人路程加起来 = 一圈！"]
    };
  },

  /* 行程：流水行船 */
  boat(p) {
    const wave = `<path d="M20 150 Q60 140 100 150 T180 150 T260 150" fill="none" stroke="${C.sky}" stroke-width="3"/>`;
    const ship = x => `<text class="a-bob" x="${x}" y="120" font-size="26" text-anchor="middle">⛵</text>`;
    return {
      frames: [
        svg(wave + ship(120) + text(160, 178, "静水里船速 = 静水速度", C.ink, 14, "middle")),
        svg(wave + ship(165) + text(160, 178, "顺水：船速 + 水速，更快", C.green, 13, "middle")),
        svg(wave + ship(75) + text(160, 178, "逆水：船速 - 水速，更慢", C.orange, 13, "middle") + star(160, 50, 22, 0))
      ],
      captions: ["船在静水速度叫「静水速度」。", "顺水而下：实际速度 = 静水速度 + 水速。", "逆水而上：实际速度 = 静水速度 - 水速！"]
    };
  },

  /* 行程：钟面问题 */
  clock(p) {
    const face = `<circle class="a-pop" cx="160" cy="100" r="70" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>`;
    let ticks = "";
    for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; const x = 160 + Math.sin(a) * 60, y = 100 - Math.cos(a) * 60; ticks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${C.ink}"/>`; }
    const hour = `<line class="a-bob" x1="160" y1="100" x2="160" y2="60" stroke="${C.blue}" stroke-width="4"/>`;
    const min = `<line class="a-spin" x1="160" y1="100" x2="200" y2="100" stroke="${C.red}" stroke-width="3"/>`;
    return {
      frames: [
        svg(face + ticks + text(160, 100, "12", C.ink, 13, "middle") + text(160, 178, "钟面 12 个大格", C.ink, 14, "middle")),
        svg(face + ticks + hour + min + text(160, 178, "分针走得快，时针走得慢", C.ink, 14, "middle")),
        svg(face + ticks + hour + min + text(160, 178, "分针追时针：每分钟追 5.5°", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["钟面一圈 12 个大格，共 60 分钟。", "分针每分钟走 6°，时针只走 0.5°。", "分针追时针，每分钟拉近 5.5°！"]
    };
  }

  ,

  /* 组合：排列（位置重要） */
  permute(p) {
    const pos = (x, l, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="70" width="44" height="44" rx="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(x + 22, 98, l, C.ink, 18, "middle");
    return {
      frames: [
        svg(pos(40, "", 0) + pos(110, "", .1) + pos(180, "", .2) + text(160, 170, "3 个位置摆人", C.ink, 14, "middle")),
        svg(pos(40, "A", 0) + pos(110, "B", .1) + pos(180, "C", .2) + text(160, 170, "A、B、C 一种排法", C.blue, 14, "middle")),
        svg(pos(40, "C", 0) + pos(110, "A", .1) + pos(180, "B", .2) + text(160, 170, "换顺序算另一种：3! = 6 种", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["排列：从几个人里排成一队，位置很重要。", "A、B、C 这样站是一种排法。", "顺序不同算不同排法，3 人共 3! = 6 种！"]
    };
  },

  /* 组合：组合（选出来，顺序不重要） */
  combine(p) {
    const dot = (x, y, l, d) => `<circle class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" cx="${x}" cy="${y}" r="16" fill="${C.blue}"/>` + text(x, y + 5, l, C.ink, 15, "middle");
    const ln = `<line class="a-wob" x1="60" y1="70" x2="150" y2="120" stroke="${C.yellow}" stroke-width="3"/>`;
    return {
      frames: [
        svg(dot(60, 70, "甲", 0) + dot(150, 70, "乙", .1) + dot(240, 70, "丙", .2) + dot(150, 120, "丁", .3) + text(150, 170, "4 个人，选 2 个", C.ink, 14, "middle")),
        svg(dot(60, 70, "甲", 0) + dot(150, 70, "乙", .1) + dot(240, 70, "丙", .2) + dot(150, 120, "丁", .3) + ln + text(150, 170, "选甲和丁，与选丁和甲一样", C.yellow, 13, "middle")),
        svg(dot(60, 70, "甲", 0) + dot(150, 70, "乙", .1) + dot(240, 70, "丙", .2) + dot(150, 120, "丁", .3) + ln + text(150, 170, "顺序不重要：C(4,2)=6 种", C.orange, 13, "middle") + star(150, 40, 20, 0))
      ],
      captions: ["组合：只选出几个人，谁先谁后无所谓。", "选「甲、丁」和选「丁、甲」是同一组。", "所以组合比排列少算顺序，C(4,2)=6 种！"]
    };
  },

  /* 组合：容斥原理（韦恩图） */
  includeExclude(p) {
    const A = `<circle class="a-pop" cx="120" cy="100" r="55" fill="${C.blue}" opacity="0.35" stroke="${C.ink}" stroke-width="2"/>`;
    const B = `<circle class="a-pop" style="animation-delay:.15s" cx="200" cy="100" r="55" fill="${C.green}" opacity="0.35" stroke="${C.ink}" stroke-width="2"/>`;
    return {
      frames: [
        svg(A + B + text(100, 60, "会 A", C.ink, 14, "middle") + text(220, 60, "会 B", C.ink, 14, "middle")),
        svg(A + B + text(100, 60, "会 A", C.ink, 14, "middle") + text(220, 60, "会 B", C.ink, 14, "middle") + text(160, 100, "都会", C.ink, 13, "middle")),
        svg(A + B + text(160, 170, "|A∪B| = |A| + |B| - |A∩B|", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["容斥：数「会 A 或会 B」的人数。", "两个圈重叠部分是「都会」的，被算了两次。", "减去一次重叠：总数 = |A| + |B| - |A∩B|！"]
    };
  },

  /* 组合：染色问题（相邻不同色） */
  colorMap(p) {
    const r1 = `<rect class="a-pop" x="40" y="60" width="100" height="70" rx="8" fill="${C.red}" stroke="#fff" stroke-width="2"/>`;
    const r2 = `<rect class="a-pop" style="animation-delay:.15s" x="150" y="60" width="100" height="70" rx="8" fill="${C.blue}" stroke="#fff" stroke-width="2"/>`;
    const r3 = `<rect class="a-pop" style="animation-delay:.3s" x="95" y="130" width="100" height="70" rx="8" fill="${C.green}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(r1 + r2 + r3 + text(160, 184, "三块相邻区域", C.ink, 14, "middle")),
        svg(r1 + r2 + r3 + text(160, 184, "相邻区域不能同色", C.yellow, 13, "middle")),
        svg(r1 + r2 + r3 + text(160, 184, "最少用几种颜色？试试看", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["染色：相邻的两块不能涂同一种颜色。", "红块旁边不能红，要换蓝或绿。", "动脑找最少颜色数，这就是染色问题！"]
    };
  },

  /* 组合：标数法（网格最短路） */
  gridPath(p) {
    let g = "";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g += pRect(50 + c * 70, 50 + r * 70, 60, 60, 6, C.cream, (r * 3 + c) * 0.02, C.line, 2);
    const nums = [[1, 1, 1], [1, 2, 3], [1, 3, 6]];
    let n = "";
    nums.forEach((row, r) => row.forEach((v, c) => { n += text(50 + c * 70 + 30, 50 + r * 70 + 34, v, r === 2 ? C.orange : C.ink, 18, "middle"); }));
    return {
      frames: [
        svg(g + text(160, 184, "只能向右、向下走", C.ink, 14, "middle")),
        svg(g + n + text(160, 184, "每个格 = 左边 + 上边", C.yellow, 13, "middle")),
        svg(g + n + text(160, 184, "终点数 6 = 最短路径数", C.orange, 14, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["标数法：从起点到终点，只向右、向下。", "每个格标的数 = 左边格 + 上边格。", "终点标的数，就是最短路径的总数！"]
    };
  }

  ,

  /* 综合：枚举法（不重不漏） */
  enumerate(p) {
    const item = (x, l, d, on) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="60" width="60" height="40" rx="6" fill="${on ? C.green : C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(x + 30, 85, l, C.ink, 15, "middle");
    return {
      frames: [
        svg(item(30, "红", 0, 0) + item(110, "黄", .1, 0) + item(190, "蓝", .2, 0) + text(160, 174, "从 3 色里选 2 色搭配", C.ink, 14, "middle")),
        svg(item(30, "红", 0, 1) + item(110, "黄", .1, 1) + item(190, "蓝", .2, 0) + text(160, 174, "一种种试：红+黄，红+蓝，黄+蓝", C.ink, 13, "middle")),
        svg(item(30, "红", 0, 1) + item(110, "黄", .1, 1) + item(190, "蓝", .2, 1) + text(160, 174, "不重不漏，共 3 种", C.orange, 14, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["枚举：把可能的情况一个个列出来。", "按顺序试：红+黄、红+蓝、黄+蓝。", "不重复、不遗漏，一共 3 种搭配！"]
    };
  },

  /* 综合：假设法（鸡兔同笼） */
  assume(p) {
    const head = `<text class="a-pop" x="90" y="90" font-size="26" text-anchor="middle">🐔</text>` + `<text class="a-pop" style="animation-delay:.1s" x="200" y="90" font-size="26" text-anchor="middle">🐰</text>`;
    const all = `<text class="a-pop" x="90" y="90" font-size="26" text-anchor="middle">🐔</text>` + `<text class="a-pop" style="animation-delay:.1s" x="200" y="90" font-size="26" text-anchor="middle">🐔</text>`;
    return {
      frames: [
        svg(head + text(160, 170, "笼里鸡兔共头，脚若干", C.ink, 14, "middle")),
        svg(all + text(160, 170, "假设全是鸡：每只 2 脚", C.yellow, 13, "middle")),
        svg(head + text(160, 170, "少几脚就换几只兔，凑出来", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["鸡兔同笼：只知道总头数和总脚数。", "假设全是鸡，算出「应有脚数」。", "和实际差几只脚，就说明有几只兔，换着试就出答案！"]
    };
  },

  /* 综合：极端思想（最坏情况） */
  extreme(p) {
    const box = (x, c, d) => `<rect class="a-pop" style="animation-delay:${(d || 0).toFixed(2)}s" x="${x}" y="80" width="50" height="60" rx="6" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(box(40, C.red, 0) + box(110, C.blue, 0.1) + box(180, C.green, 0.2) + box(250, C.yellow, 0.3) + text(160, 174, "4 色球，闭眼摸", C.ink, 14, "middle")),
        svg(box(40, C.red, 0) + box(110, C.blue, 0.1) + box(180, C.green, 0.2) + box(250, C.yellow, 0.3) + text(160, 174, "最坏：前 4 个都不同色", C.red, 13, "middle")),
        svg(box(40, C.red, 0) + box(110, C.blue, 0.1) + box(180, C.green, 0.2) + box(250, C.yellow, 0.3) + text(160, 174, "再摸 1 个，必有两同色：5 个", C.orange, 14, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["极端思想：先想「最坏情况」。", "4 种颜色，前 4 个可能正好各不同。", "再多摸 1 个，一定有两个同色——答案是 5！"]
    };
  },

  /* 计算：等差数列求和（高斯） */
  gauss(p) {
    p = p || {}; const n = p.n == null ? 10 : p.n;
    const pair = n / 2, sum = n * (n + 1) / 2;
    const pairTxt = []; for (let i = 1; i <= pair; i++) pairTxt.push(i + "+" + (n + 1 - i));
    return {
      frames: [
        svg(text(160, 90, "1 + 2 + … + " + n, C.ink, 17, "middle") + text(160, 170, "从 1 加到 " + n, C.ink, 14, "middle")),
        svg(text(160, 90, pairTxt.join("，  "), C.yellow, 14, "middle") + text(160, 170, "首尾配对，每对都是 " + (n + 1), C.yellow, 14, "middle")),
        svg(text(160, 90, "和 = (1+" + n + ")×" + n + "÷2 = " + sum, C.orange, 14, "middle") + text(160, 170, "高斯配对法！", C.orange, 14, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["把 1 到 " + n + " 全部加起来。", "首尾配对：1+" + n + "，2+" + (n - 1) + "…每对和都一样。", "和 = (首项+末项)×项数÷2，一套公式秒算！"]
    };
  },

  /* 计算：定义新运算 */
  defineOp(p) {
    const rule = `<rect class="a-pop" x="40" y="55" width="240" height="40" rx="8" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>` + text(160, 80, "a ⊕ b = a × b + a", C.ink, 15, "middle");
    const calc = `<rect class="a-pop" style="animation-delay:.2s" x="40" y="110" width="240" height="44" rx="8" fill="${C.green}" stroke="#fff" stroke-width="2"/>` + text(160, 138, "3 ⊕ 4 = 3×4 + 3 = 15", C.ink, 15, "middle");
    return {
      frames: [
        svg(rule + text(160, 178, "题目自己定义新符号", C.ink, 14, "middle")),
        svg(rule + calc + text(160, 178, "按它给的规则代进去", C.yellow, 13, "middle")),
        svg(rule + calc + text(160, 178, "别用老习惯，照规则算！", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["定义新运算：题目先规定符号怎么算。", "比如 a⊕b = a×b+a，照着写。", "把数代进去：3⊕4 = 3×4+3 = 15，别按老习惯！"]
    };
  },

  /* 计算：分数初步 */
  fraction(p) {
    const pie = (on) => {
      let d = `<circle class="a-pop" cx="160" cy="100" r="70" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>`;
      for (let i = 0; i < 4; i++) {
        const a0 = i * 90 * Math.PI / 180, a1 = (i + 1) * 90 * Math.PI / 180;
        const x0 = 160 + Math.cos(a0) * 70, y0 = 100 + Math.sin(a0) * 70, x1 = 160 + Math.cos(a1) * 70, y1 = 100 + Math.sin(a1) * 70;
        d += `<path class="${i < on ? 'a-pop' : 'a-fade'}" style="animation-delay:${(i * 0.1).toFixed(2)}s" d="M160 100 L${x0.toFixed(1)} ${y0.toFixed(1)} A70 70 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${C.orange}" opacity="0.5" stroke="${C.ink}" stroke-width="1"/>`;
      }
      return d;
    };
    return {
      frames: [
        svg(pie(0) + text(160, 178, "一个圆分成 4 等份", C.ink, 14, "middle")),
        svg(pie(1) + text(160, 178, "涂 1 份，就是 1/4", C.orange, 14, "middle")),
        svg(pie(2) + text(160, 178, "涂 2 份，就是 2/4 = 1/2", C.green, 14, "middle") + star(160, 40, 20, 0))
      ],
      captions: ["分数表示「整体的一部分」。", "把一个圆平均分成 4 份，取 1 份是 1/4。", "分子是取几份，分母是共几份——分数就来了！"]
    };
  }

  ,

  /* ===== 新增：图形(geo)专题专属模板 ===== */
  gSegAdv(p) {
    p = p || {}; const n = p.points == null ? 6 : p.points;
    let pts = ""; for (let i = 0; i < n; i++) pts += pCircle(40 + i * 44, 100, 6, C.blue, i * 0.05);
    const seg = n * (n - 1) / 2;
    return {
      frames: [
        svg(pts + text(160, 165, n + " 个点在一条线上", C.ink, 14, "middle")),
        svg(ARROWDEF + pts + `<line x1="40" y1="100" x2="${40 + (n - 1) * 44}" y2="100" stroke="${C.orange}" stroke-width="4" marker-end="url(#ah)"/>` + text(160, 165, "两点连成一条线段", C.orange, 13, "middle")),
        svg(pts + text(160, 78, "线段数 = " + n + "×" + (n - 1) + "÷2 = " + seg, C.green, 14, "middle") + star(160, 45, 20, 0))
      ],
      captions: [
        `一条线上有 ${n} 个点。`,
        `任意两个点连成一条线段，按顺序从短到长数。`,
        `线段总数 = ${n}×${n-1}÷2 = ${seg} 条！`
      ]
    };
  },
  gPerimMove(p) {
    p = p || {}; const w = p.w == null ? 6 : p.w, h = p.h == null ? 4 : p.h;
    const P = 2 * (w + h);
    return {
      frames: [
        svg(`<path class="a-pop" d="M40 70 H${40+w*22} V${70+h*22} H${40+(w-2)*22} V${70+(h-1)*22} H40 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + text(160, 178, "凹字形，看着难", C.ink, 13, "middle")),
        svg(`<path class="a-pop" style="animation-delay:.2s" d="M40 70 H${40+w*22} V${70+h*22} H40 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="3"/>` + text(160, 178, "把凹块平移出来", C.green, 13, "middle")),
        svg(`<rect class="a-pop" style="animation-delay:.4s" x="40" y="70" width="${w*22}" height="${h*22}" fill="${C.orange}" stroke="#fff" stroke-width="2" opacity=".5"/>` + text(160, 35, "周长 = (长+" + w + "+宽+" + h + ")×2 = " + P, C.orange, 12, "middle") + star(160, 55, 20, 0))
      ],
      captions: [
        "凹字形看着复杂，其实周长不用算凹进去的。",
        "把凹进去的小块「平移」出去，变成规整长方形。",
        "平移不改变边长，周长 = (长+宽)×2，直接算！"
      ]
    };
  },
  gAreaCut(p) {
    p = p || {}; const w = p.w == null ? 6 : p.w, h = p.h == null ? 4 : p.h;
    const A = w * h;
    return {
      frames: [
        svg(`<polygon class="a-pop" points="40,${70+h*22} 110,70 ${40+w*22},70 ${40+w*22},${70+h*22}" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + text(160, 178, "梯形 / 不规则", C.ink, 13, "middle")),
        svg(`<polygon class="a-pop" points="40,${70+h*22} 110,70 ${40+w*22},70 ${40+w*22},${70+h*22}" fill="${C.green}" stroke="${C.ink}" stroke-width="3"/>` + `<polygon class="a-pop" style="animation-delay:.4s" points="40,${70+h*22} 40,70 110,70" fill="${C.yellow}" stroke="#fff" stroke-width="2"/>` + text(160, 178, "割下一块", C.green, 13, "middle")),
        svg(`<rect class="a-pop" x="40" y="70" width="${w*22}" height="${h*22}" fill="${C.orange}" stroke="#fff" stroke-width="2" opacity=".5"/>` + text(160, 35, "补成 " + w + "×" + h + " = " + A, C.orange, 14, "middle") + star(160, 55, 20, 0))
      ],
      captions: [
        "割补法：把图形「割」下一块，「补」到别处。",
        "割下的三角补到另一边，拼成长方形。",
        "面积不变，直接算长方形 = " + w + "×" + h + " = " + A + "！"
      ]
    };
  },
  gPick(p) {
    p = p || {}; const B = p.n == null ? 16 : p.n, I = Math.max(1, Math.floor(B / 4));
    const A = I + B / 2 - 1;
    return {
      frames: [
        svg(`<polygon class="a-pop" points="40,150 120,45 200,90 260,150 160,170" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + text(160, 188, "格点多边形", C.ink, 13, "middle")),
        svg(`<polygon class="a-pop" points="40,150 120,45 200,90 260,150 160,170" fill="${C.green}" stroke="${C.ink}" stroke-width="3"/>` + text(160, 188, "数边界点 B=" + B, C.green, 13, "middle")),
        svg(`<polygon class="a-pop" points="40,150 120,45 200,90 260,150 160,170" fill="${C.orange}" stroke="#fff" stroke-width="2" opacity=".5"/>` + text(160, 30, "面积 = I + B/2 - 1 = " + A, C.orange, 13, "middle") + star(160, 50, 20, 0))
      ],
      captions: [
        "皮克定理：格点多边形的面积有公式。",
        "先数边界上的格点数 B = " + B + "。",
        "面积 = 内部点 I + 边界点 B÷2 - 1，一套就出！"
      ]
    };
  },
  gSlice(p) {
    p = p || {}; const k = p.pieces == null ? 5 : p.pieces;
    return {
      frames: [
        svg(`<rect class="a-pop" x="40" y="55" width="100" height="100" rx="8" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + text(210, 105, "剪 " + k + " 刀", C.ink, 14, "middle")),
        svg(`<rect class="a-pop" x="40" y="55" width="58" height="100" rx="8" fill="${C.green}" stroke="#fff" stroke-width="2"/>` + `<rect class="a-pop" style="animation-delay:.2s" x="106" y="55" width="44" height="48" rx="6" fill="${C.yellow}" stroke="#fff" stroke-width="2"/>` + `<rect class="a-pop" style="animation-delay:.3s" x="106" y="107" width="44" height="48" rx="6" fill="${C.purple}" stroke="#fff" stroke-width="2"/>`),
        svg(`<rect class="a-pop" x="50" y="55" width="80" height="48" rx="8" fill="${C.orange}" stroke="#fff" stroke-width="2"/>` + `<rect class="a-pop" style="animation-delay:.2s" x="50" y="111" width="80" height="48" rx="8" fill="${C.blue}" stroke="#fff" stroke-width="2"/>` + text(210, 105, "拼成新形", C.orange, 13, "middle") + star(160, 40, 20, 0))
      ],
      captions: [
        "把一个图形剪成几块，总块数不变。",
        "沿着线剪开，得到 " + k + " 块小片。",
        "重新拼一拼变成另一个形状——面积不变！"
      ]
    };
  },
  gMix(p) {
    p = p || {}; const w = p.w == null ? 7 : p.w, h = p.h == null ? 5 : p.h;
    return {
      frames: [
        svg(`<rect class="a-pop" x="50" y="50" width="${w*18}" height="${h*18}" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + text(160, 170, "一个大长方形", C.ink, 13, "middle")),
        svg(`<rect class="a-pop" x="50" y="50" width="${w*18}" height="${h*18}" fill="none" stroke="${C.orange}" stroke-width="6"/>` + text(160, 30, "周长 = (" + w + "+" + h + ")×2 = " + (2*(w+h)), C.orange, 13, "middle")),
        svg(`<rect class="a-pop" x="50" y="50" width="${w*18}" height="${h*18}" fill="${C.green}" stroke="#fff" stroke-width="2" opacity=".5"/>` + text(160, 30, "面积 = " + w + "×" + h + " = " + (w*h), C.green, 14, "middle") + star(160, 95, 22, 0))
      ],
      captions: [
        "同一个图形，周长和面积要分开想。",
        "周长是「外围一圈」长度 = (长+宽)×2。",
        "面积是「里面大小」= 长×宽。两回事哦！"
      ]
    };
  },

  /* ===== 新增：行程(travel)专题专属模板 ===== */
  tMeet(p) {
    p = p || {}; const d = p.d == null ? 120 : p.d, v1 = p.v1 == null ? 30 : p.v1, v2 = p.v2 == null ? 20 : p.v2;
    const t = Math.round(d / (v1 + v2));
    return {
      frames: [
        svg(ARROWDEF + `<line x1="20" y1="120" x2="300" y2="120" stroke="${C.ink}" stroke-width="3"/>` + turtle(40, 110) + turtle(280, 110) + text(160, 150, "相距 " + d + "，相向而行", C.ink, 13, "middle")),
        svg(ARROWDEF + `<line x1="20" y1="120" x2="300" y2="120" stroke="${C.ink}" stroke-width="3"/>` + arrow(120, 40, 130) + arrow(120, 280, 190) + text(160, 150, "速度和 = " + (v1+v2), C.orange, 13, "middle")),
        svg(ARROWDEF + `<line x1="20" y1="120" x2="300" y2="120" stroke="${C.ink}" stroke-width="3"/>` + turtle(160, 110) + text(160, 150, "相遇时间 = " + d + "÷" + (v1+v2) + " = " + t, C.green, 13, "middle") + star(160, 80, 22, 0))
      ],
      captions: [
        "两人从两头相向而行。",
        "每小时靠近「速度和」，越靠越快。",
        "相遇时间 = 总路程 ÷ 速度和 = " + t + " 小时！"
      ]
    };
  },
  tRatio(p) {
    p = p || {}; const r = p.ratio || "3:2";
    return {
      frames: [
        svg(`<rect class="a-pop" x="40" y="70" width="66" height="26" rx="6" fill="${C.blue}"/>` + text(73, 128, "甲 3", C.blue, 13, "middle") + `<rect class="a-pop" style="animation-delay:.2s" x="160" y="70" width="44" height="26" rx="6" fill="${C.green}"/>` + text(182, 128, "乙 2", C.green, 13, "middle")),
        svg(ARROWDEF + `<line x1="20" y1="60" x2="300" y2="60" stroke="${C.ink}" stroke-width="3"/>` + arrow(60, 20, 220) + text(160, 100, "同时间，路程比 = 速度比", C.orange, 13, "middle")),
        svg(text(160, 95, "甲路程 : 乙路程 = " + r, C.green, 16, "middle") + star(160, 55, 22, 0) + text(160, 140, "时间相同，谁快谁走得远", C.ink, 12, "middle"))
      ],
      captions: [
        "甲、乙速度比是 " + r + "。",
        "走相同时间，路程比就等于速度比。",
        "把比例当份数，路程一分就清楚！"
      ]
    };
  },
  tAvg(p) {
    p = p || {}; const d = p.d == null ? 120 : p.d, t1 = p.t1 == null ? 2 : p.t1, t2 = p.t2 == null ? 3 : p.t2;
    const v = Math.round((2 * d) / (t1 + t2));
    return {
      frames: [
        svg(`<rect class="a-pop" x="40" y="60" width="${Math.min(d,260)}" height="24" rx="6" fill="${C.blue}"/>` + text(40, 105, "去 " + d + " 用 " + t1 + "h", C.blue, 12, "start")),
        svg(`<rect class="a-pop" x="40" y="100" width="${Math.min(d,260)}" height="24" rx="6" fill="${C.green}"/>` + text(40, 145, "回 " + d + " 用 " + t2 + "h", C.green, 12, "start")),
        svg(text(160, 80, "总路程 " + (2*d) + " ÷ 总时间 " + (t1+t2), C.orange, 13, "middle") + text(160, 120, "平均速度 = " + v, C.green, 18, "middle") + star(160, 45, 22, 0))
      ],
      captions: [
        "往返同一条路，去的慢、回的快。",
        "平均速度 ≠ 两个速度取平均！",
        "要用「总路程 ÷ 总时间」，才是真的平均速度 = " + v + "。"
      ]
    };
  },
  tMulti(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(ARROWDEF + `<line x1="20" y1="120" x2="300" y2="120" stroke="${C.ink}" stroke-width="3"/>` + turtle(40, 110) + turtle(280, 110) + text(160, 150, n + " 人往返跑", C.ink, 13, "middle")),
        svg(ARROWDEF + `<line x1="20" y1="120" x2="300" y2="120" stroke="${C.ink}" stroke-width="3"/>` + arrow(120, 40, 150) + arrow(120, 280, 170) + text(160, 150, "第 1 次相遇", C.orange, 13, "middle")),
        svg(ARROWDEF + `<line x1="20" y1="120" x2="300" y2="120" stroke="${C.ink}" stroke-width="3"/>` + turtle(120, 110) + turtle(200, 110) + text(160, 150, "合走 2 个全程再相遇", C.green, 13, "middle") + star(160, 80, 22, 0))
      ],
      captions: [
        "两人在路上来回跑，会相遇好几次。",
        "第 1 次相遇：合走 1 个全程。",
        "之后每次相遇，都合走 2 个全程，规律就出来了！"
      ]
    };
  },

  /* ===== 新增：计数(comb)专题专属模板 ===== */
  cMul(p) {
    p = p || {}; const a = p.a == null ? 3 : p.a, b = p.b == null ? 4 : p.b;
    const tot = a * b;
    return {
      frames: [
        svg(blocks(a, C.blue, 30, 35) + text(30, 95, a + " 件上衣", C.blue, 12, "start") + blocks(b, C.green, 30, 110) + text(30, 170, b + " 件裤子", C.green, 12, "start")),
        svg(blocks(a, C.blue, 30, 50) + text(220, 65, "×", C.ink, 22, "middle") + `<rect class="a-pop" style="animation-delay:.2s" x="240" y="50" width="${b*20}" height="22" rx="5" fill="${C.green}"/>` + text(240, 95, b + " 件裤子", C.green, 12, "start")),
        svg(text(160, 85, "搭配 = " + a + " × " + b + " = " + tot, C.ink, 20, "middle") + star(160, 125, 24, 0) + text(160, 160, "分步相乘：先选上衣再选裤子", C.orange, 12, "middle"))
      ],
      captions: [
        "乘法原理：做一件事分几步，每步方法数相乘。",
        "有 " + a + " 件上衣、" + b + " 件裤子。",
        "每种上衣都能配每件裤子，共 " + a + "×" + b + " = " + tot + " 种搭配！"
      ]
    };
  },
  cPerm(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    let seat = "";
    for (let i = 0; i < n; i++) seat += `<rect class="a-pop" style="animation-delay:${(i*0.1).toFixed(2)}s" x="${60+i*44}" y="80" width="36" height="40" rx="6" fill="${C.blue}" stroke="#fff" stroke-width="2"/>` + text(78 + i*44, 140, "第" + (i+1) + "位", C.ink, 11, "middle");
    return {
      frames: [
        svg(seat + text(160, 170, n + " 个小朋友排成一排", C.ink, 13, "middle")),
        svg(seat + `<circle class="a-pop" style="animation-delay:.2s" cx="78" cy="100" r="16" fill="${C.yellow}"/>` + text(160, 170, "第1个位置有 " + n + " 种选法", C.yellow, 12, "middle")),
        svg(seat + text(160, 40, "排法 = " + n + "!", C.green, 20, "middle") + star(160, 60, 22, 0) + text(160, 170, "顺序不同算不同排法", C.orange, 12, "middle"))
      ],
      captions: [
        "排列：排顺序，位置重要。",
        "第 1 个位置有 " + n + " 种选法，第 2 个少 1 种……",
        "全排列 = " + n + "! 种，换顺序就是新排法！"
      ]
    };
  },
  cPermF(p) {
    p = p || {}; const n = p.n == null ? 5 : p.n, m = p.m == null ? 2 : p.m;
    let s = ""; for (let i = 0; i < m; i++) s += (n - i) + (i < m - 1 ? "×" : "");
    let val = 1; for (let i = 0; i < m; i++) val *= (n - i);
    return {
      frames: [
        svg(text(160, 90, "从 " + n + " 个里选 " + m + " 个排", C.ink, 15, "middle")),
        svg(text(160, 90, "P(" + n + "," + m + ") = " + s, C.orange, 16, "middle")),
        svg(text(160, 90, "= " + val + " 种排法", C.green, 18, "middle") + star(160, 50, 22, 0) + text(160, 140, "又排又选，位置重要", C.ink, 12, "middle"))
      ],
      captions: [
        "排列公式：从 " + n + " 个里取 " + m + " 个排顺序。",
        "P(" + n + "," + m + ") = " + n + "×" + (n-1) + "×…×" + (n-m+1) + "。",
        "算出来 = " + val + " 种不同排法！"
      ]
    };
  },
  cCombF(p) {
    p = p || {}; const n = p.n == null ? 5 : p.n, m = p.m == null ? 2 : p.m;
    let val = 1; for (let i = 0; i < m; i++) val = val * (n - i) / (i + 1);
    return {
      frames: [
        svg(text(160, 85, "从 " + n + " 个里选 " + m + " 个", C.ink, 15, "middle") + text(160, 118, "（顺序不重要）", C.orange, 13, "middle")),
        svg(text(160, 90, "C(" + n + "," + m + ") = " + n + "! ÷ (" + m + "!" + (n-m) + "!)", C.blue, 13, "middle")),
        svg(text(160, 90, "= " + val + " 种选法", C.green, 18, "middle") + star(160, 50, 22, 0) + text(160, 140, "只选不排，AB 和 BA 算一种", C.ink, 12, "middle"))
      ],
      captions: [
        "组合：只选出来，顺序不重要。",
        "C(" + n + "," + m + ") = 从 " + n + " 选 " + m + " 的不重复选法。",
        "算出来 = " + val + " 种，AB 和 BA 是同一种！"
      ]
    };
  },
  cPigeon(p) {
    p = p || {}; const n = p.n == null ? 5 : p.n, k = p.k == null ? 4 : p.k;
    const ans = Math.floor((n - 1) / k) + 1;
    let boxes = ""; for (let i = 0; i < k; i++) boxes += `<rect class="a-pop" style="animation-delay:${(i*0.1).toFixed(2)}s" x="${40+i*56}" y="70" width="44" height="60" rx="6" fill="${[C.blue,C.green,C.yellow,C.purple,C.pink][i%5]}" stroke="#fff" stroke-width="2"/>`;
    const red = boxes.replace(/fill="[^"]*"/g, 'fill="' + C.red + '"');
    return {
      frames: [
        svg(boxes + text(160, 155, k + " 个抽屉", C.ink, 13, "middle")),
        svg(red + text(160, 155, "放 " + n + " 个物品", C.red, 13, "middle")),
        svg(text(160, 90, "至少有 1 个抽屉 ≥ " + ans + " 个", C.green, 14, "middle") + star(160, 50, 22, 0) + text(160, 130, "物品比抽屉多，必挤一起", C.orange, 12, "middle"))
      ],
      captions: [
        "抽屉原理：把 " + n + " 个物品放进 " + k + " 个抽屉。",
        "平均分也分不完，总有多出来的。",
        "所以至少有 1 个抽屉里 ≥ " + ans + " 个物品！"
      ]
    };
  },
  cGeo(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    let g = ""; for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) g += `<circle cx="${50+c*44}" cy="${60+r*30}" r="3" fill="${C.line}"/>`;
    const tri = n * (n + 1) * (n + 2) / 6;
    return {
      frames: [
        svg(g + text(160, 178, (n+1) + "×" + (n+1) + " 点阵", C.ink, 13, "middle")),
        svg(g + `<polygon class="a-pop" points="50,60 50,${60+n*30} ${50+n*44},${60+n*30}" fill="${C.green}" opacity=".4" stroke="${C.green}" stroke-width="2"/>` + text(160, 178, "数三角形", C.green, 13, "middle")),
        svg(text(160, 95, "小三角形共 " + tri + " 个", C.green, 15, "middle") + star(160, 55, 22, 0) + text(160, 140, "按大小分类数，别漏", C.orange, 12, "middle"))
      ],
      captions: [
        "点阵里藏着很多三角形、长方形。",
        "按「大小」一类一类数，才不会漏。",
        "小三角形一共 " + tri + " 个，规律就在这！"
      ]
    };
  },

  /* ===== 新增：逻辑(logic)专题专属模板 ===== */
  lGraph(p) {
    p = p || {}; const n = p.n == null ? 4 : p.n;
    const draw = (c, fill) => `<rect class="a-pop" style="animation-delay:${(c*0.1).toFixed(2)}s" x="${c*40+30}" y="80" width="30" height="30" rx="6" fill="${fill}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(draw(0,C.blue)+draw(1,C.green)+draw(2,C.yellow)+text(160,140,"图形在变",C.ink,13,"middle")),
        svg(draw(0,C.blue)+draw(1,C.green)+draw(2,C.yellow)+draw(3,C.purple)+text(160,140,"颜色/形状轮流",C.orange,13,"middle")),
        svg(draw(0,C.blue)+draw(1,C.green)+draw(2,C.yellow)+draw(3,C.purple)+draw(4,C.pink)+text(160,40,"接着画第"+(n+1)+"个",C.green,14,"middle")+star(160,60,20,0))
      ],
      captions: [
        "图形规律：看相邻图形怎么变。",
        "颜色、形状、方向，常常轮流出现。",
        "找到规律，就能画出下一个！"
      ]
    };
  },
  lChance(p) {
    p = p || {}; const n = p.n == null ? 4 : p.n;
    let balls = ""; for (let i=0;i<n;i++) balls += pCircle(50+i*36, 90, 12, i<2?C.red:C.blue, i*0.05);
    return {
      frames: [
        svg(`<rect class="a-pop" x="30" y="60" width="200" height="80" rx="12" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + balls + text(160, 162, "袋子里 " + n + " 个球", C.ink, 13, "middle")),
        svg(`<rect class="a-pop" x="30" y="60" width="200" height="80" rx="12" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` + balls + `<circle class="a-blink" cx="86" cy="90" r="16" fill="none" stroke="${C.red}" stroke-width="3"/>` + text(160, 162, "摸到红球？有可能", C.red, 13, "middle")),
        svg(text(160, 90, "红 2 个 / 共 " + n + " 个", C.green, 15, "middle") + star(160, 50, 22, 0) + text(160, 130, "数量多的，摸到的可能性大", C.orange, 12, "middle"))
      ],
      captions: [
        "可能性：事情发生有「一定/可能/不可能」。",
        "袋子里红球 2 个、蓝球 " + (n-2) + " 个。",
        "红球少，摸到红球的可能性就小——看比例！"
      ]
    };
  },
  lLiar(p) {
    p = p || {}; const n = p.n == null ? 2 : p.n;
    return {
      frames: [
        svg(text(80, 90, "😇 说真话", C.green, 14, "middle") + text(240, 90, "👿 说假话", C.red, 14, "middle") + text(160, 140, "两人各说一句", C.ink, 13, "middle")),
        svg(text(80, 90, "A：我是君子", C.green, 13, "middle") + text(240, 90, "B：A 是小人", C.red, 13, "middle") + text(160, 140, "谁真谁假？", C.orange, 13, "middle")),
        svg(text(160, 95, "假设法：先假定再看矛盾", C.green, 14, "middle") + star(160, 55, 22, 0) + text(160, 140, "说真话的人不会说自己是小人", C.ink, 12, "middle"))
      ],
      captions: [
        "君子永远说真话，小人永远说假话。",
        "每人说一句话，乍看分不清。",
        "用「假设法」：先当 A 是君子，推一推有没有矛盾！"
      ]
    };
  },
  lOpt(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(`<rect class="a-pop" x="40" y="70" width="70" height="26" rx="6" fill="${C.blue}"/>` + text(75, 112, "煮水 8分", C.blue, 11, "middle") + `<rect class="a-pop" style="animation-delay:.2s" x="150" y="70" width="70" height="26" rx="6" fill="${C.green}"/>` + text(185, 112, "扫地 5分", C.green, 11, "middle")),
        svg(`<rect class="a-pop" x="40" y="70" width="70" height="26" rx="6" fill="${C.blue}"/>` + `<rect class="a-pop" style="animation-delay:.2s" x="120" y="110" width="70" height="26" rx="6" fill="${C.green}"/>` + text(160, 160, "同时做", C.orange, 13, "middle")),
        svg(text(160, 85, "总用时 8 分（不是 13 分）", C.green, 13, "middle") + star(160, 50, 22, 0) + text(160, 130, "能并行的就别排队等", C.ink, 12, "middle"))
      ],
      captions: [
        "统筹优化：有些事可以「同时做」。",
        "煮水时顺手扫地，两件事一起进行。",
        "总用时取最长的那件 = 8 分，省时间！"
      ]
    };
  },
  lGame(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(text(160, 80, "两人轮流取，每次 1~" + n + " 个", C.ink, 13, "middle") + `<rect class="a-pop" x="40" y="100" width="200" height="24" rx="6" fill="${C.blue}"/>`),
        svg(text(160, 80, "谁取到最后 1 个谁赢", C.orange, 13, "middle") + `<rect class="a-pop" x="40" y="100" width="120" height="24" rx="6" fill="${C.green}"/>` + `<rect class="a-pop" style="animation-delay:.2s" x="170" y="100" width="30" height="24" rx="6" fill="${C.yellow}"/>`),
        svg(text(160, 90, "找「必胜策略」：留 " + (n+1) + " 的倍数", C.green, 13, "middle") + star(160, 50, 22, 0) + text(160, 135, "让对方每次都面对倍数", C.ink, 12, "middle"))
      ],
      captions: [
        "对策问题：两人轮流拿，比谁聪明。",
        "目标：拿到最后一个的人赢。",
        "诀窍是留「" + (n+1) + " 的倍数」给对手，你就能必胜！"
      ]
    };
  },
  lBalanceH(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(text(70, 70, "🍎 = 🍊 + 🍊", C.blue, 14, "middle") + text(225, 70, "🍊 = 2", C.green, 14, "middle")),
        svg(text(70, 90, "🍎 = 2 + 2", C.orange, 14, "middle") + text(225, 90, "🍎 = 4", C.green, 14, "middle")),
        svg(text(160, 95, "一层层代进去", C.green, 16, "middle") + star(160, 55, 22, 0) + text(160, 135, "用已知换未知", C.ink, 12, "middle"))
      ],
      captions: [
        "复杂等量代换：用「等于」互相替换。",
        "已知橘子 = 2，苹果 = 橘子 + 橘子。",
        "代进去：苹果 = 2 + 2 = 4，一层层换就出来！"
      ]
    };
  },
  lMix(p) {
    p = p || {}; const n = p.n == null ? 4 : p.n;
    let row = ""; for (let i=0;i<n;i++) row += `<rect class="a-pop" style="animation-delay:${(i*0.1).toFixed(2)}s" x="${30+i*60}" y="90" width="44" height="40" rx="6" fill="${i%2?C.green:C.blue}" stroke="#fff" stroke-width="2"/>`;
    return {
      frames: [
        svg(row + text(160, 155, n + " 条线索", C.ink, 13, "middle")),
        svg(row + `<circle class="a-blink" cx="52" cy="110" r="22" fill="none" stroke="${C.orange}" stroke-width="3"/>` + text(160, 155, "锁定关键的一条", C.orange, 13, "middle")),
        svg(text(160, 95, "排除法 + 列表，逐个定", C.green, 14, "middle") + star(160, 55, 22, 0) + text(160, 135, "矛盾的就是假，剩下的就是真", C.ink, 12, "middle"))
      ],
      captions: [
        "综合推理：好多线索搅在一起。",
        "先找「最确定」的那条线索下手。",
        "用排除法 + 列表，一个个定下来！"
      ]
    };
  },

  /* ===== 新增：数论(nt)专题专属模板 ===== */
  nDivCount(p) {
    p = p || {}; const n = p.n == null ? 24 : p.n;
    let val = 0; for (let i = 1; i <= n; i++) if (n % i === 0) val++;
    return {
      frames: [
        svg(text(160, 90, n + " 的质因数分解", C.ink, 15, "middle") + text(160, 120, n + " = 2³ × 3", C.blue, 14, "middle")),
        svg(text(160, 90, "指数 +1 再相乘", C.orange, 15, "middle") + text(160, 120, "(3+1) × (1+1)", C.orange, 14, "middle")),
        svg(text(160, 90, "约数个数 = " + val, C.green, 18, "middle") + star(160, 50, 22, 0) + text(160, 135, "不用一个个试，公式秒出", C.ink, 12, "middle"))
      ],
      captions: [
        "约数个数有公式，不用硬数。",
        n + " = 2³×3，把每个指数加 1。",
        "（3+1）×（1+1）= " + val + " 个约数！"
      ]
    };
  },
  nDivAdv(p) {
    p = p || {}; const n = p.n == null ? 13 : p.n, k = p.k == null ? 7 : p.k;
    return {
      frames: [
        svg(text(160, 90, "判断 " + n + " 能否被 " + k + " 整除", C.ink, 13, "middle")),
        svg(text(160, 90, k + "：奇位和 − 偶位和", C.orange, 14, "middle") + text(160, 120, "差是 " + k + " 的倍数？", C.orange, 13, "middle")),
        svg(text(160, 90, n + " ÷ " + k + " = " + Math.floor(n/k), C.green, 16, "middle") + star(160, 50, 22, 0) + text(160, 135, "用「分段/奇偶位」小技巧", C.ink, 12, "middle"))
      ],
      captions: [
        "7、11、13 的整除有巧办法。",
        "以 11 为例：奇数位和与偶数位和的差。",
        "差是 " + k + " 的倍数，就能整除——小技巧大用处！"
      ]
    };
  },
  nCrt(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(text(160, 80, "除以 3 余 2", C.blue, 14, "middle") + text(160, 110, "除以 5 余 3", C.green, 14, "middle") + text(160, 140, "除以 7 余 2", C.orange, 14, "middle")),
        svg(text(160, 90, "从最小的余数试起", C.ink, 14, "middle") + text(160, 122, "2, 5, 8, 11, 14…", C.ink, 13, "middle")),
        svg(text(160, 95, "同时满足 → 23", C.green, 18, "middle") + star(160, 55, 22, 0) + text(160, 135, "「物不知数」一个个数出来", C.ink, 12, "middle"))
      ],
      captions: [
        "中国剩余定理（物不知数）：除这除那都有余。",
        "从最小的余数开始，一个个试。",
        "同时满足三个条件的数，最小是 23！"
      ]
    };
  },
  nPlace(p) {
    p = p || {}; const n = p.n == null ? 123 : p.n;
    const s = String(n);
    return {
      frames: [
        svg(text(160, 80, "数字 " + n, C.ink, 18, "middle")),
        svg(text(160, 78, s[0] + "×100 + " + s[1] + "×10 + " + s[2], C.blue, 14, "middle") + text(160, 115, "每个位置权重不同", C.orange, 13, "middle")),
        svg(text(160, 95, "位值：位置决定大小", C.green, 15, "middle") + star(160, 55, 22, 0) + text(160, 135, "拆开看，进位退位都清楚", C.ink, 12, "middle"))
      ],
      captions: [
        "位值原理：同一个数字，位置不同价值不同。",
        "" + n + " = " + s[0] + " 个百 + " + s[1] + " 个十 + " + s[2] + " 个一。",
        "弄懂位值，进位、拆数都变简单！"
      ]
    };
  },
  gSplit(p) {
    p = p || {}; const n = p.n == null ? 7 : p.n;
    return {
      frames: [
        svg(text(160, 90, "把 " + n + " 拆成几个正整数", C.ink, 14, "middle")),
        svg(text(160, 70, n + " = 4 + 3", C.blue, 15, "middle") + text(160, 100, n + " = 5 + 2", C.green, 15, "middle") + text(160, 130, n + " = 3 + 2 + 2", C.orange, 15, "middle")),
        svg(text(160, 95, "拆法有很多种", C.green, 16, "middle") + star(160, 55, 22, 0) + text(160, 135, "加个「最大数」限制就唯一", C.ink, 12, "middle"))
      ],
      captions: [
        "整数拆分：把一个数写成几个正整数相加。",
        "" + n + " 可以拆成 4+3、5+2、3+2+2……",
        "不排序时拆法有限种，常用于计数！"
      ]
    };
  },
  gDioph(p) {
    p = p || {}; const a = p.a == null ? 3 : p.a, b = p.b == null ? 5 : p.b, c = p.c == null ? 17 : p.c;
    return {
      frames: [
        svg(text(160, 90, a + "x + " + b + "y = " + c, C.ink, 16, "middle")),
        svg(text(160, 88, "试 x=0,1,2… 看 y 是否整数", C.orange, 13, "middle") + text(160, 120, "x=4 → y=1 ✓", C.green, 14, "middle")),
        svg(text(160, 95, "一组解：x=4, y=1", C.green, 16, "middle") + star(160, 55, 22, 0) + text(160, 135, "正整数范围内一个个试", C.ink, 12, "middle"))
      ],
      captions: [
        "不定方程：两个未知数，只有一个等式。",
        "要求 x、y 都是整数（常是正整数）。",
        "从 x=0 开始试，找到 " + a + "×4+" + b + "×1=" + c + " 这组解！"
      ]
    };
  },
  nMix(p) {
    p = p || {}; const n = p.n == null ? 60 : p.n;
    return {
      frames: [
        svg(text(160, 90, n + " 想整除/奇偶/质合？", C.ink, 14, "middle")),
        svg(text(160, 90, "先奇偶，再试整除特征", C.orange, 14, "middle")),
        svg(text(160, 95, "综合用前面所有招", C.green, 15, "middle") + star(160, 55, 22, 0) + text(160, 135, "看清题目要什么", C.ink, 12, "middle"))
      ],
      captions: [
        "数论综合：把前面学的一起用。",
        "先看奇偶，再试整除特征，必要时分解质因数。",
        "一题多问时，先想清楚「它到底要什么」！"
      ]
    };
  },

  /* ===== 新增：思维(think)专题专属模板 ===== */
  tTransform(p) {
    p = p || {}; const n = p.n == null ? 1 : p.n;
    return {
      frames: [
        svg(text(160, 90, "难题看不懂？", C.ink, 15, "middle") + text(160, 122, "换个说法试试", C.orange, 13, "middle")),
        svg(text(160, 90, "把「未知」变「已知」", C.blue, 14, "middle") + text(160, 122, "把「弯的」变「直的」", C.green, 14, "middle")),
        svg(text(160, 95, "转化：等价换个角度", C.green, 15, "middle") + star(160, 55, 22, 0) + text(160, 135, "同样的量，不一样的看法", C.ink, 12, "middle"))
      ],
      captions: [
        "转化法：把不会的题，变成会做的题。",
        "等价变形，换个角度就顺了。",
        "同样的量，换种看法，难题就软了！"
      ]
    };
  },
  tEquation(p) {
    p = p || {}; const x = p.x == null ? 5 : p.x;
    return {
      frames: [
        svg(text(160, 90, "设未知数 x", C.ink, 16, "middle")),
        svg(text(160, 85, "2x + 3 = " + (2*x+3), C.blue, 15, "middle") + text(160, 120, "列方程", C.orange, 14, "middle")),
        svg(text(160, 90, "解得 x = " + x, C.green, 18, "middle") + star(160, 50, 22, 0) + text(160, 135, "顺向思考，不绕弯", C.ink, 12, "middle"))
      ],
      captions: [
        "方程思想：把「求什么」设为 x。",
        "根据题意列出等式（方程）。",
        "解出来 x = " + x + "，正向思考不绕弯！"
      ]
    };
  },
  tMap(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    let l = "";
    for (let i = 0; i < n; i++) l += `<line x1="60" y1="${60+i*30}" x2="260" y2="${70+i*30}" stroke="${C.blue}" stroke-width="2" class="a-fade"/>` + pCircle(60, 60+i*30, 8, C.green, i*0.1) + pCircle(260, 70+i*30, 8, C.orange, i*0.1);
    return {
      frames: [
        svg(l + text(160, 178, n + " 对 " + n + " 对应", C.ink, 13, "middle")),
        svg(l + text(160, 178, "一一对应数个数", C.orange, 13, "middle")),
        svg(text(160, 95, "两边一样多 = " + n, C.green, 16, "middle") + star(160, 55, 22, 0) + text(160, 135, "配对成功就数清了", C.ink, 12, "middle"))
      ],
      captions: [
        "对应思想：把两堆东西一一配对。",
        "左边一个，右边一个，连上线。",
        "配对完，两边数量相等 = " + n + "，数起来超快！"
      ]
    };
  },
  tSchedule(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(`<rect class="a-pop" x="40" y="70" width="80" height="24" rx="6" fill="${C.blue}"/>` + text(80, 112, "A " + (n+2) + "分", C.blue, 11, "middle") + `<rect class="a-pop" style="animation-delay:.2s" x="150" y="70" width="80" height="24" rx="6" fill="${C.green}"/>` + text(190, 112, "B " + n + "分", C.green, 11, "middle")),
        svg(`<rect class="a-pop" x="40" y="70" width="80" height="24" rx="6" fill="${C.blue}"/>` + `<rect class="a-pop" style="animation-delay:.2s" x="130" y="110" width="80" height="24" rx="6" fill="${C.green}"/>` + text(160, 160, "重叠安排", C.orange, 13, "middle")),
        svg(text(160, 90, "最短总时长 = 最长链", C.green, 14, "middle") + star(160, 50, 22, 0) + text(160, 135, "关键工序不能省", C.ink, 12, "middle"))
      ],
      captions: [
        "统筹：把几件事排得最省时。",
        "能重叠的重叠，能并行的并行。",
        "最短总时长 = 最长的那条关键链！"
      ]
    };
  },
  tStrategy(p) {
    p = p || {}; const n = p.n == null ? 3 : p.n;
    return {
      frames: [
        svg(text(160, 85, "双方都聪明", C.ink, 14, "middle") + text(160, 115, "比谁先手/后手", C.orange, 13, "middle")),
        svg(text(160, 90, "找「对称」「配对」", C.blue, 14, "middle") + text(160, 120, "让对手永远被动", C.green, 13, "middle")),
        svg(text(160, 95, "后手模仿 = 必胜", C.green, 15, "middle") + star(160, 55, 22, 0) + text(160, 135, "想三步，赢在开局", C.ink, 12, "middle"))
      ],
      captions: [
        "对策问题：两个人斗智，都最聪明。",
        "找对称或配对的招，让对手被动。",
        "后手「照着对手学」，常常就能必胜！"
      ]
    };
  },

  };

  /* ============================================================
   * 按专题 + 关键词挑选动画模板
   * id 用于无 cat 字段的「待接入」专题（travel/comb/think）兜底
   * ============================================================ */
  function pick(cat, title, id) {
    const t = ((title || "") + " " + (cat || ""));
    switch (cat || id) {
      case "calc":
        if (/乘|倍/.test(t)) return { type: "arrayGrid", params: { rows: 3, cols: 4 } };
        if (/减/.test(t)) return { type: "numberLine", params: { a: 13, b: 5, op: "-" } };
        return { type: "countBlocks", params: { a: 9, b: 7 } };
      case "geo":
        if (/对称|轴/.test(t)) return { type: "foldSymmetry", params: {} };
        return { type: "shapeSort", params: {} };
      case "logic":
        if (/规律|数列|图形/.test(t)) return { type: "sequence", params: {} };
        return { type: "oddOneOut", params: {} };
      case "word":
        return { type: "barModel", params: { parts: [3, 5] } };
      case "nt":
        if (/整除|余/.test(t)) return { type: "divisible", params: { n: 14, k: 4 } };
        return { type: "parityColor", params: { n: 10 } };
      case "travel":
        return { type: "twoCars", params: {} };
      case "comb":
        return { type: "treeBranch", params: {} };
      case "think":
        if (/逆|倒推/.test(t)) return { type: "reverseArrow", params: {} };
        return { type: "drawDiagram", params: {} };
      default:
        return { type: "countBlocks", params: { a: 9, b: 7 } };
    }
  }

  /* ---------- 生成静态图示卡（插画 + 三步解题说明，不再播放动画） ---------- */
  function build(u, id) {
    if (!u) return "";
    const a = u.anim || pick(u.cat, u.title, id);
    const tpl = TEMPLATES[a.type];
    if (!tpl) return "";
    const out = tpl(a.params);
    const frames = out.frames || [], caps = out.captions || [];
    const final = frames[frames.length - 1] || "";
    const steps = caps.map((c, i) => `<li><i>${i + 1}</i>${c}</li>`).join("");
    const m = mascotFor(id);
    return `<div class="anim-card anim-static" data-anim-type="${a.type}">
      <div class="anim-head"><span class="anim-badge">🖼 图示精讲</span><span class="anim-hint">一图看懂解题思路</span></div>
      <div class="anim-stage">${final}</div>
      <div class="anim-steps"><ol>${steps}</ol></div>
      <div class="anim-foot">
        <div class="anim-mascot">${m}<div class="anim-bubble">先看上面的图，再按步骤想思路 👇</div></div>
      </div>
    </div>`;
  }

  /* ---------- 分步播放（元素真动 + 角色解说 + 进度 + 撒花） ---------- */
  function play(card) {
    if (!card) return;
    const type = card.dataset.animType;
    let params;
    try { params = JSON.parse(card.dataset.animParams); } catch (e) { params = {}; }
    const tpl = TEMPLATES[type];
    if (!tpl) return;
    const out = tpl(params);
    const frames = out.frames || [], caps = out.captions || [];
    const stage = card.querySelector(".anim-stage");
    const cap = card.querySelector(".anim-cap");
    const bubble = card.querySelector(".anim-bubble");
    const dots = card.querySelectorAll(".anim-dots i");
    const btn = card.querySelector(".anim-play");
    const mascot = card.querySelector(".anim-mascot");
    if (!stage) return;
    if (window.QIAO_FUN && window.QIAO_FUN.sfx) window.QIAO_FUN.sfx.tap();
    const REACT = ["👀 看这里", "🔍 关键一步", "💡 想一想", "🎯 快对啦", "🎉 真棒"];
    let i = 0;
    if (btn) { btn.disabled = true; btn.textContent = "▶ 播放中…"; }
    const step = () => {
      if (i >= frames.length) {
        if (btn) { btn.disabled = false; btn.textContent = "▶ 再看一遍"; }
        if (bubble) { bubble.textContent = "🎉 学会啦！你真棒"; bubble.parentElement.classList.add("cheer"); }
        if (mascot) mascot.classList.add("cheer");
        celebrate(card);
        if (window.QIAO_FUN && window.QIAO_FUN.sfx) window.QIAO_FUN.sfx.star();
        return;
      }
      stage.classList.remove("anim-bounce");
      void stage.offsetWidth;
      stage.innerHTML = frames[i];
      stage.classList.add("anim-bounce");
      if (cap) cap.textContent = caps[i] || "";
      if (bubble) { bubble.textContent = REACT[i] || "👍 继续看"; bubble.parentElement.classList.remove("cheer"); }
      if (mascot) { mascot.classList.remove("cheer"); void mascot.offsetWidth; mascot.classList.add("talk"); }
      dots.forEach((d, k) => d.classList.toggle("on", k === i));
      if (window.QIAO_FUN && window.QIAO_FUN.sfx) window.QIAO_FUN.sfx.spin();
      i++;
      setTimeout(step, 1500);
    };
    step();
  }

  /* 完成时撒花 */
  function celebrate(card) {
    const box = card.querySelector(".anim-confetti");
    if (!box) return;
    const emo = ["⭐", "✨", "🌟", "💫", "🎉"];
    box.innerHTML = "";
    for (let k = 0; k < 14; k++) {
      const s = document.createElement("span");
      s.textContent = emo[k % emo.length];
      s.style.left = (6 + Math.random() * 88) + "%";
      s.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
      s.style.fontSize = (14 + Math.random() * 14) + "px";
      box.appendChild(s);
    }
    setTimeout(() => { box.innerHTML = ""; }, 2200);
  }

  /* ---------- 暴露 ---------- */
  window.QIAO_ANIM = { pick, build, play, TEMPLATES, C, MASCOT };
})();
