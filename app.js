/* app.js */

const BLOB_ACCOUNT_HOST = "https://golfbuddyblob.blob.core.windows.net";
const BLOB_SAS = "";

// POSTS
const POSTS_GET_ALL =
  "https://prod-40.uksouth.logic.azure.com:443/workflows/1fe65ba8d7214eb3a8dc1daa813f0c80/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=kovVa9toTHU1OJhPmSc5wxV6g9h2EUGVMRGOfNw2SXk";

const POSTS_CREATE =
  "https://prod-05.uksouth.logic.azure.com:443/workflows/63c79a6de1a84e8483e4928b9cf0b13e/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=61BZkN7RuiAJWmgFU7f6g_Uu4SI5Yn7DvY0dPkYCxZ8";

const POSTS_GET_ONE_BASE =
  "https://prod-26.uksouth.logic.azure.com/workflows/3123a61f6484427da88e7e5f8a918837/triggers/When_an_HTTP_request_is_received/paths/invoke/posts/";
const POSTS_GET_ONE_QS =
  "?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=RVSBq2BZvIRjedMPDsf5TaYdejHcpQDPq9mAwTvwQ2Y";

const POSTS_UPDATE_BASE =
  "https://prod-43.uksouth.logic.azure.com/workflows/f3c1a408667e42d799bb3c5c2555a7a2/triggers/When_an_HTTP_request_is_received/paths/invoke/posts/";
const POSTS_UPDATE_QS =
  "?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=S1U61FoykV6eQkAvAJl-wwh-u0nCwPHEDparoMrFoM4";

const POSTS_DELETE_BASE =
  "https://prod-24.uksouth.logic.azure.com/workflows/c5eb7ada33cc4d9080e3e5e901e7491f/triggers/When_an_HTTP_request_is_received/paths/invoke/posts/";
const POSTS_DELETE_QS =
  "?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=RbDInqqwGy26lqiEpdeLj4euhhQmv3sKV5TQtNjIT8M";

// REVIEWS
const REV_CREATE_BASE =
  "https://prod-24.uksouth.logic.azure.com/workflows/d698e866dc044455b053304f1e1a0be5/triggers/When_an_HTTP_request_is_received/paths/invoke/posts/";
const REV_CREATE_QS =
  "?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=HD6UHYZYV4yCQUt16t3dduVEiAiZ4oOW5tF57IQPJAo";

const REV_GET_BASE =
  "https://prod-48.uksouth.logic.azure.com/workflows/359b4b4089d44dfea31389acc5f49d24/triggers/When_an_HTTP_request_is_received/paths/invoke/posts/";
const REV_GET_QS =
  "?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=x_Mng1zbmR97hxJ69l8U_HlmasGT3RzFTchRjtmtsJU";

// TRANSLATE (Logic App)
const TRANSLATE_URL =
  "https://prod-22.uksouth.logic.azure.com:443/workflows/889eac4623934a5e963bc7b10f78c87f/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=jX6EFdgI2fAYZqhyox9xK2ZOpAbTguAkfcaYblzvy7U";

const enc = encodeURIComponent;

const state = {
  postsById: new Map(),
  currentPostId: "",
  currentUserId: "",
  editing: false,

  originalReviews: [],
  currentReviews: [],
};

function $(id) {
  return document.getElementById(id);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function toArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  const fields = [
    "items", "value", "data", "documents", "Documents",
    "docs", "records", "results",
  ];
  for (const k of fields) if (Array.isArray(x[k])) return x[k];
  if (x.body) {
    const a = toArray(x.body);
    if (a.length) return a;
  }
  return [];
}

async function httpJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { ...options, headers });
  const raw = await res.text();
  let data = raw;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {}
  return { ok: res.ok, status: res.status, data, raw };
}

function buildUrl(base, pathParts, qs) {
  const path = pathParts.map((p) => enc(p)).join("/");
  return base + path + qs;
}

