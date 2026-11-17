// ملفات الواجبات: رفع وتنزيل على أجزاء عبر دوال قاعدة البيانات (الملف داخل قاعدة البيانات، حد 4 ميغابايت)
(function () {
  const MAX = 4 * 1024 * 1024;
  const UP = 256 * 1024;       // حجم الجزء عند الرفع (≈ 350 ك.ب بعد base64) — طلبات صغيرة تناسب حدود Supabase
  const DOWN = 768 * 1024;     // حجم الجزء عند التنزيل
  const TYPES = {
    pdf: [".pdf", "PDF"], doc: [".doc,.docx,.odt,.rtf", "Word"], xls: [".xls,.xlsx,.ods,.csv", "Excel"], ppt: [".ppt,.pptx,.odp", "PowerPoint"],
    img: [".jpg,.jpeg,.png,.webp,.heic,.gif", "صور"], txt: [".txt,.md", "نص"], zip: [".zip,.rar,.7z", "مضغوط"]
  };
  const RE = { pdf: /\.pdf$/i, doc: /\.(docx?|odt|rtf)$/i, xls: /\.(xlsx?|ods|csv)$/i, ppt: /\.(pptx?|odp)$/i, img: /\.(jpe?g|png|webp|heic|gif)$/i, txt: /\.(txt|md)$/i, zip: /\.(zip|rar|7z)$/i };
  const DEF = ["pdf", "doc", "xls", "ppt", "img"];
  const accept = (t) => (t && t.length ? t : DEF).map((k) => (TYPES[k] || [""])[0]).filter(Boolean).join(",");
  const extOk = (name, t) => (t && t.length ? t : DEF).some((k) => RE[k] && RE[k].test(name || ""));
  const size = (n) => { const en = document.documentElement.lang === "en"; if (n == null) return ""; if (n < 1024) return n + (en ? " B" : " بايت"); if (n < 1048576) return Math.round(n / 1024) + (en ? " KB" : " ك.ب"); return (n / 1048576).toFixed(1) + (en ? " MB" : " م.ب"); };
  const kindOf = (f) => { const n = (f.name || "").toLowerCase(), m = f.mime || ""; return /^image\//.test(m) || RE.img.test(n) ? "img" : m === "application/pdf" || RE.pdf.test(n) ? "pdf" : RE.doc.test(n) ? "doc" : RE.xls.test(n) ? "xls" : RE.ppt.test(n) ? "ppt" : RE.zip.test(n) ? "zip" : "txt"; };
  const badge = (f) => { const k = kindOf(f); return `<span class="fbadge fb-${k}">${{ img: "IMG", pdf: "PDF", doc: "DOC", xls: "XLS", ppt: "PPT", zip: "ZIP", txt: "TXT" }[k]}</span>`; };
  const canPreview = (f) => ["img", "pdf"].includes(kindOf(f)) && !/heic$/i.test(f.name || "");
  const guessMime = (name) => { const n = (name || "").toLowerCase(); return /\.pdf$/.test(n) ? "application/pdf" : /\.jpe?g$/.test(n) ? "image/jpeg" : /\.png$/.test(n) ? "image/png" : /\.webp$/.test(n) ? "image/webp" : /\.gif$/.test(n) ? "image/gif" : /\.docx$/.test(n) ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : /\.xlsx$/.test(n) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : /\.pptx$/.test(n) ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : /\.txt$/.test(n) ? "text/plain" : "application/octet-stream"; };

  function b64(blob) {
    return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
  }
  // تصغير الصور الكبيرة (صور الدفتر من الهاتف) إلى 1600 بكسل JPEG قبل رفعها
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    if (file.size < 700 * 1024) return file;
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const out = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
      if (!out || out.size >= file.size) return file;
      return new File([out], file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
    } catch (e) { return file; }
  }
  // رفع ملف: بداية ← أجزاء ← نهاية. onp(نسبة 0..1)
  async function upload(file, o, onp) {
    if (file.size > MAX) throw new Error(document.documentElement.lang === "en" ? "The file must not exceed 4 MB" : "حجم الملف يجب ألا يتجاوز 4 ميغابايت");
    if (!file.size) throw new Error(document.documentElement.lang === "en" ? "The file is empty" : "الملف فارغ");
    const b = await F.rpc("f_upload_begin", { p_assessment: o.assessment, p_role: o.role, p_name: file.name, p_mime: file.type || guessMime(file.name), p_size: file.size, p_enrollment: o.enrollment || null, p_material: o.material || null, p_attempt: o.attempt || null });
    try {
      for (let off = 0; off < file.size; off += UP) {
        await F.rpc("f_upload_chunk", { p_file: b.id, p_b64: await b64(file.slice(off, off + UP)) });
        onp && onp(Math.min(1, (off + UP) / file.size));
      }
      return await F.rpc("f_upload_end", { p_file: b.id });
    } catch (e) { try { await F.rpc("f_delete", { p_file: b.id }); } catch (x) { } throw e; }
  }
  // تنزيل ملف كـ Blob
  const cache = new Map();
  async function blob(id, onp) {
    if (cache.has(id)) return cache.get(id);
    const parts = []; let off = 0, name = "", mime = "", total = 0;
    for (;;) {
      const r = await F.rpc("f_read", { p_file: id, p_offset: off, p_len: DOWN });
      name = r.name; mime = r.mime; total = r.size;
      const bin = atob(r.b64 || ""), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      parts.push(u); off += u.length; onp && onp(total ? off / total : 1);
      if (r.done || !u.length) break;
    }
    const out = { blob: new Blob(parts, { type: mime || guessMime(name) }), name, mime };
    if (total < 6 * 1048576) cache.set(id, out);
    return out;
  }
  function save(b, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  async function download(f, btn) {
    const lab = btn ? btn.innerHTML : null;
    try { const r = await blob(f.id, (p) => btn && (btn.textContent = Math.round(p * 100) + "%")); save(r.blob, r.name || f.name); }
    catch (e) { U.toast(e.message, true); }
    if (btn) btn.innerHTML = lab;
  }
  // معاينة داخل عنصر: صورة أو PDF، وإلا رابط تنزيل
  async function preview(f, box) {
    box.innerHTML = '<div class="tiny loading" style="padding:14px">…</div>';
    try {
      const r = await blob(f.id), url = URL.createObjectURL(r.blob), k = kindOf(f);
      box.innerHTML = k === "img" ? `<img class="fprev-img" src="${url}" alt="">` : k === "pdf" ? `<iframe class="fprev-pdf" src="${url}" title="PDF"></iframe>` : "";
    } catch (e) { box.innerHTML = `<div class="tiny" style="padding:10px;color:var(--danger)">${U.esc(e.message)}</div>`; }
  }
  // تحميل مكتبة ZIP عند الحاجة فقط
  const ZIP_URL = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  function zipLib() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((ok, no) => { const s = document.createElement("script"); s.src = ZIP_URL; s.onload = () => ok(window.JSZip); s.onerror = () => no(new Error("تعذّر تحميل مكتبة الضغط؛ تحقق من الاتصال")); document.head.appendChild(s); });
  }
  const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 80) || "file";
  window.FF = { MAX, TYPES, DEF, accept, extOk, size, kindOf, badge, canPreview, shrink, upload, blob, save, download, preview, zipLib, safe };
})();
