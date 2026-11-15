// لوحة المحاضر — بتصميم منظومة المعلّم في منصة السهم العلمي، مع هيكل الجامعة (مقرر ← شعب ← فصول) والأهداف
(function () {
  const { $, esc, toast, openSheet, closeSheet, confirmSheet, initSkin, skinPicker, spin, greet, firstName, fmtDT, toLocalInput, fromLocalInput, download, csv } = U;
  const { rpc, session, setSession, remembered, lvChip, lvBar, nf, pc, outcomeMastery, chaptersOf, emptyBox, LV, lvOf, copy } = F;
  initSkin("teacher", "white");
  const S = { boot: null, sec: null, roster: [], assess: [], book: null, qs: null, ready: false };
  const sec = () => S.boot.sections.find((x) => x.id === S.sec) || null;
  const course = () => S.boot.courses.find((c) => c.id === (sec() || {}).course_id) || S.boot.courses[0];
  const term = (id) => S.boot.terms.find((t) => t.id === id) || {};
  const comp = (id) => course().components.find((c) => c.id === id) || {};
  const chs = () => chaptersOf(course());
  const opt = (sel, list) => list.map((x) => `<option value="${esc(x[0])}" ${String(x[0]) === String(sel) ? "selected" : ""}>${esc(x[1])}</option>`).join("");
  const active = () => (S.book ? S.book.students.filter((s) => s.status === "active") : []);
  let tempPw = null;

  // ===================== الدخول =====================
  $("skinBtnL").onclick = skinPicker;
  $("tEye").onclick = () => { const p = $("tPass"); p.type = p.type === "password" ? "text" : "password"; };
  function err(msg) { const e = $("loginErr"); e.innerHTML = ic("alert", "sm") + "<span>" + esc(msg) + "</span>"; e.classList.remove("hide"); $("portal").classList.remove("shake"); void $("portal").offsetWidth; $("portal").classList.add("shake"); }
  function showLogin(change) { $("app").classList.add("hide"); $("vLogin").classList.remove("hide"); $("tLogin").classList.toggle("hide", !!change); $("tChange").classList.toggle("hide", !change); $("tOldWrap").classList.toggle("hide", !!tempPw); }
  F.setOnAuth((code) => { if (code === "P0402") { tempPw = null; showLogin(true); return; } setSession(null); showLogin(false); err("انتهت الجلسة. سجّل الدخول من جديد."); });
  $("tLogin").addEventListener("submit", async (e) => {
    e.preventDefault(); $("loginErr").classList.add("hide");
    const btn = $("tGo"); spin(btn, true, "جارٍ الدخول…");
    try {
      const r = await rpc("fgu_login", { p_username: $("tUser").value.trim(), p_password: $("tPass").value, p_remember: $("tRem").checked }, true);
      if (r.role !== "teacher") { spin(btn, false); return err("هذا حساب طالب؛ ادخل من صفحة الطلبة."); }
      setSession(r, $("tRem").checked); spin(btn, false);
      if (r.must_change) { tempPw = $("tPass").value; showLogin(true); return; }
      start();
    } catch (x) { spin(btn, false); err(x.message); }
  });
  $("tChange").addEventListener("submit", async (e) => {
    e.preventDefault(); $("loginErr").classList.add("hide");
    if ($("tNew1").value !== $("tNew2").value) return err("كلمتا المرور غير متطابقتين.");
    const btn = $("tChg"); spin(btn, true, "جارٍ الحفظ…");
    try { await rpc("fgu_change_password", { p_old: tempPw || $("tOld").value, p_new: $("tNew1").value }); const s = session(); s.must_change = false; setSession(s, remembered() || $("tRem").checked); tempPw = null; spin(btn, false); start(); }
    catch (x) { spin(btn, false); err(x.message); }
  });

  // ===================== الهيكل =====================
  const NAV = [
    { g: "القيادة" }, { v: "dash", t: "لوحة القيادة", ic: "home" },
    { g: "داخل المقرر" }, { v: "assess", t: "التقويمات ورصد العلامات", ic: "file" }, { v: "book", t: "سجل العلامات", ic: "award" }, { v: "objs", t: "إتقان الأهداف", ic: "target" },
    { g: "أدوات التقويم" }, { v: "bank", t: "بنك الأسئلة", ic: "layers" },
    { g: "الإدارة" }, { v: "people", t: "الطلبة", ic: "users" }, { v: "settings", t: "الشعب والفصول والإعدادات", ic: "key" }
  ];
  const BNAV = [["dash", "home", "القيادة"], ["assess", "file", "التقويمات"], ["book", "award", "العلامات"], ["people", "users", "الطلبة"], ["_more", "list", "المزيد"]];
  const VIEWS = {};
  function buildShell() {
    $("sideNav").innerHTML = NAV.map((n) => n.g ? `<div class="grp">${esc(n.g)}</div>` : `<a href="#${n.v}" data-v="${n.v}">${ic(n.ic)}<span>${esc(n.t)}</span></a>`).join("");
    $("bNav").innerHTML = BNAV.map(([v, i, t]) => `<a href="${v === "_more" ? "#" : "#" + v}" data-v="${v}">${ic(i)}<span>${t}</span></a>`).join("");
    $("bNav").querySelector('[data-v="_more"]').onclick = (e) => { e.preventDefault(); toggleSide(true); };
    $("menuBtn").onclick = () => toggleSide(true); $("sideScrim").onclick = () => toggleSide(false);
    $("sideNav").addEventListener("click", (e) => { if (e.target.closest("a")) toggleSide(false); });
    $("skinBtn").onclick = skinPicker;
    $("outBtn").onclick = async () => { try { await rpc("fgu_logout"); } catch (e) { } setSession(null); location.hash = ""; location.reload(); };
    $("secPick").onchange = async (e) => { S.sec = e.target.value; try { localStorage.setItem("fgu_t_sec", S.sec); } catch (x) { } await loadSection(); route(); };
    window.addEventListener("hashchange", route);
  }
  function toggleSide(on) { $("side").classList.toggle("on", on); $("sideScrim").classList.toggle("on", on); }
  function fillShell() {
    $("meName").textContent = S.boot.me.full_name; $("meAv").textContent = firstName(S.boot.me.full_name).slice(0, 1);
    const secs = S.boot.sections.filter((s) => !s.archived);
    $("secPick").innerHTML = secs.map((s) => `<option value="${s.id}" ${s.id === S.sec ? "selected" : ""}>${esc(s.name)} — ${esc(term(s.term_id).name || "")}</option>`).join("");
  }
  async function route() {
    if (!S.ready) return;
    // تحديث بيانات الشعبة تلقائيًّا إذا مضى عليها أكثر من 5 ثوانٍ (محاولات الطلبة تصل أولًا بأول)
    if (S.sec && Date.now() - (S.at || 0) > 5000) { try { await loadSection(); } catch (e) { } }
    let [v, arg] = (location.hash || "#dash").slice(1).split("/");
    if (!VIEWS[v]) v = "dash";
    const def = VIEWS[v];
    document.querySelectorAll(".side-nav a,.bnav a").forEach((a) => a.classList.toggle("on", a.dataset.v === (def.nav || v)));
    $("pgTitle").textContent = def.title; $("pgSub").textContent = course().title + (sec() ? " — " + sec().name + " · " + (term(sec().term_id).name || "") : "");
    $("secPickWrap").classList.toggle("hide", !def.secAware || !S.boot.sections.some((s) => !s.archived));
    fillShell();
    const el = $("view");
    if (def.secAware && !sec()) { el.innerHTML = emptyBox("users", "لا توجد شعبة فعّالة", "أنشئ شعبة من «الشعب والفصول والإعدادات».", '<div style="margin-top:14px"><a class="btn primary" href="#settings">الشعب والفصول</a></div>'); return; }
    try { const r = def.render(el, arg ? decodeURIComponent(arg) : null); if (r && r.catch) r.catch((e) => (el.innerHTML = emptyBox("alert", "حدث خطأ", esc(e.message)))); }
    catch (e) { console.error(e); el.innerHTML = emptyBox("alert", "حدث خطأ أثناء عرض الصفحة", esc(e.message)); }
    window.scrollTo(0, 0);
  }
  async function loadBoot() {
    S.boot = await rpc("t_bootstrap");
    const secs = S.boot.sections.filter((s) => !s.archived);
    let saved = null; try { saved = localStorage.getItem("fgu_t_sec"); } catch (e) { }
    if (!secs.find((s) => s.id === S.sec)) S.sec = (secs.find((s) => s.id === saved) || secs.find((s) => term(s.term_id).is_current) || secs[0] || {}).id || null;
  }
  async function loadSection() {
    if (!S.sec) { S.roster = []; S.assess = []; S.book = null; return; }
    [S.roster, S.assess, S.book] = await Promise.all([rpc("t_roster", { p_section: S.sec }), rpc("t_assessments", { p_section: S.sec }), rpc("t_gradebook", { p_section: S.sec })]);
    S.at = Date.now();
  }
  async function reload() { await loadBoot(); await loadSection(); route(); }
  async function start() {
    $("vLogin").classList.add("hide"); $("app").classList.remove("hide");
    $("view").innerHTML = '<div class="card pad loading">جارٍ التحميل…</div>';
    try { await loadBoot(); await loadSection(); } catch (e) { if (e.code !== "P0401" && e.code !== "P0402") $("view").innerHTML = emptyBox("alert", "تعذّر التحميل", esc(e.message)); return; }
    S.ready = true; fillShell(); route();
  }
  if (!S.shellBuilt) { buildShell(); S.shellBuilt = true; }

  // ===================== لوحة القيادة =====================
  VIEWS.dash = { title: "لوحة القيادة", secAware: true, render(el) {
    const st = active(), c = course(), s0 = sec();
    const tot = st.map((s) => s.total).filter((v) => v != null), ws = st.length ? Math.max(0, ...st.map((s) => s.wsofar || 0)) : 0;
    const avg = tot.length ? tot.reduce((a, b) => a + b, 0) / tot.length : null;
    const om = {}; st.forEach((s) => Object.entries(s.objs || {}).forEach(([k, v]) => { om[k] = om[k] || [0, 0]; om[k][0] += +v[0]; om[k][1] += +v[1]; }));
    const weak = Object.entries(om).filter(([, v]) => v[1] > 0).map(([k, v]) => [k, v[0] / v[1] * 100]).sort((a, b) => a[1] - b[1]).slice(0, 8);
    const never = S.roster.filter((r) => r.status === "active" && !r.last_login).length;
    const quizzes = S.assess.filter((a) => a.kind === "quiz"), openQ = quizzes.filter((a) => a.published && (!a.open_at || new Date(a.open_at) <= new Date()) && (!a.close_at || new Date(a.close_at) > new Date()));
    const risks = st.filter((s) => s.total != null && s.wsofar && s.total / s.wsofar < 0.6).sort((a, b) => a.total / a.wsofar - b.total / b.wsofar);
    const alerts = [];
    if (!st.length) alerts.push({ lvl: "warn", ic: "users", msg: "لا طلبة في الشعبة بعد", sub: "أضفهم لصقًا من Excel بالرقم الجامعي والاسم.", go: "#people", act: "أضف الطلبة" });
    if (never) alerts.push({ lvl: "tip", ic: "id", msg: `${never} طالبًا لم يدخلوا المنصة بعد`, sub: "يدخل كل طالب برقمه الجامعي، وكلمة مروره الأولى هي رقمه الجامعي نفسه.", go: "#people", act: "الطلبة" });
    if (!c.qcount) alerts.push({ lvl: "warn", ic: "layers", msg: "بنك الأسئلة فارغ", sub: "الاختبارات القصيرة الإلكترونية تحتاج أسئلة مربوطة بالأهداف.", go: "#bank", act: "بنك الأسئلة" });
    S.assess.filter((a) => a.kind === "manual" && a.entered < st.length && st.length).slice(0, 3).forEach((a) => alerts.push({ lvl: "tip", ic: "file", msg: `«${a.title}» رُصد لـ ${a.entered} من ${st.length}`, sub: "أكمل رصد العلامات.", go: "#assess", act: "رصد" }));
    S.assess.filter((a) => !a.published).slice(0, 3).forEach((a) => alerts.push({ lvl: "tip", ic: "eyeoff", msg: `«${a.title}» مخفي عن الطلبة`, sub: "انشره ليظهر في صفحاتهم.", go: "#assess", act: "التقويمات" }));
    let h = `<div class="vhead"><div><h2>${greet()}، الأستاذ ${esc(firstName(S.boot.me.full_name))}</h2>
      <p>${esc(new Intl.DateTimeFormat("ar-JO-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Amman" }).format(new Date()))} · الشعبة الحالية: <b>${esc(s0.name)}</b></p></div>
      <div class="toolbar"><a class="btn primary" href="#assess">${ic("file", "sm")}تقويم جديد</a><a class="btn outline" href="#book">${ic("award", "sm")}سجل العلامات</a><a class="btn outline" href="#people">${ic("users", "sm")}الطلبة</a></div></div>`;
    h += `<div class="kpi-row">
      <div class="kp">${ic("users")}<b class="num">${st.length}</b><span>طالبًا في الشعبة</span><small>${st.length - never} منهم دخلوا المنصة</small></div>
      <div class="kp">${ic("award")}<b class="num">${avg != null ? nf(avg, 1) : "—"}</b><span>متوسط المجموع</span><small>من ${nf(ws, 0)} محتسبة حتى الآن</small></div>
      <div class="kp">${ic("file")}<b class="num">${S.assess.length}</b><span>تقويمًا في الشعبة</span><small>${quizzes.length} منها اختبارات قصيرة</small></div>
      <div class="kp ${risks.length ? "warn" : ""}">${ic("alert")}<b class="num">${risks.length}</b><span>يحتاجون دعمًا</span><small>نسبتهم أقل من 60٪ مما احتُسب</small></div>
      <div class="kp">${ic("layers")}<b class="num">${c.qcount}</b><span>سؤالًا في البنك</span><small>${openQ.length} اختبار مفتوح الآن</small></div></div>`;
    h += '<div class="split" style="margin-top:22px"><div>';
    h += `<div class="sect" style="margin-top:0"><h3>${ic("spark", "sm")}يحتاج انتباهك <span class="tiny">${alerts.length ? alerts.length + " بندًا" : ""}</span></h3>`;
    h += alerts.length ? '<div class="alerts">' + alerts.map((a) => `<a class="al ${a.lvl}" href="${a.go}" style="text-decoration:none;color:inherit"><span class="dot">${ic(a.ic, "sm")}</span><span class="tx">${esc(a.msg)}<small>${esc(a.sub)}</small></span><span class="btn sm soft">${esc(a.act)}</span></a>`).join("") + "</div>"
      : emptyBox("checkc", "كل شيء على ما يرام", "لا يوجد ما يحتاج تدخّلك الآن.");
    h += "</div>";
    h += `<div class="sect"><h3>${ic("target", "sm")}خريطة إتقان الشعبة <span class="tiny">الأهداف الأضعف أولًا</span></h3>`;
    h += weak.length ? '<div class="card pad stack">' + weak.map(([k, p]) => `<a href="#objs" style="color:inherit;text-decoration:none"><div class="row sp" style="font-size:13.5px;align-items:flex-start"><span><span class="lbl-chip" dir="ltr">${k}</span> ${esc((c.objectives.find((o) => o.code === k) || {}).text || "")}</span><b class="num">${pc(p)}</b></div><div style="margin-top:6px">${lvBar(p)}</div></a>`).join("") + "</div>"
      : emptyBox("target", "لم يُقَس أي هدف بعد لهذه الشعبة", "ارصد تقويمًا يدويًّا مقسّمًا على الأهداف، أو انشر اختبارًا قصيرًا.");
    h += "</div></div><div>";
    h += `<div class="card pad"><h3 style="font-size:15.5px;margin-bottom:10px">${ic("award", "sm")} توزيع العلامات</h3><div class="list">` +
      c.components.map((k) => { const v = st.map((s) => s.comps[k.id]).filter((x) => x != null); const a = v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
        return `<div class="li"><div><b>${esc(k.title)}</b><div class="tiny">متوسط الشعبة ${pc(a)}</div></div><span class="pill">${nf(+k.weight, 0)}٪</span></div>`; }).join("") + "</div></div>";
    h += `<div class="sect"><h3>${ic("user", "sm")}يحتاجون دعمًا</h3>`;
    h += risks.length ? '<div class="risk">' + risks.slice(0, 6).map((x) => `<a class="rk" href="#objs/${x.enrollment_id}" style="text-decoration:none;color:inherit"><span class="avatar avb" style="width:32px;height:32px;font-size:13px">${esc(firstName(x.full_name).slice(0, 1))}</span>
        <span><b style="font-size:14px">${esc(x.full_name)}</b><div class="why">${nf(x.total, 1)} من ${nf(x.wsofar, 0)}</div></span><span class="scorepill">${pc(x.total / x.wsofar * 100)}</span></a>`).join("") + "</div>"
      : '<div class="card pad tiny">لا يوجد طالب نسبته أقل من 60٪ حسب البيانات الحالية.</div>';
    h += "</div>";
    h += `<div class="sect"><h3>${ic("users", "sm")}الشعب</h3><div class="stack">` + S.boot.sections.filter((s) => !s.archived).map((s) => `<button class="card secard" data-sec="${s.id}" style="${s.id === S.sec ? "border-color:var(--accent)" : ""}"><div class="hd"><span class="av">${esc(s.name.replace(/\D/g, "") || s.name.slice(0, 2))}</span>
        <div class="grow"><b>${esc(s.name)}</b><div class="tiny">${esc(term(s.term_id).name || "")} · ${s.n} طالبًا</div></div></div></button>`).join("") + "</div></div>";
    h += "</div></div>";
    el.innerHTML = h;
    el.querySelectorAll("[data-sec]").forEach((b) => (b.onclick = async () => { S.sec = b.dataset.sec; try { localStorage.setItem("fgu_t_sec", S.sec); } catch (e) { } await loadSection(); route(); }));
  } };

  // ===================== الطلبة =====================
  VIEWS.people = { title: "الطلبة", secAware: true, render(el) {
    const R = S.roster, s0 = sec(), act = R.filter((r) => r.status === "active"), wd = R.filter((r) => r.status !== "active");
    let h = `<div class="vhead"><div><h2>${esc(s0.name)} — ${esc(term(s0.term_id).name || "")}</h2><p>${act.length} طالبًا · يدخل الطالب برقمه الجامعي، وكلمة المرور الأولى هي رقمه الجامعي، ويُجبَر على تغييرها في أول دخول</p></div>
      <div class="toolbar"><button class="btn primary" id="pAdd">${ic("file", "sm")}إضافة طلبة (لصق من Excel)</button><button class="btn outline" id="pLink">${ic("refresh", "sm")}ربط طلبة سابقين</button><button class="btn outline" id="pCards">${ic("printer", "sm")}بطاقات الدخول</button></div></div>`;
    h += act.length ? `<div class="tw"><table class="t"><thead><tr><th class="num">م</th><th>الرقم الجامعي</th><th>اسم الطالب</th><th>آخر دخول</th><th class="num">الحالة</th><th></th></tr></thead><tbody>` +
      act.map((r, i) => `<tr><td class="num">${i + 1}</td><td class="mono" dir="ltr" style="text-align:right">${esc(r.username)}</td><td><a href="#objs/${r.enrollment_id}" style="color:inherit"><b>${esc(r.full_name)}</b></a></td>
        <td class="tiny">${r.last_login ? esc(fmtDT(r.last_login, false)) : '<span class="pill scheduled">لم يدخل بعد</span>'}${r.must_change && r.last_login ? ' <span class="pill">ينتظر تغيير كلمة المرور</span>' : ""}</td>
        <td class="num">${r.active ? '<span class="pill open">فعّال</span>' : '<span class="pill ended">موقوف</span>'}</td>
        <td><div class="row" style="gap:6px;justify-content:flex-end"><button class="btn sm outline" data-reset="${r.student_id}">${ic("key", "sm")}إعادة كلمة المرور</button><button class="btn sm ghost" data-edit="${r.student_id}">تعديل</button><button class="btn sm ghost" data-wd="${r.enrollment_id}">انسحاب</button></div></td></tr>`).join("") + "</tbody></table></div>"
      : emptyBox("users", "لا طلبة في هذه الشعبة بعد", "الصق قائمتهم من Excel: الرقم الجامعي ثم الاسم.", '<button class="btn primary" id="pAdd2" style="margin-top:12px">إضافة طلبة</button>');
    if (wd.length) h += `<details class="card pad" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">المنسحبون (${wd.length})</summary>` + wd.map((r) => `<div class="row sp" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${esc(r.full_name)} · <span class="mono">${esc(r.username)}</span></span><button class="btn sm outline" data-back="${r.enrollment_id}">إعادة تسجيل</button></div>`).join("") + "</details>";
    el.innerHTML = h;
    [el.querySelector("#pAdd"), el.querySelector("#pAdd2")].forEach((b) => b && (b.onclick = addStudents));
    el.querySelector("#pLink").onclick = linkStudents;
    el.querySelector("#pCards").onclick = () => cards(act.map((r) => ({ username: r.username, full_name: r.full_name })), "بطاقات الدخول — " + s0.name);
    el.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
      const r = R.find((x) => x.student_id === b.dataset.reset);
      if (!(await confirmSheet("إعادة كلمة المرور", `ستعود كلمة مرور الطالب <b>${esc(r.full_name)}</b> إلى رقمه الجامعي <b class="mono">${esc(r.username)}</b>، وتتوقف كلمته الحالية، ويُطلب منه تغييرها عند الدخول.`, "إعادة"))) return;
      try { const x = await rpc("t_reset_password", { p_student: r.student_id }); cards([{ username: x.username, full_name: r.full_name, password: x.password }], "أُعيدت كلمة المرور"); await loadSection(); }
      catch (e) { toast(e.message, true); }
    }));
    el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => {
      const r = R.find((x) => x.student_id === b.dataset.edit);
      const s = openSheet(`<h3>تعديل بيانات الطالب</h3><div class="fields"><label class="field"><span>الاسم الكامل</span><input class="input" id="eN" value="${esc(r.full_name)}"></label>
        <label class="field"><span>الرقم الجامعي (اسم الدخول)</span><input class="input mono" id="eU" dir="ltr" value="${esc(r.username)}"></label>
        <label class="field"><span>البريد الإلكتروني (اختياري)</span><input class="input" id="eE" dir="ltr" value="${esc(r.email || "")}"></label></div>
        <label class="check"><input type="checkbox" id="eA" ${r.active ? "checked" : ""}> الحساب فعّال (إيقافه يمنع دخوله إلى المنصة)</label>
        <p class="tiny">صحّح الرقم الجامعي هنا إن كان خطأ؛ يدخل الطالب بعدها بالرقم الجديد وبكلمة مروره نفسها.</p><button class="btn primary block" id="eS" style="margin-top:12px">حفظ</button>`);
      s.querySelector("#eS").onclick = async (e) => { spin(e.target, true); try { await rpc("t_update_student", { p_student: r.student_id, p: { full_name: s.querySelector("#eN").value, username: s.querySelector("#eU").value, email: s.querySelector("#eE").value, active: s.querySelector("#eA").checked } }); closeSheet(); toast("حُفظ"); await loadSection(); route(); } catch (x) { toast(x.message, true); spin(e.target, false); } };
    }));
    el.querySelectorAll("[data-wd],[data-back]").forEach((b) => (b.onclick = async () => {
      try { await rpc("t_set_enrollment", { p_enrollment: b.dataset.wd || b.dataset.back, p_status: b.dataset.wd ? "withdrawn" : "active" }); await reload(); } catch (e) { toast(e.message, true); }
    }));
  } };
  function addStudents() {
    const s = openSheet(`<h3>إضافة طلبة إلى ${esc(sec().name)}</h3><p class="tiny">الصق من Excel عمودين: <b>الرقم الجامعي | الاسم الكامل</b> (ويمكن عمود ثالث للبريد). كل طالب في سطر.<br>
      كلمة المرور الأولى لكل طالب جديد = رقمه الجامعي، ويُجبَر على تغييرها في أول دخول. وإذا كان رقمه موجودًا من فصل سابق يُربط حسابه نفسه دون تغيير كلمته.</p>
      <textarea class="input mono" id="aT" rows="9" dir="auto" placeholder="2026001	أحمد محمد علي"></textarea><div class="tiny" id="aP" style="margin-top:6px"></div>
      <button class="btn primary block" id="aGo" style="margin-top:10px">إضافة</button>`, true);
    const parse = () => s.querySelector("#aT").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const p = l.split(/\t|,|،|;/).map((x) => x.trim()); if (p.length < 2) { const i = l.indexOf(" "); return { username: l.slice(0, i), full_name: l.slice(i + 1).trim() }; } return { username: p[0], full_name: p[1], email: p[2] || "" }; });
    s.querySelector("#aT").oninput = () => { const r = parse(); s.querySelector("#aP").textContent = r.length ? r.length + " طالبًا: " + r.slice(0, 3).map((x) => x.username + " — " + x.full_name).join("، ") + (r.length > 3 ? "…" : "") : ""; };
    s.querySelector("#aGo").onclick = async (e) => {
      const rows = parse(); if (!rows.length) return toast("الصق قائمة الطلبة أولًا", true);
      spin(e.target, true, "جارٍ الإضافة…");
      try { const res = await rpc("t_add_students", { p_section: S.sec, p_rows: rows }); toast("أُضيف " + res.length + " طالبًا"); await reload(); const nw = res.filter((x) => x.password); if (nw.length) cards(nw, "بطاقات دخول الطلبة الجدد"); else closeSheet(); }
      catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }
  async function linkStudents() {
    let all; try { all = await rpc("t_all_students"); } catch (e) { return toast(e.message, true); }
    const inSec = new Set(S.roster.map((r) => r.student_id)), cand = all.filter((x) => !inSec.has(x.id));
    const s = openSheet(`<h3>ربط طلبة سابقين بـ ${esc(sec().name)}</h3><p class="tiny">يحتفظ الطالب بحسابه وكلمة مروره، وتبقى علاماته في الشعب السابقة كما هي.</p>` + (cand.length ?
      `<input class="input" id="lQ" placeholder="ابحث بالاسم أو الرقم الجامعي" style="margin:8px 0"><div class="tw" style="max-height:55vh"><table class="t"><thead><tr><th></th><th>الرقم الجامعي</th><th>الاسم</th><th>شعبه السابقة</th></tr></thead><tbody>` +
      cand.map((x) => `<tr data-q="${esc((x.username + " " + x.full_name).toLowerCase())}"><td><input type="checkbox" value="${x.id}"></td><td class="mono">${esc(x.username)}</td><td>${esc(x.full_name)}</td><td class="tiny">${esc(x.sections.join("، "))}</td></tr>`).join("") +
      `</tbody></table></div><button class="btn primary block" id="lGo" style="margin-top:10px">ربط المحددين</button>` : emptyBox("users", "لا يوجد طلبة سابقون غير مسجّلين في هذه الشعبة", "")), true);
    if (!cand.length) return;
    s.querySelector("#lQ").oninput = (e) => { const v = e.target.value.trim().toLowerCase(); s.querySelectorAll("tr[data-q]").forEach((tr) => tr.classList.toggle("hide", !!v && !tr.dataset.q.includes(v))); };
    s.querySelector("#lGo").onclick = async (e) => {
      const ids = [...s.querySelectorAll("input[type=checkbox]:checked")].map((x) => x.value); if (!ids.length) return toast("اختر طالبًا واحدًا على الأقل", true);
      spin(e.target, true); try { await rpc("t_enroll", { p_section: S.sec, p_students: ids }); closeSheet(); toast("رُبط " + ids.length + " طالبًا"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }
  function cards(list, title) {
    const url = location.origin + location.pathname.replace(/teacher\.html$/, ""), withPw = list.some((x) => x.password);
    const s = openSheet(`<h3>${esc(title)}</h3><p class="tiny noprint">${withPw ? "كلمة المرور الأولى = الرقم الجامعي، ويُجبَر الطالب على تغييرها عند أول دخول." : "الدخول بالرقم الجامعي. كلمة المرور الأولى هي الرقم الجامعي نفسه، ومن غيّرها ونسيها تعيدها له من «إعادة كلمة المرور»."}</p>
      <div class="tw"><table class="t creds"><thead><tr><th>الاسم</th><th>الرقم الجامعي (اسم الدخول)</th>${withPw ? "<th>كلمة المرور الأولى</th>" : ""}</tr></thead><tbody>
      ${list.map((x) => `<tr><td>${esc(x.full_name)}</td><td class="mono">${esc(x.username)}</td>${withPw ? `<td class="pw">${esc(x.password || "— (حساب سابق، كلمته كما هي)")}</td>` : ""}</tr>`).join("")}</tbody></table></div>
      <p class="tiny" style="margin-top:10px">رابط المنصة: <span dir="ltr">${esc(url)}</span></p>
      <div class="row noprint" style="margin-top:12px"><button class="btn outline grow" id="cC">${ic("file", "sm")}نسخ كنص</button><button class="btn primary grow" onclick="window.print()">${ic("printer", "sm")}طباعة</button></div>`, true);
    s.querySelector("#cC").onclick = () => copy(list.map((x) => x.full_name + "\t" + x.username + (x.password ? "\t" + x.password : "")).join("\n") + "\n" + url);
  }

  // ===================== التقويمات ورصد العلامات =====================
  VIEWS.assess = { title: "التقويمات ورصد العلامات", secAware: true, render(el) {
    const c = course(), st = active();
    let h = `<div class="vhead"><div><h2>التقويمات</h2><p>مرتبة على توزيع العلامات في الخطة الدراسية. كل تقويم يدوي يُقسَّم إلى أجزاء مربوطة بأهداف الفصول، والاختبار القصير يُسحب من بنك الأسئلة.</p></div>
      <div class="toolbar"><button class="btn primary" id="aNew">＋ تقويم جديد</button></div></div>`;
    h += c.components.map((k) => { const A = S.assess.filter((a) => a.component_id === k.id);
      return `<div class="sect"><h3>${ic(k.kind === "quiz" ? "file" : k.kind === "project" ? "flag" : k.kind === "tasks" ? "check" : "award", "sm")}${esc(k.title)} <span class="pill">${nf(+k.weight, 0)}٪</span></h3>` +
        (A.length ? '<div class="g2">' + A.map((a) => { const codes = a.kind === "quiz" ? (a.quiz.objectives || []) : [...new Set(a.parts.map((p) => p.objective_code))];
          const prog = a.kind === "quiz" ? a.takers : a.entered, of = st.length || 1;
          return `<div class="card secard"><div class="row sp"><b style="font-family:var(--f-disp)">${esc(a.title)}</b><span class="pill ${a.published ? "open" : "scheduled"}">${a.published ? "منشور" : "مخفي"}</span></div>
            <div class="tiny">${a.kind === "quiz" ? `اختبار قصير · ${a.quiz.n} أسئلة${a.quiz.minutes ? " · " + a.quiz.minutes + " د" : ""} · ${a.attempts} محاولة من ${a.takers} طالبًا${a.close_at ? " · يُغلق " + esc(fmtDT(a.close_at, false)) : ""}` : `يدوي · ${a.parts.length} أجزاء · من ${nf(+a.max_score, 2)} · رُصد لـ ${a.entered} من ${st.length}`}${a.counted ? "" : " · لا يُحتسب"}</div>
            <div class="meter"><i style="width:${Math.round(prog / of * 100)}%"></i></div>
            <div class="row wrap" style="gap:4px">${codes.slice(0, 10).map((x) => `<span class="lbl-chip" dir="ltr">${x}</span>`).join("")}${codes.length > 10 ? `<span class="tiny">+${codes.length - 10}</span>` : ""}</div>
            <div class="row" style="gap:6px">${a.kind === "manual" ? `<button class="btn sm primary" data-marks="${a.id}">${ic("check", "sm")}رصد العلامات</button>` : ""}<button class="btn sm outline" data-ed="${a.id}">تعديل</button><button class="btn sm ghost" data-del="${a.id}">حذف</button></div></div>`; }).join("") + "</div>"
          : '<div class="card pad tiny">لا تقويمات في هذا المكوّن بعد.</div>') + "</div>"; }).join("");
    el.innerHTML = h;
    el.querySelector("#aNew").onclick = () => editAssessment(null);
    el.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => editAssessment(S.assess.find((a) => a.id === b.dataset.ed))));
    el.querySelectorAll("[data-marks]").forEach((b) => (b.onclick = () => marks(S.assess.find((a) => a.id === b.dataset.marks))));
    el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      const a = S.assess.find((x) => x.id === b.dataset.del);
      if (!(await confirmSheet("حذف التقويم", `سيُحذف «${esc(a.title)}» نهائيًّا مع كل علاماته ومحاولات الطلبة فيه.`, "حذف", true))) return;
      try { await rpc("t_delete_assessment", { p_id: a.id }); toast("حُذف"); await reload(); } catch (e) { toast(e.message, true); }
    }));
  } };
  function objPicker(sel) {
    const set = new Set(sel || []);
    return '<div class="objpick">' + chs().map((ch) => `<details><summary><input type="checkbox" data-chall="${ch.ch}"> الفصل ${ch.ch}: ${esc(ch.title)} <span class="pill" data-chc="${ch.ch}"></span></summary>
      ${ch.objs.map((o) => `<label class="ob"><input type="checkbox" name="qo" value="${o.code}" data-ch="${ch.ch}" ${set.has(o.code) ? "checked" : ""}><span><b dir="ltr">${o.code}</b> ${esc(o.text)}</span></label>`).join("")}</details>`).join("") + "</div>";
  }
  async function editAssessment(a) {
    const c = course();
    if (!S.qs) { try { S.qs = await rpc("t_questions", { p_course: c.id }); } catch (e) { return toast(e.message, true); } }
    const k0 = a ? a.component_id : c.components[0].id, isQ = (id) => comp(id).kind === "quiz";
    const objOpts = (sel) => chs().map((ch) => `<optgroup label="الفصل ${ch.ch}">${ch.objs.map((o) => `<option value="${o.code}" ${o.code === sel ? "selected" : ""}>${o.code} — ${esc(o.text.slice(0, 60))}</option>`).join("")}</optgroup>`).join("");
    const s = openSheet(`<h3>${a ? "تعديل تقويم" : "تقويم جديد"}</h3>
      <div class="fields two"><label class="field"><span>المكوّن (من توزيع العلامات)</span><select class="input" id="xC">${opt(k0, c.components.map((k) => [k.id, k.title + " (" + nf(+k.weight, 0) + "٪)"]))}</select></label>
        <label class="field"><span>العنوان</span><input class="input" id="xT" value="${esc(a ? a.title : "")}" placeholder="مثال: اختبار الفصل 6 / المحطة 3"></label></div>
      <label class="field"><span>طريقة التقويم</span><select class="input" id="xK" ${a ? "disabled" : ""}><option value="manual">يدوي: أرصد العلامات بنفسي مقسّمة على الأهداف</option><option value="quiz">اختبار قصير إلكتروني يحلّه الطالب على المنصة</option></select></label>
      <div class="row wrap" style="gap:16px;margin-bottom:10px"><label class="check"><input type="checkbox" id="xP" ${a && a.published ? "checked" : ""}> منشور للطلبة</label><label class="check"><input type="checkbox" id="xN" ${!a || a.counted ? "checked" : ""}> يُحتسب في العلامة</label></div>
      <div id="xMan"><div class="tipbox tiny" style="margin-bottom:10px">قسّم التقويم إلى أجزاء (أسئلة أو بنود معيار تصحيح) واربط كل جزء بهدف؛ فتُحسب العلامة وإتقان كل هدف تلقائيًّا.</div>
        <div class="partrow tiny" style="font-weight:700"><span>الجزء</span><span>الهدف</span><span>العلامة القصوى</span><span></span></div><div id="xParts"></div>
        <div class="row wrap" style="gap:8px;margin-top:8px"><button class="btn sm outline" id="xAdd">＋ جزء</button><select class="input" id="xFill" style="width:auto;min-height:34px"><option value="">تعبئة: جزء لكل هدف من فصل…</option>${chs().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch}</option>`).join("")}</select>
          <span class="tiny" style="margin-inline-start:auto">المجموع: <b class="num" id="xSum">0</b></span></div></div>
      <div id="xQuiz" class="hide"><div class="fields four">
        <label class="field"><span>أسئلة كل محاولة</span><input class="input" type="number" id="qN" min="1" value="${a && a.quiz ? a.quiz.n : 10}"></label>
        <label class="field"><span>العلامة القصوى</span><input class="input" type="number" id="qM" min="1" value="${a ? +a.max_score : 10}"></label>
        <label class="field"><span>المدة بالدقائق (0 بلا حد)</span><input class="input" type="number" id="qT" min="0" value="${a && a.quiz ? (a.quiz.minutes || 0) : 15}"></label>
        <label class="field"><span>المحاولات (0 غير محدود)</span><input class="input" type="number" id="qA" min="0" value="${a && a.quiz ? (a.quiz.attempts || 0) : 0}"></label></div>
        <div class="fields two"><label class="field"><span>يفتح في</span><input class="input" type="datetime-local" id="qO" value="${a && a.open_at ? toLocalInput(a.open_at) : ""}"></label>
          <label class="field"><span>يُغلق في</span><input class="input" type="datetime-local" id="qC" value="${a && a.close_at ? toLocalInput(a.close_at) : ""}"></label></div>
        <div class="tipbox tiny" style="margin-bottom:10px">حسب الخطة الدراسية: يُعاد الاختبار القصير وتُحتسب أفضل محاولة. تُسحب أسئلة عشوائية من الأهداف المختارة مع خلط البدائل، وتظهر الإجابات الصحيحة بعد الإغلاق فقط، ومن لم يحلّه حتى الإغلاق يُحسب له صفر.</div>
        <b style="font-size:14px">الأهداف التي يقيسها <span class="tiny" id="qAv"></span></b>${objPicker(a && a.quiz ? a.quiz.objectives : [])}</div>
      <button class="btn primary block lg" id="xS" style="margin-top:14px">حفظ التقويم</button>`, true);
    const kS = s.querySelector("#xK"); kS.value = a ? a.kind : (isQ(k0) ? "quiz" : "manual");
    const showK = () => { s.querySelector("#xMan").classList.toggle("hide", kS.value !== "manual"); s.querySelector("#xQuiz").classList.toggle("hide", kS.value !== "quiz"); };
    s.querySelector("#xC").onchange = () => { if (!a) { kS.value = isQ(s.querySelector("#xC").value) ? "quiz" : "manual"; showK(); } };
    kS.onchange = showK; showK();
    const box = s.querySelector("#xParts");
    const sum = () => (s.querySelector("#xSum").textContent = [...box.querySelectorAll("[data-pm]")].reduce((t, x) => t + (+x.value || 0), 0));
    const addRow = (p) => { const d = document.createElement("div"); d.className = "partrow"; if (p && p.id) d.dataset.id = p.id;
      d.innerHTML = `<input class="input" data-pl value="${esc(p ? p.label : "س" + (box.children.length + 1))}"><select class="input" data-po>${objOpts(p && p.objective_code)}</select><input class="input" type="number" data-pm min="0.25" step="0.25" value="${p ? +p.max_score : 5}"><button class="btn sm ghost" type="button" data-rm>✕</button>`;
      box.appendChild(d); d.querySelector("[data-rm]").onclick = () => { d.remove(); sum(); }; d.querySelector("[data-pm]").oninput = sum; d.oninput = () => (d.dataset.touched = 1); sum(); };
    (a && a.parts.length ? a.parts : a ? [] : [null]).forEach(addRow);
    s.querySelector("#xAdd").onclick = () => addRow(null);
    s.querySelector("#xFill").onchange = (e) => { const ch = chs().find((x) => x.ch === +e.target.value); if (!ch) return; if (!a && box.children.length === 1 && !box.children[0].dataset.touched) box.children[0].remove(); ch.objs.forEach((o) => addRow({ label: "ب " + o.code, objective_code: o.code, max_score: 5 })); e.target.value = ""; };
    const upd = () => { chs().forEach((ch) => { const all = [...s.querySelectorAll(`input[name=qo][data-ch="${ch.ch}"]`)], on = all.filter((x) => x.checked).length, h = s.querySelector(`[data-chall="${ch.ch}"]`); h.checked = on === all.length; h.indeterminate = on > 0 && on < all.length; s.querySelector(`[data-chc="${ch.ch}"]`).textContent = on ? on + "/" + all.length : ""; });
      const sel = new Set([...s.querySelectorAll("input[name=qo]:checked")].map((x) => x.value)); s.querySelector("#qAv").textContent = "— متاح في البنك " + S.qs.filter((q) => q.active && sel.has(q.objective_code)).length + " سؤالًا"; };
    s.querySelectorAll("[data-chall]").forEach((h) => { h.onclick = (e) => e.stopPropagation(); h.onchange = () => { s.querySelectorAll(`input[name=qo][data-ch="${h.dataset.chall}"]`).forEach((x) => (x.checked = h.checked)); upd(); }; });
    s.querySelectorAll("input[name=qo]").forEach((x) => (x.onchange = upd)); upd();
    s.querySelector("#xS").onclick = async (e) => {
      const p = { id: a ? a.id : null, section_id: S.sec, component_id: s.querySelector("#xC").value, title: s.querySelector("#xT").value, kind: kS.value, published: s.querySelector("#xP").checked, counted: s.querySelector("#xN").checked };
      if (p.kind === "manual") { p.parts = [...box.children].map((d) => ({ id: d.dataset.id || null, label: d.querySelector("[data-pl]").value, objective_code: d.querySelector("[data-po]").value, max_score: +d.querySelector("[data-pm]").value })); if (p.parts.some((x) => !(x.max_score > 0))) return toast("العلامة القصوى لكل جزء يجب أن تكون أكبر من صفر", true); }
      else { p.max_score = +s.querySelector("#qM").value; p.open_at = fromLocalInput(s.querySelector("#qO").value); p.close_at = fromLocalInput(s.querySelector("#qC").value);
        p.quiz = { n: +s.querySelector("#qN").value, minutes: +s.querySelector("#qT").value, attempts: +s.querySelector("#qA").value, objectives: [...s.querySelectorAll("input[name=qo]:checked")].map((x) => x.value) }; }
      spin(e.target, true, "جارٍ الحفظ…");
      try { await rpc("t_save_assessment", { p }); closeSheet(); toast("حُفظ التقويم"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }
  async function marks(a) {
    let sc; try { sc = await rpc("t_scores", { p_assessment: a.id }); } catch (e) { return toast(e.message, true); }
    const st = active();
    const s = openSheet(`<h3>رصد علامات: ${esc(a.title)}</h3><p class="tiny">الخانة الفارغة = لم تُرصد بعد (وتُحسب صفرًا ما دام التقويم يُحتسب). Enter للانتقال إلى الطالب التالي.</p>
      <div class="tw" style="max-height:62vh"><table class="t sticky1"><thead><tr><th>الطالب</th>${a.parts.map((p) => `<th class="num">${esc(p.label)}<div class="tiny" dir="ltr">${p.objective_code} · /${+p.max_score}</div></th>`).join("")}<th class="num">المجموع /${nf(+a.max_score, 2)}</th></tr></thead><tbody>
      ${st.map((x) => `<tr data-e="${x.enrollment_id}"><td><b>${esc(x.full_name)}</b><div class="tiny mono">${esc(x.username)}</div></td>${a.parts.map((p) => { const v = sc[x.enrollment_id + ":" + p.id]; return `<td class="num"><input class="input mark-in num" type="number" min="0" max="${+p.max_score}" step="0.25" data-p="${p.id}" data-max="${+p.max_score}" value="${v == null ? "" : +v}" data-o="${v == null ? "" : +v}"></td>`; }).join("")}<td class="num" data-tot></td></tr>`).join("")}
      </tbody></table></div><div class="row" style="margin-top:12px"><span class="tiny grow" id="mChg"></span><button class="btn primary" id="mS">${ic("check", "sm")}حفظ العلامات</button></div>`, true);
    const ins = [...s.querySelectorAll("input.mark-in")];
    const recalc = () => { let ch = 0; s.querySelectorAll("tr[data-e]").forEach((tr) => { let t = 0; tr.querySelectorAll("input").forEach((i) => { const v = i.value === "" ? null : +i.value; i.classList.toggle("bad", v != null && (v < 0 || v > +i.dataset.max)); t += v || 0; if (i.value !== i.dataset.o) ch++; }); tr.querySelector("[data-tot]").textContent = nf(t, 2); }); s.querySelector("#mChg").textContent = ch ? "• " + ch + " تعديلًا غير محفوظ" : ""; };
    ins.forEach((i, k) => { i.oninput = recalc; i.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); const n = ins[k + a.parts.length] || ins[k + 1]; if (n) n.focus(); } }; });
    recalc();
    s.querySelector("#mS").onclick = async (e) => {
      if (s.querySelector("input.mark-in.bad")) return toast("في علامات خارج المدى المسموح", true);
      const rows = []; s.querySelectorAll("tr[data-e]").forEach((tr) => tr.querySelectorAll("input").forEach((i) => { if (i.value !== i.dataset.o) rows.push({ enrollment_id: tr.dataset.e, part_id: i.dataset.p, score: i.value === "" ? null : +i.value }); }));
      if (!rows.length) return closeSheet();
      spin(e.target, true, "جارٍ الحفظ…");
      try { await rpc("t_save_scores", { p_rows: rows }); closeSheet(); toast("حُفظت " + rows.length + " علامة"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }

  // ===================== سجل العلامات =====================
  VIEWS.book = { title: "سجل العلامات", secAware: true, render(el) {
    const B = S.book, st = B.students, byC = B.components.map((k) => ({ k, A: B.assessments.filter((a) => a.component_id === k.id) }));
    let h = `<div class="vhead"><div><h2>سجل علامات ${esc(sec().name)}</h2><p>النسبة لكل تقويم من 100٪. علامة المكوّن = متوسط تقويماته × وزنه، والمجموع من الأوزان المحتسبة حتى الآن.</p></div>
      <div class="toolbar"><button class="btn outline" id="bCsv">${ic("file", "sm")}تصدير Excel</button><button class="btn outline" onclick="window.print()">${ic("printer", "sm")}طباعة</button></div></div>`;
    h += st.length ? `<div class="tw"><table class="t sticky1"><thead><tr><th rowspan="2">الطالب</th>${byC.map((x) => `<th class="num" colspan="${x.A.length + 1}">${esc(x.k.title)} (${nf(+x.k.weight, 0)}٪)</th>`).join("")}<th class="num" rowspan="2">المجموع</th><th class="num" rowspan="2">من</th></tr>
      <tr>${byC.map((x) => x.A.map((a) => `<th class="num" title="${esc(a.title)}">${esc(a.title.slice(0, 14))}${a.published ? "" : " *"}</th>`).join("") + '<th class="num">العلامة</th>').join("")}</tr></thead><tbody>` +
      st.map((x) => `<tr${x.status !== "active" ? ' style="opacity:.5"' : ""}><td><a href="#objs/${x.enrollment_id}" style="color:inherit"><b>${esc(x.full_name)}</b></a><div class="tiny mono">${esc(x.username)}</div></td>
        ${byC.map((c) => c.A.map((a) => `<td class="num">${x.items[a.id] == null ? "—" : nf(x.items[a.id], 1)}</td>`).join("") + `<td class="num"><b>${x.comps[c.k.id] == null ? "—" : nf(x.comps[c.k.id] * c.k.weight / 100, 2)}</b></td>`).join("")}
        <td class="num"><b class="score">${x.total == null ? "—" : nf(x.total, 2)}</b></td><td class="num tiny">${nf(x.wsofar || 0, 0)}</td></tr>`).join("") + '</tbody></table></div><p class="tiny" style="margin-top:8px">* تقويم مخفي عن الطلبة (يظهر لك فقط).</p>'
      : emptyBox("users", "لا طلبة بعد", "");
    el.innerHTML = h;
    el.querySelector("#bCsv") && (el.querySelector("#bCsv").onclick = () => {
      const head = ["الرقم الجامعي", "الاسم", ...byC.flatMap((x) => [...x.A.map((a) => a.title + " ٪"), x.k.title + " (" + x.k.weight + ")"]), "المجموع", "الأوزان المحتسبة"];
      const rows = st.map((x) => [x.username, x.full_name, ...byC.flatMap((c) => [...c.A.map((a) => x.items[a.id] ?? ""), x.comps[c.k.id] != null ? Math.round(x.comps[c.k.id] * c.k.weight) / 100 : ""]), x.total ?? "", x.wsofar ?? 0]);
      download("علامات " + sec().name + ".csv", csv([head, ...rows]));
    });
  } };

  // ===================== إتقان الأهداف =====================
  VIEWS.objs = { title: "إتقان الأهداف", secAware: true, render(el, arg) {
    const c = course(), st = active();
    if (arg) { const x = S.book.students.find((s) => s.enrollment_id === arg); if (x) return studentProfile(el, x); }
    const agg = {}; st.forEach((s) => Object.entries(s.objs || {}).forEach(([k, v]) => { agg[k] = agg[k] || [0, 0, 0]; agg[k][0] += +v[0]; agg[k][1] += +v[1]; agg[k][2]++; }));
    const oc = outcomeMastery(c, Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, [v[0], v[1]]])));
    let h = `<div class="vhead"><div><h2>إتقان الأهداف — ${esc(sec().name)}</h2><p>النسبة = ما حصّله الطلبة في الأجزاء والأسئلة المربوطة بالهدف ÷ العلامات القصوى لها. المستويات بنظام المنصة: مبتدئ · نامٍ · متمكّن · متميّز.</p></div>
      <div class="toolbar"><select class="input" id="oStu" style="min-width:220px"><option value="">ملف طالب…</option>${st.map((x) => `<option value="${x.enrollment_id}">${esc(x.full_name)}</option>`).join("")}</select></div></div>`;
    h += `<div class="sect" style="margin-top:0"><h3>${ic("chart", "sm")}نتاجات المقرر (الخطة الدراسية)</h3><div class="card list">` + oc.map((o) => `<div class="li" style="align-items:flex-start"><div class="grow"><span class="lbl-chip">${o.seq}</span> ${esc(o.text)}<div style="margin-top:6px">${lvBar(o.pct)}</div></div><div style="text-align:left;min-width:90px"><b class="num">${pc(o.pct)}</b><div>${lvChip(o.pct)}</div></div></div>`).join("") + "</div></div>";
    h += `<div class="sect"><h3>${ic("target", "sm")}أهداف الفصول — متوسط الشعبة</h3>` + chs().map((ch, i) => { const cnt = [0, 0, 0, 0, 0]; ch.objs.forEach((o) => { const v = agg[o.code]; cnt[v && v[1] ? lvOf(v[0] / v[1] * 100) : 0]++; });
      return `<details class="unit" ${i === 0 ? "open" : ""}><summary><div class="ibox">${ic("layers")}</div><div class="grow"><h3>الفصل ${ch.ch}: ${esc(ch.title)}</h3><div class="tiny">${ch.objs.length} أهداف · قيس منها ${ch.objs.length - cnt[0]}</div></div>
        <div class="dist">${[1, 2, 3, 4].map((k) => `<i class="d${k}" style="width:${(cnt[k] / ch.objs.length) * 100}%"></i>`).join("")}</div></summary>
        ${ch.objs.map((o) => { const v = agg[o.code], p = v && v[1] ? v[0] / v[1] * 100 : null; return `<div class="oc"><span class="lbl-chip" dir="ltr">${o.code}</span><span>${esc(o.text)}${v ? `<span class="tiny" style="display:block">${pc(p)} · ${v[2]} طالبًا</span>` : ""}</span>${lvChip(p)}</div>`; }).join("")}</details>`; }).join("") + "</div>";
    el.innerHTML = h;
    el.querySelector("#oStu").onchange = (e) => { if (e.target.value) location.hash = "#objs/" + e.target.value; };
  } };
  function studentProfile(el, x) {
    const c = course(), O = x.objs || {}, oc = outcomeMastery(c, O);
    let h = `<div class="vhead"><div><h2>${esc(x.full_name)}</h2><p>الرقم الجامعي <span class="mono">${esc(x.username)}</span> · المجموع <b>${x.total == null ? "—" : nf(x.total, 2)}</b> من ${nf(x.wsofar || 0, 0)}</p></div>
      <div class="toolbar"><a class="btn outline" href="#objs">${ic("right", "sm")}كل الشعبة</a><button class="btn outline" onclick="window.print()">${ic("printer", "sm")}طباعة التقرير</button></div></div>`;
    h += '<div class="kpi-row">' + c.components.map((k) => `<div class="kp">${ic("award")}<b class="num">${x.comps[k.id] == null ? "—" : nf(x.comps[k.id] * k.weight / 100, 2)}</b><span>${esc(k.title)}</span><small>من ${nf(+k.weight, 0)}</small></div>`).join("") + "</div>";
    h += `<div class="sect"><h3>${ic("chart", "sm")}نتاجات المقرر</h3><div class="card list">` + oc.map((o) => `<div class="li"><div class="grow"><span class="lbl-chip">${o.seq}</span> ${esc(o.text)}<div style="margin-top:6px">${lvBar(o.pct)}</div></div><b class="num">${pc(o.pct)}</b></div>`).join("") + "</div></div>";
    h += `<div class="sect"><h3>${ic("target", "sm")}أهداف الفصول</h3>` + chs().map((ch) => `<details class="unit"><summary><div class="ibox">${ic("layers")}</div><div class="grow"><h3>الفصل ${ch.ch}: ${esc(ch.title)}</h3></div></summary>
      ${ch.objs.map((o) => { const v = O[o.code], p = v && +v[1] ? v[0] / v[1] * 100 : null; return `<div class="oc"><span class="lbl-chip" dir="ltr">${o.code}</span><span>${esc(o.text)}${v ? `<span class="tiny" style="display:block">${nf(+v[0], 2)} من ${nf(+v[1], 2)} · ${pc(p)}</span>` : ""}</span>${lvChip(p)}</div>`; }).join("")}</details>`).join("") + "</div>";
    el.innerHTML = h;
  }

  // ===================== بنك الأسئلة =====================
  VIEWS.bank = { title: "بنك الأسئلة", async render(el) {
    const c = course();
    if (!S.qs) { el.innerHTML = '<div class="card pad loading">جارٍ تحميل البنك…</div>'; S.qs = await rpc("t_questions", { p_course: c.id }); }
    const Q = S.qs, cnt = {}; Q.forEach((q) => { if (q.active) cnt[q.objective_code] = (cnt[q.objective_code] || 0) + 1; });
    let h = `<div class="vhead"><div><h2>بنك الأسئلة</h2><p>${Q.filter((q) => q.active).length} سؤالًا فعّالًا و${Q.filter((q) => !q.active).length} مؤرشفًا. كل سؤال مربوط بهدف من أهداف الفصول، ومنه تُسحب الاختبارات القصيرة.</p></div>
      <div class="toolbar"><button class="btn primary" id="qNew">＋ سؤال</button><button class="btn outline" id="qImp">${ic("file", "sm")}استيراد ملف أسئلة</button></div></div>
      <div class="card pad" style="margin-bottom:12px"><div class="row wrap" style="gap:8px"><select class="input" id="fCh" style="width:auto"><option value="">كل الفصول</option>${chs().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch} (${ch.objs.reduce((t, o) => t + (cnt[o.code] || 0), 0)})</option>`).join("")}</select>
        <select class="input" id="fOb" style="width:auto"><option value="">كل الأهداف</option>${c.objectives.map((o) => `<option value="${o.code}">${o.code} (${cnt[o.code] || 0})</option>`).join("")}</select>
        <label class="check"><input type="checkbox" id="fAr"> المؤرشفة</label></div></div><div id="qList"></div>`;
    el.innerHTML = h;
    const draw = () => {
      const ch = el.querySelector("#fCh").value, ob = el.querySelector("#fOb").value, ar = el.querySelector("#fAr").checked;
      const Lq = Q.filter((q) => (ar || q.active) && (!ob || q.objective_code === ob) && (!ch || q.objective_code.split("-")[0] === ch));
      el.querySelector("#qList").innerHTML = Lq.length ? '<div class="stack">' + Lq.slice(0, 300).map((q) => `<div class="card pad qitem" style="${q.active ? "" : "opacity:.55"}"><div class="row sp"><span class="row" style="gap:6px"><span class="lbl-chip" dir="ltr">${q.objective_code}</span>${q.difficulty ? `<span class="pill">${esc(q.difficulty)}</span>` : ""}${q.bloom ? `<span class="pill">${esc(q.bloom)}</span>` : ""}</span>
        <span class="row" style="gap:6px"><button class="btn sm outline" data-qe="${q.id}">تعديل</button><button class="btn sm ghost" data-qa="${q.id}">${q.active ? "أرشفة" : "استرجاع"}</button></span></div>
        <div class="stem" style="margin-top:8px">${esc(q.stem)}</div><div class="opts">${q.options.map((o, i) => `<div class="opt rvo ${i === q.correct ? "is-ok" : ""}"><span class="L">${"abcdef"[i]}</span><span class="grow">${esc(o)}</span></div>`).join("")}</div>
        ${q.explanation ? `<p class="tiny" style="margin-top:8px">التفسير: ${esc(q.explanation)}</p>` : ""}</div>`).join("") + "</div>" + (Lq.length > 300 ? '<p class="tiny">يُعرض أول 300 سؤال؛ استعمل التصفية.</p>' : "")
        : emptyBox("layers", "لا أسئلة بهذه التصفية", Q.length ? "" : "يُضاف بنك أسئلة الكتاب كاملًا عبر «استيراد ملف أسئلة».");
      el.querySelectorAll("[data-qe]").forEach((b) => (b.onclick = () => editQ(Q.find((q) => q.id === b.dataset.qe))));
      el.querySelectorAll("[data-qa]").forEach((b) => (b.onclick = async () => { const q = Q.find((x) => x.id === b.dataset.qa); try { await rpc("t_set_question_active", { p_id: q.id, p_active: !q.active }); q.active = !q.active; S.boot = await rpc("t_bootstrap"); route(); } catch (e) { toast(e.message, true); } }));
    };
    ["#fCh", "#fOb", "#fAr"].forEach((x) => (el.querySelector(x).onchange = draw)); draw();
    el.querySelector("#qNew").onclick = () => editQ(null);
    el.querySelector("#qImp").onclick = () => {
      const s = openSheet(`<h3>استيراد ملف أسئلة</h3><p class="tiny">ملف JSON كما يُسلَّم مع بنك الكتاب: مصفوفة عناصر بالشكل <span dir="ltr">{"objective_code":"6-2","stem":"…","options":["…","…","…","…"],"correct":0,"difficulty":"متوسط","bloom":"تطبيق","explanation":"…"}</span></p>
        <input type="file" class="input" id="iF" accept=".json,application/json" style="margin:8px 0"><textarea class="input mono" id="iT" rows="8" dir="ltr"></textarea><div class="tiny" id="iP"></div>
        <button class="btn primary block" id="iGo" style="margin-top:10px">استيراد</button>`, true);
      const parse = () => { const j = JSON.parse(s.querySelector("#iT").value); return Array.isArray(j) ? j : j.questions; };
      s.querySelector("#iT").oninput = () => { try { s.querySelector("#iP").textContent = parse().length + " سؤالًا جاهزًا للاستيراد."; } catch (e) { s.querySelector("#iP").textContent = "النص ليس ملف أسئلة صالحًا بعد."; } };
      s.querySelector("#iF").onchange = async (e) => { const f = e.target.files[0]; if (f) { s.querySelector("#iT").value = await f.text(); s.querySelector("#iT").oninput(); } };
      s.querySelector("#iGo").onclick = async (e) => {
        let arr; try { arr = parse(); } catch (x) { return toast("الملف غير صالح", true); }
        spin(e.target, true, "جارٍ الاستيراد…");
        try { let n = 0; for (let i = 0; i < arr.length; i += 200) n += (await rpc("t_import_questions", { p_course: c.id, p_rows: arr.slice(i, i + 200) })).n; closeSheet(); toast("استُورد " + n + " سؤالًا"); S.qs = null; S.boot = await rpc("t_bootstrap"); route(); }
        catch (x) { toast(x.message, true); spin(e.target, false); }
      };
    };
  } };
  function editQ(q) {
    const c = course();
    const s = openSheet(`<h3>${q ? "تعديل سؤال" : "سؤال جديد"}</h3>
      <label class="field"><span>الهدف</span><select class="input" id="qO">${chs().map((ch) => `<optgroup label="الفصل ${ch.ch}: ${esc(ch.title)}">${ch.objs.map((o) => `<option value="${o.code}" ${q && q.objective_code === o.code ? "selected" : ""}>${o.code} — ${esc(o.text.slice(0, 70))}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <label class="field"><span>نص السؤال</span><textarea class="input" id="qS" rows="3">${esc(q ? q.stem : "")}</textarea></label>
      <div class="tiny" style="margin-bottom:6px">البدائل — اختر الدائرة بجانب الإجابة الصحيحة</div><div id="qOp"></div><button class="btn sm outline" id="qAdd" type="button">＋ بديل</button>
      <div class="fields two" style="margin-top:10px"><label class="field"><span>الصعوبة</span><select class="input" id="qD">${opt(q && q.difficulty, [["", "—"], ["سهل", "سهل"], ["متوسط", "متوسط"], ["صعب", "صعب"]])}</select></label>
        <label class="field"><span>مستوى بلوم</span><select class="input" id="qB">${opt(q && q.bloom, [["", "—"], ["تذكّر", "تذكّر"], ["فهم", "فهم"], ["تطبيق", "تطبيق"], ["تحليل", "تحليل"], ["تقويم", "تقويم"], ["إبداع", "إبداع"]])}</select></label></div>
      <label class="field"><span>التفسير (يظهر للطالب بعد إغلاق الاختبار)</span><textarea class="input" id="qE" rows="2">${esc(q ? q.explanation || "" : "")}</textarea></label>
      <button class="btn primary block" id="qSv">حفظ السؤال</button>`, true);
    const box = s.querySelector("#qOp");
    const add = (t, on) => { const d = document.createElement("div"); d.className = "row"; d.style.marginBottom = "6px"; d.innerHTML = `<input type="radio" name="qc" ${on ? "checked" : ""}><input class="input grow" data-o value="${esc(t || "")}"><button class="btn sm ghost" type="button">✕</button>`; box.appendChild(d); d.querySelector("button").onclick = () => d.remove(); };
    (q ? q.options : ["", "", "", ""]).forEach((o, i) => add(o, q ? i === q.correct : i === 0));
    s.querySelector("#qAdd").onclick = () => add("", false);
    s.querySelector("#qSv").onclick = async (e) => {
      const rows = [...box.children], opts = rows.map((r) => r.querySelector("[data-o]").value.trim()), correct = rows.findIndex((r) => r.querySelector("input[type=radio]").checked);
      if (opts.some((o) => !o)) return toast("لا تترك بديلًا فارغًا", true); if (correct < 0) return toast("حدّد الإجابة الصحيحة", true);
      spin(e.target, true);
      try { await rpc("t_save_question", { p_course: c.id, q: { id: q ? q.id : null, objective_code: s.querySelector("#qO").value, stem: s.querySelector("#qS").value, options: opts, correct, difficulty: s.querySelector("#qD").value || null, bloom: s.querySelector("#qB").value || null, explanation: s.querySelector("#qE").value || null } }); closeSheet(); toast("حُفظ السؤال"); S.qs = null; S.boot = await rpc("t_bootstrap"); route(); }
      catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }

  // ===================== الإعدادات =====================
  VIEWS.settings = { title: "الشعب والفصول والإعدادات", render(el) {
    const B = S.boot, c = course();
    let h = `<div class="vhead"><div><h2>الشعب والفصول الدراسية</h2><p>مبدئيًّا شعبة واحدة؛ أضف شعبة أو احذفها في أي فصل، واربط طلبة الفصول السابقة بحساباتهم من صفحة «الطلبة».</p></div>
      <div class="toolbar"><button class="btn primary" id="sNew">＋ شعبة</button><button class="btn outline" id="tNew">＋ فصل دراسي</button></div></div><div class="g2">`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("users", "sm")} الشُّعب</h3><div class="list">` + B.sections.map((s) => `<div class="li" style="${s.archived ? "opacity:.55" : ""}"><div><b>${esc(s.name)}</b>${s.archived ? ' <span class="pill">مؤرشفة</span>' : ""}<div class="tiny">${esc(term(s.term_id).name || "")} · ${s.n} طالبًا${s.schedule ? " · " + esc(s.schedule) : ""}</div></div>
      <div class="row" style="gap:6px"><button class="btn sm outline" data-se="${s.id}">تعديل</button>${s.archived ? `<button class="btn sm ghost" data-sun="${s.id}">استرجاع</button>` : `<button class="btn sm ghost" data-sd="${s.id}">حذف</button>`}</div></div>`).join("") + '</div><p class="tiny" style="margin-top:8px">الشعبة التي فيها طلبة أو تقويمات لا تُحذف بل تُؤرشف، فتبقى سجلاتها.</p></div>';
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("cal", "sm")} الفصول الدراسية</h3><div class="list">` + B.terms.map((t) => `<div class="li"><div><b>${esc(t.name)}</b>${t.is_current ? ' <span class="pill open">الحالي</span>' : ""}<div class="tiny">${t.starts ? esc(t.starts) + " — " + esc(t.ends || "") : ""}</div></div><button class="btn sm outline" data-te="${t.id}">تعديل</button></div>`).join("") + "</div></div>";
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("award", "sm")} توزيع العلامات (الخطة الدراسية)</h3><div class="list">` + c.components.map((k) => `<div class="li"><span>${esc(k.title)}</span><b class="num">${nf(+k.weight, 0)}٪</b></div>`).join("") + `<div class="li"><b>المجموع</b><b class="num">${nf(c.components.reduce((t, k) => t + +k.weight, 0), 0)}٪</b></div></div></div>`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("user", "sm")} حسابي</h3><label class="field"><span>الاسم</span><input class="input" id="pN" value="${esc(B.me.full_name)}"></label>
      <label class="field"><span>البريد الإلكتروني</span><input class="input" id="pE" dir="ltr" value="${esc(B.me.email || "")}"></label><p class="tiny">اسم الدخول: <b class="mono">${esc(B.me.username)}</b></p>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" id="pS">حفظ</button><button class="btn outline" id="pW">${ic("lock", "sm")}تغيير كلمة المرور</button></div></div>`;
    el.innerHTML = h + "</div>";
    const secForm = (s) => { const b = openSheet(`<h3>${s ? "تعديل شعبة" : "شعبة جديدة"}</h3><label class="field"><span>اسم الشعبة</span><input class="input" id="sN" value="${esc(s ? s.name : "")}" placeholder="مثال: الشعبة 2"></label>
      <label class="field"><span>الموعد (اختياري)</span><input class="input" id="sD" value="${esc(s ? s.schedule || "" : "")}" placeholder="مثال: الأحد 6–8 مساءً"></label>
      ${s ? "" : `<label class="field"><span>الفصل الدراسي</span><select class="input" id="sT">${opt((B.terms.find((t) => t.is_current) || {}).id, B.terms.map((t) => [t.id, t.name]))}</select></label>`}<button class="btn primary block" id="sGo">حفظ</button>`);
      b.querySelector("#sGo").onclick = async (e) => { spin(e.target, true); try { const r = await rpc("t_save_section", { p: { id: s ? s.id : null, course_id: c.id, term_id: s ? s.term_id : b.querySelector("#sT").value, name: b.querySelector("#sN").value, schedule: b.querySelector("#sD").value } }); closeSheet(); if (!s) { S.sec = r.id; try { localStorage.setItem("fgu_t_sec", r.id); } catch (x) { } } toast("حُفظت الشعبة"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); } }; };
    const termForm = (t) => { const b = openSheet(`<h3>${t ? "تعديل فصل دراسي" : "فصل دراسي جديد"}</h3><label class="field"><span>الاسم</span><input class="input" id="tN" value="${esc(t ? t.name : "")}" placeholder="مثال: ربيع 2027"></label>
      <div class="fields two"><label class="field"><span>يبدأ</span><input class="input" type="date" id="tS" value="${esc(t && t.starts || "")}"></label><label class="field"><span>ينتهي</span><input class="input" type="date" id="tE" value="${esc(t && t.ends || "")}"></label></div>
      <label class="check"><input type="checkbox" id="tC" ${t && t.is_current ? "checked" : ""}> الفصل الحالي</label><button class="btn primary block" id="tGo" style="margin-top:12px">حفظ</button>`);
      b.querySelector("#tGo").onclick = async (e) => { spin(e.target, true); try { await rpc("t_save_term", { p: { id: t ? t.id : null, name: b.querySelector("#tN").value, starts: b.querySelector("#tS").value || null, ends: b.querySelector("#tE").value || null, is_current: b.querySelector("#tC").checked } }); closeSheet(); toast("حُفظ"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); } }; };
    el.querySelector("#sNew").onclick = () => secForm(null); el.querySelector("#tNew").onclick = () => termForm(null);
    el.querySelectorAll("[data-se]").forEach((b) => (b.onclick = () => secForm(B.sections.find((s) => s.id === b.dataset.se))));
    el.querySelectorAll("[data-te]").forEach((b) => (b.onclick = () => termForm(B.terms.find((t) => t.id === b.dataset.te))));
    el.querySelectorAll("[data-sun]").forEach((b) => (b.onclick = async () => { const s = B.sections.find((x) => x.id === b.dataset.sun); try { await rpc("t_save_section", { p: { id: s.id, name: s.name, schedule: s.schedule, archived: false } }); await reload(); } catch (e) { toast(e.message, true); } }));
    el.querySelectorAll("[data-sd]").forEach((b) => (b.onclick = async () => { const s = B.sections.find((x) => x.id === b.dataset.sd);
      if (!(await confirmSheet("حذف الشعبة", `حذف «${esc(s.name)}»؟ إن كان فيها طلبة أو تقويمات فستُؤرشف بدل الحذف.`, "متابعة", true))) return;
      try { const r = await rpc("t_delete_section", { p_section: s.id }); toast(r.archived ? "أُرشفت الشعبة" : "حُذفت الشعبة"); await reload(); } catch (e) { toast(e.message, true); } }));
    el.querySelector("#pS").onclick = async (e) => { spin(e.target, true); try { await rpc("t_save_profile", { p: { full_name: el.querySelector("#pN").value, email: el.querySelector("#pE").value } }); toast("حُفظ"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); } };
    el.querySelector("#pW").onclick = () => { const b = openSheet(`<h3>تغيير كلمة المرور</h3><label class="field"><span>الحالية</span><input class="input" id="w0" type="password" dir="ltr"></label><label class="field"><span>الجديدة (8 أحرف على الأقل، حروف وأرقام)</span><input class="input" id="w1" type="password" dir="ltr"></label><label class="field"><span>تأكيد الجديدة</span><input class="input" id="w2" type="password" dir="ltr"></label><button class="btn primary block" id="wS">حفظ</button>`);
      b.querySelector("#wS").onclick = async (e) => { if (b.querySelector("#w1").value !== b.querySelector("#w2").value) return toast("كلمتا المرور غير متطابقتين", true); spin(e.target, true); try { await rpc("fgu_change_password", { p_old: b.querySelector("#w0").value, p_new: b.querySelector("#w1").value }); closeSheet(); toast("تغيّرت كلمة المرور"); } catch (x) { toast(x.message, true); spin(e.target, false); } }; };
  } };

  // ===================== البداية =====================
  const s0 = session();
  if (s0 && s0.token && s0.role === "teacher") { if (s0.must_change) showLogin(true); else start(); }
  else showLogin(false);
})();