function resolveImageUrl(media) {
  if (!media) return "";
  const direct = media.url || media.blobUrl || media.imageUrl || media.src || "";
  if (direct && /^https?:\/\//i.test(direct)) return direct;

  if (media.blobPath && BLOB_ACCOUNT_HOST) {
    const path = String(media.blobPath).startsWith("/") ? media.blobPath : `/${media.blobPath}`;
    return `${BLOB_ACCOUNT_HOST}${path}${BLOB_SAS || ""}`;
  }

  if (media.container && media.blobName && BLOB_ACCOUNT_HOST) {
    return `${BLOB_ACCOUNT_HOST}/${media.container}/${encodeURIComponent(media.blobName)}${BLOB_SAS || ""}`;
  }

  return "";
}

function normalizePost(raw) {
  const p = raw?.document || raw?.resource || raw?.body || raw;

  const courseName =
    p?.courseName ?? p?.CourseName ?? p?.course ?? p?.Course ?? p?.name ?? "Golf Course";
  const description = p?.description ?? p?.Description ?? p?.desc ?? "";
  const userid = p?.userid ?? p?.userId ?? p?.UserId ?? p?.UserID ?? "";

  // media can come back in different shapes depending on the Logic App / Cosmos document
    let media =
    p?.media ??
    p?.Media ??
    (p?.imageUrl || p?.blobUrl || p?.url || p?.src
      ? { imageUrl: p.imageUrl, blobUrl: p.blobUrl, url: p.url, src: p.src }
      : {});

  // If Logic App stored media as JSON string -> parse
  if (typeof media === "string") {
    const s = media.trim();
    try {
      media = JSON.parse(s);
    } catch {
      // If Logic App stored ONLY blobPath string -> wrap it
      media = s ? { blobPath: s } : {};
    }
  }

  // Clean up blob fields (your output had \n at end)
  if (media && typeof media === "object") {
    if (media.blobPath) media.blobPath = String(media.blobPath).trim();
    if (media.blobName) media.blobName = String(media.blobName).trim();
  }


  

  const votes = p?.votes || p?.Votes || {};

  return { id: p?.id || p?.postId || p?._id || "", userid, courseName, description, media, votes };
}


function normalizeReview(raw) {
  const r = raw?.document || raw?.resource || raw?.body || raw;
  return {
    id: r?.id || "",
    userid: r?.userid ?? r?.userId ?? "",
    text: r?.text ?? r?.review ?? r?.comment ?? "",
    rating: r?.rating ?? "",
    createdAt: r?.createdAt ?? r?.date ?? r?.timestamp ?? "",
    _displayText: null,
  };
}

function openModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.add("open");
  m.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
}

/* ---------------- TRANSLATION ---------------- */

function extractTranslatedText(payload) {
  // If your Logic App returns { translatedText: "..." }
  if (payload?.translatedText) return payload.translatedText;

  // If Logic App returns Translator raw: [ { translations: [ { text } ] } ]
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.body)
      ? payload.body
      : Array.isArray(payload?.data)
        ? payload.data
        : null;

  if (arr?.[0]?.translations?.[0]?.text) return arr[0].translations[0].text;

  // If wrapped in { body: { translatedText: ... } }
  if (payload?.body?.translatedText) return payload.body.translatedText;

  return "";
}

async function translateText(text, to) {
  const clean = String(text ?? "").trim();
  if (!clean) return "";

  const r = await httpJson(TRANSLATE_URL, {
    method: "POST",
    body: JSON.stringify({ text: clean, to }),
  });

  if (!r.ok) {
    const msg =
      r.data?.message ||
      (typeof r.data === "string" ? r.data : "") ||
      r.raw ||
      `Translate failed (${r.status})`;
    throw new Error(msg);
  }

  const t = extractTranslatedText(r.data);
  if (t) return t;

  // fallback so you can see what it returned
  if (typeof r.data === "string") return r.data;
  return JSON.stringify(r.data);
}

async function translateDetailView() {
  const note = $("detailTranslateNote");
  const post = state.postsById.get(state.currentPostId);
  if (!post) return;

  // don’t translate while editing form is open
  if (state.editing) {
    if (note) note.textContent = "Close edit to translate.";
    return;
  }

  const to = $("detailLang")?.value || "en";
  if (note) note.textContent = "Translating...";

  try {
    // Translate description (display-only)
    const tDesc = await translateText(post.description || "", to);
    post._displayDescription = tDesc || post.description;

    // Translate reviews (display-only)
    const translated = [];
    for (const r of state.originalReviews || []) {
      if (!r.text) {
        translated.push({ ...r, _displayText: "" });
        continue;
      }
      const t = await translateText(r.text, to);
      translated.push({ ...r, _displayText: t || r.text });
    }
    state.currentReviews = translated;

    renderDetail(post);
    renderReviews(state.currentReviews);

    if (note) note.textContent = `Translated to ${to}.`;
  } catch (e) {
    if (note) note.textContent = e?.message || "Translate failed.";
  }
}

