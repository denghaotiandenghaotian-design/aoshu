/* ============================================================
 * 浅奥乐园 · Hash 路由
 * 支持路径参数与查询： #/level/L1_calc?foo=bar
 * 解析后调用 window.QIAO_APP.render({name, params, query})
 * ============================================================ */
(function () {
  function parse() {
    let h = location.hash.replace(/^#/, "");
    if (!h || h === "/") h = "/home";
    const [path, qs] = h.split("?");
    const segs = path.split("/").filter(Boolean);   // ["level","L1_calc"]
    const name = segs[0] || "home";
    const params = segs.slice(1);
    const query = {};
    if (qs) qs.split("&").forEach(p => {
      const [k, v] = p.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
    return { name, params, query };
  }

  function go(hash) {
    if (location.hash === "#" + hash) { render(); }
    else location.hash = hash;
  }

  function render() {
    const r = parse();
    if (window.QIAO_APP && window.QIAO_APP.render) {
      window.QIAO_APP.render(r);
    }
  }

  window.addEventListener("hashchange", render);
  window.QIAO_ROUTER = { parse, go, render };
})();
