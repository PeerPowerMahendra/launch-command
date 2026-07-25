/* ================================================================
   LAUNCH COMMAND — frontend logic v2
   Same API contract as v1: POST /api/generate, GET/PUT /api/board,
   POST /api/board/reset. Vanilla JS, no dependencies.
   ================================================================ */
"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SCROLL_BEHAVIOR = REDUCED_MOTION ? "auto" : "smooth";

/* ---------------- toasts ---------------- */

const toastStack = $("#toast-stack");

function toast(msg, kind = "ok") {
  const t = document.createElement("div");
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  toastStack.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 320);
  }, 2600);
}

/* ---------------- error banner ---------------- */

const errorBanner = $("#error-banner");
const errorText = $("#error-text");

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.hidden = false;
}

function hideError() {
  errorBanner.hidden = true;
}

$("#error-dismiss").addEventListener("click", hideError);

/* ---------------- demo-mode popup ---------------- */

const demoModal = $("#demo-modal");

function showDemoModal() {
  demoModal.hidden = false;
  $("#demo-modal-ok").focus();
}

function hideDemoModal() {
  demoModal.hidden = true;
}

$$("[data-demo-close]", demoModal).forEach((el) => el.addEventListener("click", hideDemoModal));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !demoModal.hidden) hideDemoModal();
});

/* ================================================================
   00 · CAMPAIGN GENERATION
   ================================================================ */

const genForm = $("#gen-form");
const genBtn = $("#gen-btn");
const genLabel = genBtn.querySelector(".gen-btn-label");
const genSpinner = genBtn.querySelector(".gen-btn-spinner");

const AI_MODULE_IDS = ["m01", "m02", "m03"];
const GEN_PHASES = [
  "Reading the brief…",
  "Profiling the persona…",
  "Writing three ad angles…",
  "Sequencing the emails…",
  "Polishing every line…",
];

let hasCampaign = false;
let phaseTimer = null;

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setNavState(id, state) {
  const dot = $(`.nav-link[href="#${id}"] .nav-state`);
  if (dot) dot.dataset.state = state;
}

function setStale(isStale) {
  $$(".ai-module").forEach((sec) => sec.classList.toggle("stale", isStale));
  AI_MODULE_IDS.forEach((id) =>
    setNavState(id, isStale ? "stale" : hasCampaign ? "ready" : "pending")
  );
}

function setLoading(on) {
  AI_MODULE_IDS.forEach((id) => $("#" + id).classList.toggle("loading", on));
  genBtn.disabled = on;
  genSpinner.hidden = !on;
  clearInterval(phaseTimer);
  if (on) {
    let i = 0;
    genLabel.textContent = GEN_PHASES[0];
    phaseTimer = setInterval(() => {
      i = Math.min(i + 1, GEN_PHASES.length - 1);
      genLabel.textContent = GEN_PHASES[i];
    }, 3200);
  } else {
    genLabel.textContent = "Generate campaign";
  }
}

function populateCampaign(campaign) {
  $$(".ai-field[data-field]").forEach((el) => {
    const value = getByPath(campaign, el.dataset.field);
    el.textContent = value != null ? String(value) : "";
  });
  hasCampaign = true;
  document.body.classList.add("has-campaign");
  setStale(false);

  // staggered card reveal
  AI_MODULE_IDS.forEach((id) => {
    const sec = $("#" + id);
    sec.classList.remove("just-generated");
    void sec.offsetWidth; // restart animation on re-generation
    sec.classList.add("just-generated");
    setTimeout(() => sec.classList.remove("just-generated"), 1800);
  });
}

genForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const payload = {
    name: $("#f-name").value,
    category: $("#f-category").value,
    price: $("#f-price").value,
    problem: $("#f-problem").value,
    mechanism: $("#f-mechanism").value,
    audience: $("#f-audience").value,
    competitor: $("#f-competitor").value,
    offer: $("#f-offer").value,
    tone: $("#f-tone").value,
  };

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Generation failed (HTTP ${res.status})`);

    populateCampaign(data);

    // sidebar campaign readout
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#side-campaign-name").textContent = payload.name.trim() || "Untitled campaign";
    $("#side-campaign-meta").textContent = data.demo
      ? `Sample data · not generated`
      : `${payload.tone} · drafted ${time}`;

    if (data.demo) {
      showDemoModal();
      toast("Showing static sample data — no AI connected", "warn");
    } else {
      toast("Campaign drafted — every field is editable");
    }
    $("#m01").scrollIntoView({ behavior: SCROLL_BEHAVIOR });
  } catch (err) {
    showError(err.message || "Generation failed.");
    if (hasCampaign) setStale(true); // never leave old data looking fresh
  } finally {
    setLoading(false);
  }
});

/* editing a stale field means the user has taken ownership — clear the flag */
$$(".ai-module").forEach((sec) => {
  sec.addEventListener("input", () => {
    if (sec.classList.contains("stale")) {
      sec.classList.remove("stale");
      setNavState(sec.id, hasCampaign ? "ready" : "pending");
    }
  });
});

/* ---------------- "try an example" autofill ---------------- */

const EXAMPLE_BRIEF = {
  "f-name": "Driftwell",
  "f-category": "Weighted sleep mask with a cooling gel core",
  "f-price": "$79 one-time",
  "f-tone": "Warm and reassuring",
  "f-problem":
    "You lie awake at 2am with a racing mind, and every sleep mask you've tried either leaks light, heats up, or slides off before midnight.",
  "f-mechanism":
    "A contoured 340g micro-bead weave that applies gentle, even pressure across the brow — wrapped around a replaceable gel core that stays cool for 8 hours.",
  "f-audience": "", // intentionally blank — demonstrates persona inference
  "f-competitor": "Cheap satin masks and melatonin gummies",
  "f-offer": "Launch week: 25% off the first 500 units + a free gel refill, ends Sunday midnight",
};

$("#try-example").addEventListener("click", () => {
  Object.entries(EXAMPLE_BRIEF).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  });
  toast("Example brief loaded — audience left blank on purpose");
  $("#f-name").focus();
});

/* ================================================================
   EDITABLE FIELDS — shared plumbing
   ================================================================ */

/* contenteditable can leave a stray <br> behind — normalize so :empty styling works */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.classList && (el.classList.contains("chip-input") || el.classList.contains("ai-field"))) {
    if (el.textContent.trim() === "" && el.innerHTML !== "") el.innerHTML = "";
  }
});

/* prevent Enter from inserting line breaks in single-line editables */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const el = e.target;
  if (
    el.classList &&
    (el.classList.contains("chip-input") ||
      el.classList.contains("task-title") ||
      el.classList.contains("task-owner"))
  ) {
    e.preventDefault();
    el.blur();
  }
});

/* ---------------- copy-to-clipboard ---------------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

$$(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const card = btn.closest(".card");
    const lines = [];
    $$(".ai-field[data-field]", card).forEach((f) => {
      const value = f.textContent.trim();
      if (!value) return;
      const row = f.closest(".ad-block, .email-row, li, .persona-secondary");
      const labelEl = row ? row.querySelector(".li-label") : null;
      const label = labelEl ? labelEl.childNodes[0].textContent.trim() : "";
      lines.push(label ? `${label}: ${value}` : value);
    });

    if (!lines.length) {
      toast("Nothing to copy yet — generate the campaign first", "warn");
      return;
    }

    const ok = await copyText(lines.join("\n"));
    if (!ok) {
      showError("Could not copy to the clipboard in this browser.");
      return;
    }
    btn.classList.add("copied");
    btn.textContent = "Copied ✓";
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.textContent = "Copy";
    }, 1500);
    toast("Copied to clipboard");
  });
});

/* ================================================================
   05 · KANBAN BOARD
   ================================================================ */

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "inprogress", label: "In Progress" },
  { key: "inreview", label: "In Review" },
  { key: "done", label: "Done" },
];

const TYPE_OPTIONS = ["AD", "EMAIL", "CONTENT", "OPS"];
const PRIORITY_OPTIONS = ["Highest", "High", "Medium", "Low"];

const boardEl = $("#board");
const boardMetaEl = $("#board-meta");
const saveStatusEl = $("#save-status");
const saveTextEl = $("#save-text");

let tasks = [];
let saveTimer = null;

function setSaveStatus(state, text) {
  saveStatusEl.className = `save-status ${state}`;
  saveTextEl.textContent = text;
}

async function loadBoard() {
  try {
    const res = await fetch("/api/board");
    if (!res.ok) throw new Error();
    const data = await res.json();
    tasks = data.tasks || [];
    renderBoard();
    setSaveStatus("saved", "Synced with backend");
  } catch {
    setSaveStatus("error", "Backend unreachable");
    showError("Could not load the task board from the backend. Is the server running?");
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  setSaveStatus("saving", "Saving…");
  saveTimer = setTimeout(saveBoard, 350);
}

async function saveBoard() {
  try {
    const res = await fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    });
    if (!res.ok) throw new Error();
    setSaveStatus("saved", "Saved");
  } catch {
    setSaveStatus("error", "Save failed — retrying");
    setTimeout(saveBoard, 3000);
  }
}

function findTask(id) {
  return tasks.find((t) => t.id === id);
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ownerColorClass(initials) {
  if (!initials) return "";
  const n = [...initials].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return "oc" + (n % 4);
}

function chipSelect(options, value, prefix, onChange) {
  const sel = document.createElement("select");
  sel.className = `chip-select ${prefix}-${value}`;
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => {
    sel.className = `chip-select ${prefix}-${sel.value}`;
    onChange(sel.value);
  });
  return sel;
}

function taskCardEl(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.draggable = true;
  card.dataset.id = task.id;
  card.dataset.type = task.type;

  // title — inline editable
  const title = document.createElement("div");
  title.className = "task-title";
  title.contentEditable = "true";
  title.spellcheck = false;
  title.textContent = task.title;
  title.addEventListener("blur", () => {
    task.title = title.textContent.trim() || "Untitled task";
    title.textContent = task.title;
    scheduleSave();
  });

  // chips
  const chips = document.createElement("div");
  chips.className = "task-chips";
  chips.appendChild(
    chipSelect(TYPE_OPTIONS, task.type, "type", (v) => {
      task.type = v;
      card.dataset.type = v;
      scheduleSave();
    })
  );
  chips.appendChild(
    chipSelect(PRIORITY_OPTIONS, task.priority, "pri", (v) => {
      task.priority = v;
      scheduleSave();
    })
  );

  // footer: owner avatar + due date + delete
  const foot = document.createElement("div");
  foot.className = "task-foot";

  const owner = document.createElement("span");
  owner.className = `task-owner ${ownerColorClass(task.owner)}`.trim();
  owner.contentEditable = "true";
  owner.spellcheck = false;
  owner.title = "Click to set owner initials";
  owner.textContent = task.owner || "";
  owner.addEventListener("input", () => {
    if (owner.textContent.length > 3) {
      owner.textContent = owner.textContent.slice(0, 3);
    }
  });
  owner.addEventListener("blur", () => {
    task.owner = owner.textContent.trim().toUpperCase().slice(0, 3);
    owner.textContent = task.owner;
    owner.className = `task-owner ${ownerColorClass(task.owner)}`.trim();
    scheduleSave();
  });

  const due = document.createElement("input");
  due.type = "date";
  due.className = "task-due";
  due.value = task.due || "";
  const markOverdue = () => {
    due.classList.toggle("overdue", Boolean(task.due) && task.due < todayISO() && task.column !== "done");
  };
  markOverdue();
  due.addEventListener("change", () => {
    task.due = due.value;
    markOverdue();
    scheduleSave();
  });

  const del = document.createElement("button");
  del.className = "task-delete";
  del.type = "button";
  del.title = "Delete task";
  del.setAttribute("aria-label", "Delete task");
  del.textContent = "✕";
  del.addEventListener("click", () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    renderBoard();
    scheduleSave();
  });

  foot.append(owner, due, del);
  card.append(title, chips, foot);

  // drag behavior
  card.addEventListener("dragstart", (e) => {
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    $$(".col-list.drag-over").forEach((l) => l.classList.remove("drag-over"));
    syncTasksFromDom();
    renderBoard();
    scheduleSave();
  });

  return card;
}

function getDragAfterElement(list, y) {
  const cards = [...list.querySelectorAll(".task-card:not(.dragging)")];
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  for (const child of cards) {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  }
  return closest.element;
}

/* Rebuild the tasks array (column + order) from the current DOM state */
function syncTasksFromDom() {
  const ordered = [];
  $$(".board-col").forEach((col) => {
    const colKey = col.dataset.col;
    col.querySelectorAll(".task-card").forEach((cardEl) => {
      const task = findTask(cardEl.dataset.id);
      if (task) {
        task.column = colKey;
        ordered.push(task);
      }
    });
  });
  tasks = ordered;
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (const col of COLUMNS) {
    const colEl = document.createElement("div");
    colEl.className = "board-col";
    colEl.dataset.col = col.key;

    const colTasks = tasks.filter((t) => t.column === col.key);

    const head = document.createElement("div");
    head.className = "col-head";
    head.innerHTML =
      `<span class="col-title"><span class="col-dot"></span>${col.label}</span>` +
      `<span class="col-count">${colTasks.length}</span>`;

    const list = document.createElement("div");
    list.className = "col-list";
    for (const task of colTasks) list.appendChild(taskCardEl(task));

    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      list.classList.add("drag-over");
      const dragging = $(".task-card.dragging");
      if (!dragging) return;
      const after = getDragAfterElement(list, e.clientY);
      if (after == null) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
    });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      list.classList.remove("drag-over");
    });

    const addBtn = document.createElement("button");
    addBtn.className = "add-task-btn";
    addBtn.type = "button";
    addBtn.textContent = "+ Add task";
    addBtn.addEventListener("click", () => {
      const task = {
        id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: "New task",
        type: "OPS",
        priority: "Medium",
        owner: "",
        due: "",
        column: col.key,
      };
      tasks.push(task);
      renderBoard();
      scheduleSave();
      const newTitle = boardEl.querySelector(`.task-card[data-id="${task.id}"] .task-title`);
      if (newTitle) {
        newTitle.focus();
        document.getSelection().selectAllChildren(newTitle);
      }
    });

    colEl.append(head, list, addBtn);
    boardEl.appendChild(colEl);
  }

  const done = tasks.filter((t) => t.column === "done").length;
  boardMetaEl.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${done} shipped`;
}