function resetDetailTranslation() {
  const note = $("detailTranslateNote");
  const post = state.postsById.get(state.currentPostId);
  if (!post) return;

  post._displayDescription = null;

  state.currentReviews = (state.originalReviews || []).map((r) => ({ ...r, _displayText: null }));
  renderDetail(post);
  renderReviews(state.currentReviews);

  if (note) note.textContent = "";
}

async function translateAddPostDescription() {
  const note = $("addPostTranslateNote");
  const to = $("addPostLang")?.value || "en";
  const descEl = $("addPostDescription");
  if (!descEl) return;

  const text = descEl.value.trim();
  if (!text) {
    if (note) note.textContent = "Nothing to translate.";
    return;
  }

  if (note) note.textContent = "Translating...";
  try {
    const t = await translateText(text, to);
    descEl.value = t || text;
    if (note) note.textContent = `Translated to ${to}.`;
  } catch (e) {
    if (note) note.textContent = e?.message || "Translate failed.";
  }
}

async function translateAddReviewText() {
  const note = $("addReviewTranslateNote");
  const to = $("addReviewLang")?.value || "en";
  const textEl = $("addReviewText");
  if (!textEl) return;

  const text = textEl.value.trim();
  if (!text) {
    if (note) note.textContent = "Nothing to translate.";
    return;
  }

  if (note) note.textContent = "Translating...";
  try {
    const t = await translateText(text, to);
    textEl.value = t || text;
    if (note) note.textContent = `Translated to ${to}.`;
  } catch (e) {
    if (note) note.textContent = e?.message || "Translate failed.";
  }
}

/* ---------------- UI RENDER ---------------- */

function renderDetail(post) {
  const title = $("detailTitle");
  const imgWrap = $("detailImgWrap");
  const meta = $("detailMeta");
  const desc = $("detailDesc");
  const editBtn = $("btnEditPost");

  if (title) title.textContent = post.courseName || "Golf Course";

  const imgUrl = resolveImageUrl(post.media);
  if (imgWrap) {
    imgWrap.innerHTML = imgUrl
      ? `<img src="${esc(imgUrl)}" alt="${esc(post.courseName || "Golf Course")}">`
      : `<div class="note">No image</div>`;
  }

  if (meta) {
    meta.innerHTML = `
      <div>Post ID: ${esc(post.id || "")}</div>
      <div>User: ${esc(post.userid || "")}</div>
    `;
  }

  if (editBtn) editBtn.textContent = state.editing ? "Close" : "Edit";

  if (!desc) return;

  if (!state.editing) {
    desc.textContent = (post._displayDescription ?? post.description) || "";
    return;
  }

  desc.innerHTML = `
    <label>Course Name</label>
    <input id="editCourseName" value="${esc(post.courseName || "")}" />
    <label>Description</label>
    <textarea id="editDescription" rows="4">${esc(post.description || "")}</textarea>
    <div class="btn-row" style="margin-top:12px;">
      <button class="btn" id="btnSaveEdit" type="button">Save</button>
      <button class="btn secondary" id="btnCancelEdit" type="button">Cancel</button>
    </div>
    <div class="note" id="editNote"></div>
  `;

  $("btnSaveEdit")?.addEventListener("click", saveEditPost);
  $("btnCancelEdit")?.addEventListener("click", () => {
    state.editing = false;
    renderDetail(state.postsById.get(state.currentPostId) || post);
  });
}

