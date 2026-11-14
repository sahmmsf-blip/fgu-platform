// صفحة الطالب
(function () {
  const { rpc, esc, $, $$, toast, modal, confirmBox, busy, pct, bar, dt, outcomeMastery, logout, guard } = FGU;
  if (!guard("student")) return;
  const S = { home: null, en: null, tab: "home", quiz: null, timer: null };
  const main = $("#main");
  $("#btnOut").onclick = logout;
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b || S.quiz) return; $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); S.tab = b.dataset.t; render(); };
  $("#btnPw").onclick = () => {
    const m = modal({ title: "تغيير كلمة المرور", body: `<label class="f"><span>كلمة المرور الحالية</span><input type="password" id="w0" dir="ltr"></label><label class="f"><span>الجديدة (8 أحرف على الأقل، حروف إنجليزية وأرقام)</span><input type="password" id="w1" dir="ltr"></label><label class="f"><span>تأكيد الجديدة</span><input type="password" id="w2" dir="ltr"></label>`, foot: `<button class="btn pri" id="wS">حفظ</button>` });
    $("#wS", m).onclick = (e) => { if ($("#w1", m).value !== $("#w2", m).value) return toast("كلمتا المرور غير متطابقتين", "err"); busy(e.target, async () => { await rpc("fgu_change_password", { p_old: $("#w0", m).value, p_new: $("#w1", m).value }); m.close(); toast("تغيّرت كلمة المرور", "ok"); }); };
  };

  async function load(keep) {
    S.home = await rpc("s_home");
    $("#who").textContent = S.home.me.full_name + " · " + S.home.me.username;
    const E = S.home.enrollments;
    S.en = E.find((e) => e.enrollment_id === keep) || E[0] || null;
    const sel = $("#selEn"); sel.classList.toggle("hide", E.length < 2);
    sel.innerHTML = E.map((e) => `<option value="${e.enrollment_id}" ${S.en && e.enrollment_id === S.en.enrollment_id ? "selected" : ""}>${esc(e.course.title)} — ${esc(e.term)}</option>`).join("");
    sel.onchange = () => { S.en = E.find((e) => e.enrollment_id === sel.value); render(); };
    render();
  }
  const me = () => S.en.calc.students[0] || { items: {}, comps: {}, objs: {} };
  function render() {
    if (!S.en) { main.innerHTML = `<div class="card empty">لم تُسجَّل في أي مقرر بعد. راجع المحاضر.</div>`; return; }
    ({ home, quiz: quizzes, objs })[S.tab]();
  }

  // ── علاماتي ──
  function home() {
    const C = S.en.calc, s = me();
    const open = S.en.quizzes.filter((q) => q.open && (!q.quiz.attempts || q.used < q.quiz.attempts));
    main.innerHTML = `
      <div class="card" style="border-top:4px solid var(--gold)"><div class="row hero-row"><div class="grow"><h1 style="margin:0">${esc(S.en.course.title)}</h1>
        <div class="muted ltr" style="text-align:right">${esc(S.en.course.title_en || "")}</div><div class="muted small">${esc(S.en.section)} · ${esc(S.en.term)}</div></div>
        <div style="text-align:center;min-width:150px;padding-top:6px"><div style="font-size:2.2rem;font-weight:700;color:var(--navy)" class="num">${s.total == null ? "—" : s.total}</div><div class="muted small">مجموعك من <span class="num">${s.wsofar || 0}</span> علامة محتسبة حتى الآن</div></div></div></div>
      ${open.length ? `<div class="note" style="margin-bottom:14px">عندك ${open.length} اختبار قصير متاح الآن. <button class="btn sm gold" id="goQ">اذهب إلى الاختبارات</button></div>` : ""}
      ${C.components.map((k) => { const A = C.assessments.filter((a) => a.component_id === k.id); const v = s.comps[k.id];
        return `<div class="card"><div class="row"><h2 class="grow" style="margin:0">${esc(k.title)}</h2><span class="pill gold">الوزن ${k.weight}%</span>${v != null ? `<b class="num">${pct(v)}</b>` : ""}</div>
        ${A.length ? `<div class="tw" style="margin-top:10px"><table class="t"><tr><th>التقويم</th><th class="c">نسبتك</th><th style="width:35%"></th></tr>
          ${A.map((a) => { const x = s.items[a.id]; return `<tr><td>${esc(a.title)}${a.kind === "quiz" ? ` <span class="pill">إلكتروني — تُحتسب أفضل محاولة</span>` : ""}</td><td class="c num">${x == null ? `<span class="muted">لم يُحتسب بعد</span>` : pct(x)}</td><td>${x == null ? "" : bar(x)}</td></tr>`; }).join("")}</table></div>`
          : `<p class="muted small" style="margin:.5em 0 0">لا علامات منشورة بعد.</p>`}</div>`; }).join("")}`;
    const g = $("#goQ"); if (g) g.onclick = () => $(`#tabs [data-t=quiz]`).click();
  }

  // ── الاختبارات القصيرة ──
  function quizzes() {
    const Q = S.en.quizzes, now = Date.now();
    main.innerHTML = `<div class="card"><h2>الاختبارات القصيرة الإلكترونية</h2><p class="muted small">تستطيع إعادة الاختبار، وتُحتسب أفضل محاولة لك. في كل محاولة أسئلة مختلفة من الأهداف نفسها. وتظهر الإجابات الصحيحة بعد موعد إغلاق الاختبار.</p></div>
      ${Q.length ? Q.map((q) => { const left = q.quiz.attempts ? q.quiz.attempts - q.used : null; const can = q.open && (left == null || left > 0);
        const state = q.pending ? `<span class="pill warn">محاولة جارية</span>` : q.open ? `<span class="pill ok">متاح</span>` : (q.open_at && new Date(q.open_at) > now ? `<span class="pill">يفتح ${dt(q.open_at)}</span>` : `<span class="pill">مغلق</span>`);
        return `<div class="card"><div class="row"><h3 class="grow" style="margin:0">${esc(q.title)}</h3>${state}</div>
          <p class="small muted" style="margin:.4em 0">${q.quiz.n} أسئلة${q.quiz.minutes ? ` · ${q.quiz.minutes} دقيقة للمحاولة` : ""} · ${left == null ? "محاولات غير محدودة" : `بقي لك ${left} محاولة`}${q.close_at ? ` · يُغلق ${dt(q.close_at)}` : ""}<br>الأهداف: <span class="ltr">${(q.quiz.objectives || []).join("، ")}</span></p>
          <div class="row">${q.best != null ? `<span>أفضل نتيجة: <b class="num">${pct(q.best)}</b></span>` : ""}<span class="muted small">${q.used} محاولة مسلَّمة</span>
          <span class="right row" style="gap:.4em">${q.used ? `<button class="btn sm" data-hist="${q.id}">محاولاتي</button>` : ""}${(can || q.pending) ? `<button class="btn pri" data-go="${q.id}">${q.pending ? "أكمل المحاولة" : q.used ? "محاولة جديدة" : "ابدأ"}</button>` : ""}</span></div></div>`; }).join("")
        : `<div class="card empty">لا اختبارات منشورة بعد.</div>`}`;
    $$("[data-go]").forEach((b) => b.onclick = async () => {
      const q = Q.find((x) => x.id === b.dataset.go);
      if (!q.pending && !(await confirmBox(`ستبدأ «${q.title}»${q.quiz.minutes ? ` ولديك ${q.quiz.minutes} دقيقة` : ""}. تُحفظ إجاباتك أولًا بأول. هل أنت جاهز؟`, "ابدأ"))) return;
      const at = await busy(b, () => rpc("s_start_quiz", { p_assessment: q.id })); if (at) take(at);
    });
    $$("[data-hist]").forEach((b) => b.onclick = async () => {
      const L = await busy(b, () => rpc("s_attempts", { p_assessment: b.dataset.hist })); if (!L) return;
      const m = modal({ title: "محاولاتي", body: `<div class="tw"><table class="t"><tr><th>#</th><th>التسليم</th><th class="c">الصحيح</th><th class="c">العلامة</th><th></th></tr>
        ${L.map((x, i) => `<tr><td>${i + 1}</td><td class="small">${dt(x.submitted_at)}</td><td class="c num">${x.correct}/${x.total}</td><td class="c num">${+x.score}/${+x.max}</td><td><button class="btn sm" data-rv="${x.id}">مراجعة</button></td></tr>`).join("")}</table></div>` });
      $$("[data-rv]", m).forEach((r) => r.onclick = () => { m.close(); review(r.dataset.rv); });
    });
  }
  function take(at) {
    S.quiz = { at, ans: (at.answers || []).map((v) => v == null ? null : +v), dirty: false };
    $("#tabsNav").classList.add("hide");
    const L = "abcdef";
    main.innerHTML = `<div class="timer"><b>${esc(at.title)}</b><span id="qProg" class="small"></span><span class="right num" id="qClock"></span></div>
      ${at.items.map((it, i) => `<div class="qcard" data-i="${i}"><div><span class="qn">${i + 1}.</span>${esc(it.stem)}</div><div class="opts">
        ${it.options.map((o, j) => `<div class="opt ${S.quiz.ans[i] === j ? "on" : ""}" data-j="${j}" role="radio" tabindex="0"><span class="l">${L[j]})</span><span>${esc(o)}</span></div>`).join("")}</div></div>`).join("")}
      <div class="row"><button class="btn pri" id="qSub">تسليم الاختبار</button><span class="muted small">تُحفظ إجاباتك تلقائيًا.</span></div>`;
    const prog = () => { const n = S.quiz.ans.filter((v) => v != null).length; $("#qProg").textContent = `أجبت ${n} من ${at.items.length}`; };
    prog();
    $$(".qcard").forEach((c) => { const i = +c.dataset.i; $$(".opt", c).forEach((o) => { const pick = () => { S.quiz.ans[i] = +o.dataset.j; $$(".opt", c).forEach((x) => x.classList.toggle("on", x === o)); S.quiz.dirty = true; prog(); }; o.onclick = pick; o.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }; }); });
    const save = async () => { if (!S.quiz || !S.quiz.dirty) return; S.quiz.dirty = false; try { await rpc("s_save_answers", { p_attempt: at.attempt_id, p_answers: S.quiz.ans }); } catch (e) { S.quiz.dirty = true; } };
    const saver = setInterval(save, 8000);
    const end = at.deadline ? new Date(at.deadline).getTime() : null;
    const tick = () => { if (!end) { $("#qClock").textContent = ""; return; } const left = Math.max(0, Math.floor((end - Date.now()) / 1000)); $("#qClock").textContent = `الوقت المتبقي ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; if (left <= 0) submit(true); };
    S.timer = setInterval(tick, 1000); tick();
    window.onbeforeunload = () => { if (S.quiz) { save(); return "لم تسلّم الاختبار بعد"; } };
    let sent = false;
    async function submit(auto) {
      if (sent) return;
      if (!auto) { const blank = S.quiz.ans.filter((v) => v == null).length; if (!(await confirmBox(blank ? `بقي ${blank} سؤالًا بلا إجابة. هل تريد التسليم؟` : "تسليم الاختبار الآن؟", "سلّم"))) return; }
      sent = true; clearInterval(S.timer); clearInterval(saver);
      try {
        const r = await rpc("s_submit_quiz", { p_attempt: at.attempt_id, p_answers: S.quiz.ans });
        S.quiz = null; window.onbeforeunload = null; $("#tabsNav").classList.remove("hide");
        result(r, at.attempt_id);
      } catch (e) { sent = false; toast(e.message, "err"); }
    }
    $("#qSub").onclick = () => submit(false);
  }
  function result(r, attemptId) {
    const p = r.score / r.max * 100;
    main.innerHTML = `<div class="card" style="text-align:center"><h2>سُلِّم الاختبار</h2><div style="font-size:2.4rem;font-weight:700;color:var(--navy)" class="num">${+r.score} / ${+r.max}</div>
      <p>${r.correct} إجابة صحيحة من ${r.total}</p>${bar(p)}</div>
      <div class="card"><h2>نتيجتك حسب الأهداف</h2>${Object.entries(r.by_obj).sort().map(([k, v]) => { const o = S.en.course.objectives.find((x) => x.code === k) || {}; const q = v[0] / v[1] * 100; return `<div class="obj"><span class="code">${k}</span><span class="small">${esc(o.text || "")}</span>${bar(q)}<span class="num small">${v[0]}/${v[1]}</span></div>`; }).join("")}</div>
      <div class="row"><button class="btn" id="rRv">مراجعة إجاباتي</button><button class="btn pri" id="rBk">رجوع إلى الاختبارات</button></div>`;
    $("#rRv").onclick = () => review(attemptId);
    $("#rBk").onclick = async () => { const k = S.en.enrollment_id; S.tab = "quiz"; await load(k); };
  }
  async function review(id) {
    const r = await rpc("s_review", { p_attempt: id }); const L = "abcdef";
    const m = modal({ title: "مراجعة: " + r.title, wide: true, body: `<p><b class="num">${+r.score}/${+r.max}</b> — ${r.correct} صحيحة من ${r.total}</p>
      ${r.show_key ? "" : `<p class="note small">تظهر الإجابات الصحيحة والتفسيرات بعد موعد إغلاق الاختبار. الآن ترى فقط أي إجاباتك صحيحة.</p>`}
      ${r.items.map((it, i) => `<div class="qcard"><div><span class="qn">${i + 1}.</span>${esc(it.stem)} <span class="pill">${it.objective_code}</span> ${it.is_right ? `<span class="pill ok">صحيحة</span>` : `<span class="pill bad">${it.chosen == null ? "بلا إجابة" : "خاطئة"}</span>`}</div>
        <div class="opts">${it.options.map((o, j) => `<div class="opt ${it.correct === j ? "right" : ""} ${it.chosen === j && !it.is_right ? "wrong" : ""} ${it.chosen === j && it.is_right ? "right" : ""}"><span class="l">${L[j]})</span><span>${esc(o)}</span></div>`).join("")}</div>
        ${it.explanation ? `<p class="small muted" style="margin:.5em 0 0">${esc(it.explanation)}</p>` : ""}</div>`).join("")}` });
  }

  // ── إتقاني للأهداف ──
  function objs() {
    const c = S.en.course, s = me(), O = s.objs || {};
    const oc = outcomeMastery(c, O);
    const chs = []; c.objectives.forEach((o) => { let ch = chs.find((x) => x.ch === o.chapter); if (!ch) chs.push(ch = { ch: o.chapter, title: o.chapter_title, objs: [] }); ch.objs.push(o); });
    main.innerHTML = `<div class="card"><h2>نتاجات المقرر</h2><p class="muted small">مدى إتقانك لكل نتاج، محسوبًا من علاماتك في الأسئلة والأجزاء المربوطة بأهداف فصوله. ابدأ مراجعتك بالأضعف.</p>
      ${oc.map((o) => `<div class="obj"><span class="code">${o.seq}</span><span class="small">${esc(o.text)}</span>${bar(o.pct)}<span class="num small">${pct(o.pct, 0)}</span></div>`).join("")}</div>
      <div class="card"><h2>أهداف الفصول</h2>${chs.map((ch) => { const got = ch.objs.filter((o) => O[o.code]); let e = 0, mx = 0; got.forEach((o) => { e += +O[o.code][0]; mx += +O[o.code][1]; });
        return `<details class="ch"><summary>الفصل ${ch.ch}: ${esc(ch.title)} <span class="right num small">${mx ? pct(e / mx * 100, 0) : "—"}</span></summary><div>
        ${ch.objs.map((o) => { const v = O[o.code]; const p = v && +v[1] ? v[0] / v[1] * 100 : null; return `<div class="obj"><span class="code">${o.code}</span><span class="small">${esc(o.text)}</span>${bar(p)}<span class="num small">${pct(p, 0)}</span></div>`; }).join("")}</div></details>`; }).join("")}</div>`;
  }

  load().catch((e) => { main.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
})();