$("#board-reset").addEventListener("click", async () => {
  if (!confirm("Reset the board to the default seed tasks? This overwrites all current tasks.")) return;
  try {
    setSaveStatus("saving", "Resetting…");
    const res = await fetch("/api/board/reset", { method: "POST" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    tasks = data.tasks;
    renderBoard();
    setSaveStatus("saved", "Board reset");
    toast("Board reset to defaults");
  } catch {
    setSaveStatus("error", "Reset failed");
    showError("Could not reset the board — backend unreachable.");
  }
});

/* ================================================================
   NAVIGATION · PROGRESS · REVEALS
   ================================================================ */

/* active-section highlighting */
const navLinks = $$(".nav-link");
const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);

const activeObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
      );
    }
  },
  { rootMargin: "-35% 0px -55% 0px" }
);

sections.forEach((s) => activeObserver.observe(s));

/* scroll-triggered module reveals */
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.04 }
);

$$(".module").forEach((m) => revealObserver.observe(m));

/* sidebar scroll progress */
const progressFill = $("#side-progress-fill");

function updateProgress() {
  if (!progressFill) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  progressFill.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0).toFixed(1) + "%";
}

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress, { passive: true });

/* ---------------- generation engine badge ---------------- */

async function loadEngineStatus() {
  const badge = $("#engine-badge");
  const text = $("#engine-text");
  const hint = $("#gen-hint");
  try {
    const res = await fetch("/api/status");
    const { mode } = await res.json();
    if (mode === "api") {
      badge.dataset.mode = "api";
      text.textContent = "Engine · Anthropic API";
      if (hint) hint.textContent = "Takes ~20 seconds · every output stays editable";
    } else if (mode === "claude-code") {
      badge.dataset.mode = "local";
      text.textContent = "Engine · Local Claude Code";
      if (hint) hint.textContent = "Takes 1–2 minutes on the local engine · every output stays editable";
    } else {
      badge.dataset.mode = "demo";
      text.textContent = "Engine · Demo (no AI)";
      if (hint) hint.textContent = "No AI connected — Generate shows static sample data instantly";
    }
  } catch {
    text.textContent = "Engine · offline";
  }
}

/* ---------------- init ---------------- */

loadBoard();
loadEngineStatus();
updateProgress();