function renderReviews(reviews) {
  const box = $("detailReviews");
  if (!box) return;

  if (!reviews.length) {
    box.innerHTML = `<div class="note">No reviews.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="note">${reviews.length} review(s)</div>
    ${reviews
      .map((r) => {
        const displayText = r._displayText ?? r.text;
        return `
        <div style="display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-top:1px solid #eee;">
          <div>
            <div style="font-size:14px;">${esc(r.userid || "")}${
              r.rating !== "" ? ` · ${esc(r.rating)}/5` : ""
            }</div>
            ${
              displayText
                ? `<div style="color:#444; margin-top:4px;">${esc(displayText)}</div>`
                : ""
            }
          </div>
          <div style="color:#666; font-size:12px; white-space:nowrap;">${esc(r.createdAt || "")}</div>
        </div>
      `;
      })
      .join("")}
  `;
}

async function loadReviewsForPost(postid) {
  const box = $("detailReviews");
  if (box) box.innerHTML = `<div class="note">Loading…</div>`;

  const url = buildUrl(REV_GET_BASE, [postid, "reviews"], REV_GET_QS);
  const r = await httpJson(url, { method: "GET" });

  if (!r.ok) {
    if (box) box.innerHTML = `<div class="note">Failed to load reviews (${r.status}).</div>`;
    state.originalReviews = [];
    state.currentReviews = [];
    return;
  }

  const reviews = toArray(r.data).map(normalizeReview);
  state.originalReviews = reviews;
  state.currentReviews = reviews.map((x) => ({ ...x, _displayText: null }));
  renderReviews(state.currentReviews);
}

async function showPostDetail(userid, postid) {
  state.currentUserId = userid || "";
  state.currentPostId = postid || "";
  state.editing = false;

  // reset translation UI each open
  const note = $("detailTranslateNote");
  if (note) note.textContent = "";

  openModal("detailModal");

  const cached = state.postsById.get(postid);
  if (cached) {
    cached._displayDescription = null;
    renderDetail(cached);
  }

  const reviewsBox = $("detailReviews");
  if (reviewsBox) reviewsBox.innerHTML = `<div class="note">Loading…</div>`;

  const url = buildUrl(POSTS_GET_ONE_BASE, [userid, postid], POSTS_GET_ONE_QS);
  const r = await httpJson(url, { method: "GET" });

  if (r.ok) {
    const post = normalizePost(r.data);
    if (post?.id) {
      post._displayDescription = null;
      state.postsById.set(post.id, post);
      renderDetail(post);
    }
  }

  await loadReviewsForPost(postid);
}

function renderHomeCards(posts) {
  const grid = $("coursesGrid");
  const note = $("homeNote");
  if (!grid) return;

  if (!posts.length) {
    grid.innerHTML = "";
    if (note) note.textContent = "No posts yet.";
    return;
  }

  if (note) note.textContent = "";

  const normalized = posts.map(normalizePost);

  state.postsById.clear();
  for (const p of normalized) if (p.id) state.postsById.set(p.id, p);

  grid.innerHTML = normalized
    .map((p) => {
      const courseName = esc(p.courseName || "Golf Course");
      const description = esc(p.description || "");
      const imgUrl = resolveImageUrl(p.media);
      const imgHtml = imgUrl ? `<img src="${esc(imgUrl)}" alt="${courseName}">` : `No image`;
      const userid = esc(p.userid || "");
      const votes = p.votes || {};
      const voteText =
        typeof votes.up === "number" || typeof votes.down === "number"
          ? `👍 ${votes.up ?? 0}  ·  👎 ${votes.down ?? 0}`
          : "";

      return `
      <article class="course-card" data-postid="${esc(p.id)}" data-userid="${esc(p.userid)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div class="course-name" style="flex:1;">${courseName}</div>
          <button class="btn secondary" type="button" data-action="delete">Delete</button>
        </div>
        <div class="img-ph">${imgHtml}</div>
        <div class="desc">${description || "Description"}</div>
        ${userid ? `<div class="meta">User: ${userid}</div>` : ""}
        
      </article>
    `;
    })
    .join("");
}

async function loadHomePosts() {
  const grid = $("coursesGrid");
  const note = $("homeNote");
  if (!grid) return;

  if (note) note.textContent = "Loading posts...";

  const r = await httpJson(POSTS_GET_ALL, { method: "GET" });

  if (!r.ok) {
    grid.innerHTML = "";
    if (note) note.textContent = `Failed to load posts (${r.status}).`;
    return;
  }

  const posts = toArray(r.data);
  if (note) note.textContent = `Loaded ${posts.length} post(s).`;
  renderHomeCards(posts);
}

async function deletePostByCard(userid, postid) {
  if (!userid || !postid) return;
  const ok = confirm("Delete this post?");
  if (!ok) return;

  const url = buildUrl(POSTS_DELETE_BASE, [userid, postid], POSTS_DELETE_QS);
  const r = await httpJson(url, { method: "DELETE" });

  if (!r.ok) {
    alert(`Delete failed (${r.status})`);
    return;
  }

  if (state.currentPostId === postid) closeModal("detailModal");
  await loadHomePosts();
}

function openAddPost() {
  const note = $("addPostNote");
  if (note) note.textContent = "";
  const tnote = $("addPostTranslateNote");
  if (tnote) tnote.textContent = "";

  $("addPostUserId").value = "";
  $("addPostCourseName").value = "";
  $("addPostDescription").value = "";
  if ($("addPostFile")) $("addPostFile").value = "";
  openModal("addPostModal");
}

function closeAddPost() {
  closeModal("addPostModal");
}

async function submitAddPost() {
  const note = $("addPostNote");
  if (note) note.textContent = "Creating...";

  const userid = (($("addPostUserId")?.value || "")).trim();
  const courseName = (($("addPostCourseName")?.value || "")).trim();
  const description = (($("addPostDescription")?.value || "")).trim();
  const file = $("addPostFile")?.files?.[0];

  if (!userid || !courseName || !description) {
    if (note) note.textContent = "User ID, Course Name, and Description are required.";
    return;
  }

  if (!file) {
    if (note) note.textContent = "Image is required.";
    return;
  }

  const fd = new FormData();
  fd.append("userid", userid);
  fd.append("courseName", courseName);
  fd.append("description", description);
  fd.append("FileName", file.name);
  fd.append("File", file, file.name);

  const r = await httpJson(POSTS_CREATE, { method: "POST", body: fd });

  if (!r.ok) {
    if (note) note.textContent = `Failed (${r.status}).`;
    return;
  }

  if (note) note.textContent = "Created.";
  closeAddPost();
  await loadHomePosts();
}

function openAddReview() {
  const note = $("addReviewNote");
  if (note) note.textContent = "";
  const tnote = $("addReviewTranslateNote");
  if (tnote) tnote.textContent = "";

  $("addReviewUserId").value = "";
  $("addReviewRating").value = "";
  $("addReviewText").value = "";
  openModal("addReviewModal");
}

function closeAddReview() {
  closeModal("addReviewModal");
}

async function submitAddReview() {
  const note = $("addReviewNote");
  if (note) note.textContent = "Creating...";

  const postid = state.currentPostId;
  if (!postid) {
    if (note) note.textContent = "No post selected.";
    return;
  }

  const userid = (($("addReviewUserId")?.value || "")).trim();
  const rating = (($("addReviewRating")?.value || "")).trim();
  const text = (($("addReviewText")?.value || "")).trim();

  if (!userid || !text) {
    if (note) note.textContent = "User ID and Review are required.";
    return;
  }

  const body = { userid, text, rating };
  const url = buildUrl(REV_CREATE_BASE, [postid, "reviews"], REV_CREATE_QS);

  const r = await httpJson(url, { method: "POST", body: JSON.stringify(body) });

  if (!r.ok) {
    if (note) note.textContent = `Failed (${r.status}).`;
    return;
  }

  if (note) note.textContent = "Created.";
  closeAddReview();
  await loadReviewsForPost(postid);
}

function stripCosmosSystemFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (k.startsWith("_")) continue; // _rid, _etag, _ts, _self, _attachments, etc.
    out[k] = v;
  }
  return out;
}


function toggleEditPost() {
  const post = state.postsById.get(state.currentPostId);
  if (!post) return;

  // stop showing translated description while editing
  if (!state.editing) post._displayDescription = null;

  state.editing = !state.editing;
  renderDetail(post);
}

function extractPostDoc(payload) {
  let d =
    payload?.document ??
    payload?.resource ??
    payload?.body?.document ??
    payload?.body?.resource ??
    payload?.body ??
    payload;

  if (Array.isArray(d)) d = d[0];
  return d || {};
}

async function saveEditPost() {
  const post = state.postsById.get(state.currentPostId);
  if (!post) return;

  const note = $("editNote");
  if (note) note.textContent = "Saving...";

  const courseName = (($("editCourseName")?.value || "")).trim();
  const description = (($("editDescription")?.value || "")).trim();

  if (!courseName || !description) {
    if (note) note.textContent = "Course Name and Description are required.";
    return;
  }

  // 1) GET existing doc (but safely extract the actual document)
  const getUrl = buildUrl(POSTS_GET_ONE_BASE, [post.userid, post.id], POSTS_GET_ONE_QS);
  const g = await httpJson(getUrl, { method: "GET" });

  if (!g.ok) {
    if (note) note.textContent = `Could not load existing post (${g.status}).`;
    return;
  }

  const existingRaw = extractPostDoc(g.data);
  const existing = stripCosmosSystemFields(existingRaw);

  // 2) Build PUT body from existing doc
  const body = { ...existing };

  // required ids
  body.id = existingRaw?.id ?? existingRaw?.postId ?? post.id;
  body.userid = existingRaw?.userid ?? existingRaw?.userId ?? post.userid;

  // overwrite edited fields
  body.courseName = courseName;
  body.description = description;

  // 3) FORCE image/media preservation (fallback to cached post.media)
  const preservedMedia =
    existingRaw?.media ??
    existingRaw?.Media ??
    body.media ??
    body.Media ??
    post.media ??
    null;

  if (preservedMedia) {
    body.media = body.media ?? preservedMedia;
    // keep both casings if your Cosmos schema/Logic Apps vary
    body.Media = body.Media ?? preservedMedia;
  }

  // also preserve any “flat” image fields if your doc uses them
  body.imageUrl = body.imageUrl ?? existingRaw?.imageUrl;
  body.blobUrl  = body.blobUrl  ?? existingRaw?.blobUrl;
  body.url      = body.url      ?? existingRaw?.url;
  body.src      = body.src      ?? existingRaw?.src;

  // 4) PUT replace
  const putUrl = buildUrl(POSTS_UPDATE_BASE, [post.userid, post.id], POSTS_UPDATE_QS);
  const r = await httpJson(putUrl, { method: "PUT", body: JSON.stringify(body) });

  if (!r.ok) {
    if (note) note.textContent = `Failed (${r.status}).`;
    return;
  }

  // 5) Update UI/cache WITHOUT dropping media
  const updated = {
    ...post,
    courseName,
    description,
    media: preservedMedia || post.media,
    _displayDescription: null,
  };

  state.postsById.set(updated.id, updated);
  state.editing = false;
  renderDetail(updated);
  await loadHomePosts();

  if (note) note.textContent = "Saved.";
}




document.addEventListener("DOMContentLoaded", () => {
  $("btnRefreshHome")?.addEventListener("click", loadHomePosts);

  $("btnCloseDetail")?.addEventListener("click", () => closeModal("detailModal"));
  $("btnEditPost")?.addEventListener("click", toggleEditPost);

  // Translation buttons
  $("btnTranslateDetail")?.addEventListener("click", translateDetailView);
  $("btnResetDetail")?.addEventListener("click", resetDetailTranslation);
  $("btnTranslatePostDesc")?.addEventListener("click", translateAddPostDescription);
  $("btnTranslateReviewText")?.addEventListener("click", translateAddReviewText);

  $("btnOpenAddPost")?.addEventListener("click", openAddPost);
  $("btnCloseAddPost")?.addEventListener("click", closeAddPost);
  $("btnSubmitAddPost")?.addEventListener("click", submitAddPost);

  $("btnOpenAddReview")?.addEventListener("click", openAddReview);
  $("btnCloseAddReview")?.addEventListener("click", closeAddReview);
  $("btnSubmitAddReview")?.addEventListener("click", submitAddReview);

  const grid = $("coursesGrid");
  if (grid) {
    grid.addEventListener("click", (e) => {
      const delBtn = e.target.closest('[data-action="delete"]');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        const card = delBtn.closest(".course-card");
        if (!card) return;
        deletePostByCard(card.dataset.userid || "", card.dataset.postid || "");
        return;
      }

      const card = e.target.closest(".course-card");
      if (!card) return;
      const postid = card.dataset.postid || "";
      const userid = card.dataset.userid || "";
      if (!postid || !userid) return;
      showPostDetail(userid, postid);
    });
  }

  loadHomePosts();
});
