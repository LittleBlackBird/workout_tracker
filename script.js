"use strict";

/* =========================================================
   Constants
   ========================================================= */
const STORAGE_KEY = "trackerV7";
const LEGACY_KEYS = {
  data: "workoutV6",
  custom: "workoutCustomExercisesV6",
  plan: "workoutPlanV6"
};
const STUDY_GOAL = 7; // hours per day

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultPlan = {
  Monday: ["Lat Pulldown", "Row", "Barbell Curl", "Hammer Curl", "Farmer Walk", "Dead Hang"],
  Tuesday: ["Bench Press", "Incline Bench", "Tricep Skullcrusher", "Tricep Pushdown", "Dips"],
  Wednesday: ["Walk"],
  Thursday: ["Lateral Raise", "Shoulder Press", "Alternating Curl", "Tricep Pushdown", "Reverse Curl"],
  Friday: ["Run"],
  Saturday: ["Hike"],
  Sunday: []
};

const defaultLibrary = {
  "Lat Pulldown": "gifs/lat-pulldown.gif",
  "Row": "gifs/row.gif",
  "Barbell Curl": "gifs/barbell-curl.gif",
  "Hammer Curl": "gifs/hammer-curl.gif",
  "Farmer Walk": "gifs/farmer-walk.gif",
  "Dead Hang": "gifs/dead-hang.gif",
  "Bench Press": "gifs/bench-press.gif",
  "Incline Bench": "gifs/incline-bench.gif",
  "Tricep Skullcrusher": "gifs/skullcrusher.gif",
  "Tricep Pushdown": "gifs/tricep-pushdown.gif",
  "Dips": "gifs/dips.gif",
  "Walk": "gifs/walk.gif",
  "Lateral Raise": "gifs/lateral-raise.gif",
  "Shoulder Press": "gifs/shoulder-press.gif",
  "Alternating Curl": "gifs/alternating-curl.gif",
  "Reverse Curl": "gifs/reverse-curl.gif",
  "Run": "gifs/run.gif",
  "Hike": "gifs/hike.gif"
};

/* =========================================================
   Small utilities
   ========================================================= */
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  return new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
}

function isValidISO(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso + "T12:00:00"));
}

function weekdayOf(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
}

function niceDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

function shiftISO(iso, delta) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("en-CA");
}

function lastNDates(n, endISO) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftISO(endISO, -i));
  return out;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* =========================================================
   Database (single storage key) + migration from V6
   ========================================================= */
let db = loadDB();

function emptyDB() {
  return { version: 7, studyGoal: STUDY_GOAL, library: {}, plan: clone(defaultPlan), days: {} };
}

function loadDB() {
  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch { /* corrupted -> rebuild */ }

  if (parsed && parsed.version === 7 && typeof parsed.days === "object") {
    parsed.library = parsed.library || {};
    parsed.plan = parsed.plan || clone(defaultPlan);
    parsed.studyGoal = Number(parsed.studyGoal) || STUDY_GOAL;
    return parsed;
  }

  const fresh = emptyDB();
  migrateFromV6(fresh);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

/** Import old "Week X-Day" data. Entries with a completedDate move to that
 *  date; entries without one can't be placed on a real calendar and are
 *  skipped. Old keys are left untouched as a safety net. */
function migrateFromV6(target) {
  try {
    const oldCustom = JSON.parse(localStorage.getItem(LEGACY_KEYS.custom) || "{}");
    if (oldCustom && typeof oldCustom === "object") target.library = { ...oldCustom };
  } catch { /* ignore */ }

  try {
    const oldPlan = JSON.parse(localStorage.getItem(LEGACY_KEYS.plan) || "null");
    if (oldPlan && typeof oldPlan === "object") target.plan = { ...clone(defaultPlan), ...oldPlan };
  } catch { /* ignore */ }

  try {
    const oldData = JSON.parse(localStorage.getItem(LEGACY_KEYS.data) || "{}");
    let migrated = 0;
    Object.values(oldData || {}).forEach((entries) => {
      (entries || []).forEach((e) => {
        if (!e || !e.name || !isValidISO(e.completedDate || "")) return;
        const day = getDay(e.completedDate, target);
        const setCount = Math.max(1, Number(e.sets) || 1);
        const sets = [];
        if (Number(e.reps) || Number(e.load)) {
          for (let i = 0; i < setCount; i++) {
            sets.push({ load: Number(e.load) || 0, reps: Number(e.reps) || 0 });
          }
        }
        day.workouts.push({
          id: uid(),
          name: String(e.name),
          sets,
          notes: String(e.notes || ""),
          done: Boolean(e.done)
        });
        migrated++;
      });
    });
    if (migrated) console.info(`Migrated ${migrated} entries from the old format.`);
  } catch { /* ignore */ }
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function getDay(iso, target = db) {
  if (!target.days[iso]) target.days[iso] = { workouts: [], study: null };
  if (!Array.isArray(target.days[iso].workouts)) target.days[iso].workouts = [];
  return target.days[iso];
}

function pruneDay(iso) {
  const d = db.days[iso];
  if (d && d.workouts.length === 0 && (d.study === null || d.study === undefined)) {
    delete db.days[iso];
  }
}

function getLibrary() {
  return { ...defaultLibrary, ...db.library };
}

function gifFor(name) {
  return getLibrary()[name] || "";
}

function isPlanned(name, iso) {
  return (db.plan[weekdayOf(iso)] || []).includes(name);
}

function totalVolume(entry) {
  return (entry.sets || []).reduce((sum, s) => sum + (Number(s.load) || 0) * (Number(s.reps) || 0), 0);
}

function topLoad(entry) {
  return (entry.sets || []).reduce((max, s) => Math.max(max, Number(s.load) || 0), 0);
}

function setsSummary(entry) {
  if (!entry.sets || !entry.sets.length) return "No sets logged";
  return entry.sets.map((s) => `${s.load || 0} kg × ${s.reps || 0}`).join("  ·  ");
}

/* =========================================================
   State + DOM refs
   ========================================================= */
let selectedDate = todayISO();
let editing = null; // { id, date }
let dashRange = 7;
let resetArmTimer = null;

const refs = {
  datePicker: $("datePicker"), weekdayLabel: $("weekdayLabel"),
  studyHours: $("studyHours"), studyProgressFill: $("studyProgressFill"),
  studyStatus: $("studyStatus"), studyGoalLabel: $("studyGoalLabel"),
  plannedList: $("plannedList"), plannedDayName: $("plannedDayName"),
  loggedList: $("loggedList"), loggedDayName: $("loggedDayName"),
  exerciseSelect: $("exerciseSelect"), gifPreviewContainer: $("gifPreviewContainer"),
  setRows: $("setRows"), notes: $("notes"), doneCheckbox: $("doneCheckbox"),
  workoutForm: $("workoutForm"),
  editingBanner: $("editingBanner"), editingName: $("editingName"),
  historyList: $("historyList"),
  studyStats: $("studyStats"), studyChart: $("studyChart"),
  workoutStats: $("workoutStats"), workoutChart: $("workoutChart"),
  volumeChart: $("volumeChart"),
  trendExercise: $("trendExercise"), trendChart: $("trendChart"),
  newExerciseForm: $("newExerciseForm"),
  newExerciseName: $("newExerciseName"), newExerciseGif: $("newExerciseGif"),
  customList: $("customList"),
  planDay: $("planDay"), planEditor: $("planEditor"),
  toast: $("toast"), resetBtn: $("reset")
};

/* =========================================================
   Init
   ========================================================= */
function init() {
  refs.studyGoalLabel.textContent = `Goal: ${db.studyGoal} h`;

  DAYS.forEach((day) => {
    refs.planDay.insertAdjacentHTML("beforeend",
      `<option value="${escapeHtml(day)}">${escapeHtml(day)}</option>`);
  });

  refreshExerciseDropdowns();
  addSetRow();

  // ---- Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // ---- Date navigation
  refs.datePicker.value = selectedDate;
  refs.datePicker.addEventListener("change", () => {
    if (isValidISO(refs.datePicker.value)) {
      selectedDate = refs.datePicker.value;
      renderToday();
    }
  });
  $("prevDay").addEventListener("click", () => moveDay(-1));
  $("nextDay").addEventListener("click", () => moveDay(1));
  $("jumpToday").addEventListener("click", () => {
    selectedDate = todayISO();
    refs.datePicker.value = selectedDate;
    renderToday();
  });

  // ---- Study
  $("saveStudy").addEventListener("click", saveStudyHours);
  refs.studyHours.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); saveStudyHours(); }
  });

  // ---- Workout form
  refs.workoutForm.addEventListener("submit", handleWorkoutSubmit);
  refs.exerciseSelect.addEventListener("change", updateGifPreview);
  $("addSetRow").addEventListener("click", () => addSetRow());
  $("cancelEdit").addEventListener("click", cancelEdit);

  refs.setRows.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-set]");
    if (btn) { btn.closest(".set-row").remove(); renumberSetRows(); }
  });

  // ---- Delegated card actions (Today + History)
  refs.plannedList.addEventListener("change", (e) => {
    const box = e.target.closest(".planned-checkbox");
    if (box) togglePlanned(box.dataset.exercise, box.checked);
  });
  refs.plannedList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-log-exercise]");
    if (btn) prefillForm(btn.dataset.logExercise);
  });
  refs.loggedList.addEventListener("click", handleEntryAction);
  refs.historyList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-date]");
    if (btn) {
      selectedDate = btn.dataset.openDate;
      refs.datePicker.value = selectedDate;
      switchTab("tab-today");
      renderToday();
    }
  });

  // ---- History / backup
  $("exportBtn").addEventListener("click", exportData);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", importData);
  refs.resetBtn.addEventListener("click", resetAll);

  // ---- Dashboard
  document.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      dashRange = Number(btn.dataset.range);
      document.querySelectorAll(".range-btn").forEach((b) =>
        b.classList.toggle("active", b === btn));
      renderDashboard();
    });
  });
  refs.trendExercise.addEventListener("change", renderTrendChart);

  // ---- Library
  refs.newExerciseForm.addEventListener("submit", handleNewExercise);
  refs.customList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-exercise]");
    if (btn) deleteCustomExercise(btn.dataset.deleteExercise);
  });
  refs.planDay.addEventListener("change", renderPlanEditor);
  $("addPlanExercise").addEventListener("click", () => {
    const day = refs.planDay.value;
    (db.plan[day] = db.plan[day] || []).push("New Exercise");
    renderPlanEditor();
  });
  $("savePlan").addEventListener("click", saveEditedPlan);
  refs.planEditor.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-index]");
    if (btn) {
      db.plan[refs.planDay.value].splice(Number(btn.dataset.removeIndex), 1);
      renderPlanEditor();
    }
  });

  renderAll();
  registerServiceWorker();
}

function renderAll() {
  renderToday();
  renderHistory();
  renderDashboard();
  renderLibrary();
  renderPlanEditor();
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  if (tabId === "tab-dashboard") renderDashboard();
  if (tabId === "tab-history") renderHistory();
}

function moveDay(delta) {
  selectedDate = shiftISO(selectedDate, delta);
  refs.datePicker.value = selectedDate;
  renderToday();
}

/* =========================================================
   Today: study hours
   ========================================================= */
function saveStudyHours() {
  const raw = refs.studyHours.value.trim();
  const hours = Number(raw);
  if (raw === "" || Number.isNaN(hours) || hours < 0 || hours > 24) {
    showToast("Enter study hours between 0 and 24.");
    return;
  }
  getDay(selectedDate).study = hours;
  saveDB();
  renderStudy();
  showToast(hours >= db.studyGoal
    ? `${hours} h saved — goal reached! 🎉`
    : `${hours} h saved.`);
}

function renderStudy() {
  const day = db.days[selectedDate];
  const hours = day && typeof day.study === "number" ? day.study : null;
  refs.studyHours.value = hours ?? "";

  const pct = hours === null ? 0 : Math.min(100, (hours / db.studyGoal) * 100);
  refs.studyProgressFill.style.width = `${pct}%`;
  refs.studyProgressFill.classList.toggle("over", hours !== null && hours >= db.studyGoal);

  if (hours === null) {
    refs.studyStatus.textContent = `No hours logged for this day yet. Goal: ${db.studyGoal} h.`;
  } else if (hours >= db.studyGoal) {
    refs.studyStatus.textContent = `Goal reached: ${hours} h of ${db.studyGoal} h (+${(hours - db.studyGoal).toFixed(2).replace(/\.?0+$/, "")} h over).`;
  } else {
    refs.studyStatus.textContent = `${hours} h of ${db.studyGoal} h — ${(db.studyGoal - hours).toFixed(2).replace(/\.?0+$/, "")} h to go.`;
  }
}

/* =========================================================
   Today: planned + logged lists
   ========================================================= */
function renderToday() {
  const weekday = weekdayOf(selectedDate);
  refs.weekdayLabel.textContent = selectedDate === todayISO()
    ? `${weekday} — today` : weekday;
  refs.plannedDayName.textContent = weekday;
  refs.loggedDayName.textContent = niceDate(selectedDate);

  renderStudy();
  renderPlanned();
  renderLogged();
}

function renderPlanned() {
  const weekday = weekdayOf(selectedDate);
  const planned = db.plan[weekday] || [];
  const entries = (db.days[selectedDate] || { workouts: [] }).workouts;

  if (!planned.length) {
    refs.plannedList.innerHTML =
      `<div class="empty-state">No planned exercises for ${escapeHtml(weekday)}. Edit your plan in the Library tab.</div>`;
    return;
  }

  refs.plannedList.innerHTML = planned.map((name) => {
    const matches = entries.filter((e) => e.name === name);
    const isDone = matches.some((e) => e.done);
    const hasLog = matches.length > 0;
    return `
      <div class="card">
        <div class="plan-check-row">
          <div>
            <h3>${escapeHtml(name)}</h3>
            <div class="badge-row">
              <span class="badge planned">Planned</span>
              ${isDone ? `<span class="badge done">Completed</span>` : ""}
            </div>
            <p class="muted">${
              isDone ? "Done" : hasLog ? "Logged, not marked done" : "Not completed yet"
            }</p>
            <button class="small-btn" type="button" data-log-exercise="${escapeHtml(name)}">Log details</button>
          </div>
          <label>
            <input type="checkbox" class="planned-checkbox"
              ${isDone ? "checked" : ""} data-exercise="${escapeHtml(name)}"
              aria-label="Mark ${escapeHtml(name)} as done" />
          </label>
        </div>
      </div>`;
  }).join("");
}

function togglePlanned(name, checked) {
  const day = getDay(selectedDate);
  const matches = day.workouts.filter((e) => e.name === name);

  if (matches.length) {
    matches.forEach((e) => { e.done = checked; });
  } else if (checked) {
    day.workouts.push({ id: uid(), name, sets: [], notes: "", done: true });
  }
  pruneDay(selectedDate);
  saveDB();
  renderPlanned();
  renderLogged();
}

function prefillForm(name) {
  refs.exerciseSelect.value = name;
  updateGifPreview();
  refs.workoutForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLogged() {
  const entries = (db.days[selectedDate] || { workouts: [] }).workouts;

  if (!entries.length) {
    refs.loggedList.innerHTML =
      `<div class="empty-state">Nothing logged on ${escapeHtml(niceDate(selectedDate))} yet.</div>`;
    return;
  }

  refs.loggedList.innerHTML = entries.map((entry) => {
    const gif = gifFor(entry.name);
    const planned = isPlanned(entry.name, selectedDate);
    const vol = totalVolume(entry);
    return `
      <div class="card">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(entry.name)}</h3>
            <p class="meta">${escapeHtml(setsSummary(entry))}</p>
            ${vol ? `<p class="meta">Volume: ${vol.toLocaleString()} kg·reps</p>` : ""}
            ${entry.notes ? `<p class="muted">${escapeHtml(entry.notes)}</p>` : ""}
          </div>
        </div>
        <div class="badge-row">
          <span class="badge planned">${planned ? "Planned" : "Extra"}</span>
          ${entry.done ? `<span class="badge done">Done</span>` : `<span class="badge date">Recorded only</span>`}
        </div>
        ${gif ? `<img class="exercise-gif" src="${escapeHtml(gif)}" alt="${escapeHtml(entry.name)}" loading="lazy" onerror="this.remove()" />` : ""}
        <div class="card-actions">
          <button class="small-btn" type="button" data-action="edit" data-id="${entry.id}">Edit</button>
          <button class="small-btn" type="button" data-action="duplicate" data-id="${entry.id}">Duplicate</button>
          <button class="danger-btn" type="button" data-action="delete" data-id="${entry.id}">Delete</button>
        </div>
      </div>`;
  }).join("");
}

function handleEntryAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  const day = db.days[selectedDate];
  if (!day) return;
  const entry = day.workouts.find((w) => w.id === id);
  if (!entry) return;

  if (action === "edit") startEdit(entry);
  if (action === "duplicate") {
    day.workouts.push({ ...clone(entry), id: uid(), done: false });
    saveDB();
    renderLogged();
    renderPlanned();
    showToast("Entry duplicated.");
  }
  if (action === "delete") {
    day.workouts = day.workouts.filter((w) => w.id !== id);
    if (editing && editing.id === id) cancelEdit();
    pruneDay(selectedDate);
    saveDB();
    renderLogged();
    renderPlanned();
    showToast("Entry deleted.");
  }
}

/* =========================================================
   Workout form (per-set rows, edit with banner + cancel)
   ========================================================= */
function refreshExerciseDropdowns() {
  const names = Object.keys(getLibrary()).sort();
  const options = names.map((n) =>
    `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
  refs.exerciseSelect.innerHTML = options;
  refs.trendExercise.innerHTML = options;
  updateGifPreview();
}

function updateGifPreview() {
  const gif = gifFor(refs.exerciseSelect.value);
  if (!gif) {
    refs.gifPreviewContainer.innerHTML = `<span class="muted">No GIF for this exercise</span>`;
    return;
  }
  refs.gifPreviewContainer.innerHTML =
    `<img src="${escapeHtml(gif)}" alt="${escapeHtml(refs.exerciseSelect.value)}"
      onerror="if(this.parentElement)this.parentElement.innerHTML='<span class=&quot;muted&quot;>GIF not found</span>'" />`;
}

function addSetRow(load = "", reps = "") {
  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML = `
    <span class="set-num"></span>
    <input type="number" min="0" step="0.5" placeholder="kg" class="set-load" aria-label="Load in kg" />
    <input type="number" min="0" step="1" placeholder="reps" class="set-reps" aria-label="Repetitions" />
    <button type="button" class="remove-btn" data-remove-set aria-label="Remove set">×</button>`;
  row.querySelector(".set-load").value = load;
  row.querySelector(".set-reps").value = reps;
  refs.setRows.appendChild(row);
  renumberSetRows();
}

function renumberSetRows() {
  refs.setRows.querySelectorAll(".set-row").forEach((row, i) => {
    row.querySelector(".set-num").textContent = i + 1;
  });
}

function collectSets() {
  return Array.from(refs.setRows.querySelectorAll(".set-row"))
    .map((row) => ({
      load: Number(row.querySelector(".set-load").value) || 0,
      reps: Number(row.querySelector(".set-reps").value) || 0
    }))
    .filter((s) => s.load > 0 || s.reps > 0);
}

function resetWorkoutForm() {
  refs.workoutForm.reset();
  refs.doneCheckbox.checked = true;
  refs.setRows.innerHTML = "";
  addSetRow();
  updateGifPreview();
}

function startEdit(entry) {
  editing = { id: entry.id, date: selectedDate };
  refs.exerciseSelect.value = entry.name;
  refs.notes.value = entry.notes || "";
  refs.doneCheckbox.checked = Boolean(entry.done);
  refs.setRows.innerHTML = "";
  if (entry.sets && entry.sets.length) {
    entry.sets.forEach((s) => addSetRow(s.load || "", s.reps || ""));
  } else {
    addSetRow();
  }
  updateGifPreview();
  refs.editingName.textContent = entry.name;
  refs.editingBanner.hidden = false;
  refs.workoutForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEdit() {
  editing = null;
  refs.editingBanner.hidden = true;
  resetWorkoutForm();
}

function handleWorkoutSubmit(event) {
  event.preventDefault();
  const name = refs.exerciseSelect.value;
  if (!name) {
    showToast("Select an exercise first.");
    return;
  }

  const payload = {
    name,
    sets: collectSets(),
    notes: refs.notes.value.trim(),
    done: refs.doneCheckbox.checked
  };

  if (editing) {
    // Find the entry where it originally lived — no silent loss if the
    // user navigated to another date mid-edit.
    const sourceDay = db.days[editing.date];
    const idx = sourceDay ? sourceDay.workouts.findIndex((w) => w.id === editing.id) : -1;
    if (idx === -1) {
      showToast("The entry being edited no longer exists. Saved as new instead.");
      getDay(selectedDate).workouts.push({ id: uid(), ...payload });
    } else if (editing.date === selectedDate) {
      sourceDay.workouts[idx] = { id: editing.id, ...payload };
      showToast("Entry updated.");
    } else {
      // Moved to a different day.
      sourceDay.workouts.splice(idx, 1);
      pruneDay(editing.date);
      getDay(selectedDate).workouts.push({ id: editing.id, ...payload });
      showToast(`Entry moved to ${niceDate(selectedDate)}.`);
    }
    editing = null;
    refs.editingBanner.hidden = true;
  } else {
    getDay(selectedDate).workouts.push({ id: uid(), ...payload });
    showToast("Workout saved.");
  }

  saveDB();
  resetWorkoutForm();
  renderLogged();
  renderPlanned();
}

/* =========================================================
   History
   ========================================================= */
function renderHistory() {
  const dates = Object.keys(db.days)
    .filter((iso) => {
      const d = db.days[iso];
      return d.workouts.length || typeof d.study === "number";
    })
    .sort()
    .reverse();

  if (!dates.length) {
    refs.historyList.innerHTML =
      `<div class="empty-state">No days logged yet. Everything you save shows up here.</div>`;
    return;
  }

  refs.historyList.innerHTML = dates.map((iso) => {
    const d = db.days[iso];
    const doneCount = d.workouts.filter((w) => w.done).length;
    const vol = d.workouts.reduce((s, w) => s + totalVolume(w), 0);
    const study = typeof d.study === "number" ? d.study : null;
    return `
      <div class="card">
        <div class="history-card-head">
          <h3>${escapeHtml(niceDate(iso))}</h3>
          <button class="small-btn" type="button" data-open-date="${iso}">Open</button>
        </div>
        <p class="meta">${d.workouts.length} exercise${d.workouts.length === 1 ? "" : "s"} logged · ${doneCount} done${vol ? ` · ${vol.toLocaleString()} kg·reps` : ""}</p>
        <div class="badge-row">
          ${study !== null
            ? `<span class="badge ${study >= db.studyGoal ? "done" : "planned"}">Study: ${study} h${study >= db.studyGoal ? " ✓" : ""}</span>`
            : `<span class="badge date">No study logged</span>`}
        </div>
      </div>`;
  }).join("");
}

/* =========================================================
   Backup: export / import / reset
   ========================================================= */
function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tracker-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Backup exported.");
}

function importData(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || parsed.version !== 7 || typeof parsed.days !== "object") {
        showToast("That file is not a valid backup from this app.");
        return;
      }
      db = parsed;
      db.library = db.library || {};
      db.plan = db.plan || clone(defaultPlan);
      db.studyGoal = Number(db.studyGoal) || STUDY_GOAL;
      saveDB();
      cancelEdit();
      refreshExerciseDropdowns();
      renderAll();
      showToast("Backup imported.");
    } catch {
      showToast("Could not read that file as JSON.");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!refs.resetBtn.classList.contains("armed")) {
    refs.resetBtn.classList.add("armed");
    refs.resetBtn.textContent = "Tap again to erase everything";
    resetArmTimer = setTimeout(disarmReset, 4000);
    return;
  }
  clearTimeout(resetArmTimer);
  disarmReset();

  localStorage.removeItem(STORAGE_KEY);
  Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
  db = emptyDB();
  saveDB();
  cancelEdit();
  selectedDate = todayISO();
  refs.datePicker.value = selectedDate;
  refreshExerciseDropdowns();
  renderAll();
  showToast("All data erased.");
}

function disarmReset() {
  refs.resetBtn.classList.remove("armed");
  refs.resetBtn.textContent = "Reset all data";
}

/* =========================================================
   Dashboard
   ========================================================= */
function renderDashboard() {
  const dates = lastNDates(dashRange, todayISO());
  renderStudyDashboard(dates);
  renderWorkoutDashboard(dates);
  renderTrendChart();
}

function renderStudyDashboard(dates) {
  const values = dates.map((iso) => {
    const d = db.days[iso];
    return d && typeof d.study === "number" ? d.study : null;
  });

  const logged = values.filter((v) => v !== null);
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const met = logged.filter((v) => v >= db.studyGoal).length;

  // Current streak of goal-met days, counting back from today
  // (a day with no log breaks it).
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] >= db.studyGoal) streak++;
    else break;
  }

  refs.studyStats.innerHTML = `
    <div class="stat"><strong>${avg ? avg.toFixed(1) : "—"}</strong><span>avg h / logged day</span></div>
    <div class="stat"><strong>${met}/${dates.length}</strong><span>days goal met</span></div>
    <div class="stat"><strong>${streak}</strong><span>day streak</span></div>`;

  refs.studyChart.innerHTML = barChart({
    dates,
    values: values.map((v) => v ?? 0),
    known: values.map((v) => v !== null),
    goal: db.studyGoal,
    colorFor: (v, has) => !has ? "#334155" : v >= db.studyGoal ? "#22c55e" : "#0ea5e9",
    unit: "h"
  });
}

function renderWorkoutDashboard(dates) {
  const doneCounts = dates.map((iso) =>
    (db.days[iso]?.workouts || []).filter((w) => w.done).length);
  const volumes = dates.map((iso) =>
    (db.days[iso]?.workouts || []).reduce((s, w) => s + totalVolume(w), 0));

  const activeDays = doneCounts.filter((c) => c > 0).length;
  const totalDone = doneCounts.reduce((a, b) => a + b, 0);
  const totalVol = volumes.reduce((a, b) => a + b, 0);

  refs.workoutStats.innerHTML = `
    <div class="stat"><strong>${activeDays}/${dates.length}</strong><span>active days</span></div>
    <div class="stat"><strong>${totalDone}</strong><span>exercises done</span></div>
    <div class="stat"><strong>${totalVol >= 10000 ? (totalVol / 1000).toFixed(1) + "k" : totalVol.toLocaleString()}</strong><span>total kg·reps</span></div>`;

  refs.workoutChart.innerHTML = barChart({
    dates,
    values: doneCounts,
    known: doneCounts.map(() => true),
    colorFor: (v) => v > 0 ? "#38bdf8" : "#334155",
    unit: ""
  });

  refs.volumeChart.innerHTML = barChart({
    dates,
    values: volumes,
    known: volumes.map(() => true),
    colorFor: (v) => v > 0 ? "#a78bfa" : "#334155",
    unit: " kg·reps"
  });
}

function renderTrendChart() {
  const name = refs.trendExercise.value;
  const dates = lastNDates(dashRange, todayISO());
  const points = [];

  dates.forEach((iso, i) => {
    const entries = (db.days[iso]?.workouts || []).filter((w) => w.name === name);
    if (!entries.length) return;
    const max = Math.max(...entries.map(topLoad));
    if (max > 0) points.push({ i, iso, value: max });
  });

  refs.trendChart.innerHTML = points.length
    ? lineChart({ dates, points, unit: " kg" })
    : `<div class="empty-state">No loads recorded for ${escapeHtml(name)} in this range.</div>`;
}

/* ---------- Chart builders (hand-rolled SVG, no libraries) ---------- */
const CHART_W = 340, CHART_H = 150, PAD_L = 30, PAD_B = 20, PAD_T = 12;

function chartMax(values, goal) {
  const max = Math.max(goal || 0, ...values, 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / step) * step;
}

function xLabelEvery(n) {
  return n <= 7 ? 1 : n <= 30 ? 5 : 15;
}

function shortLabel(iso) {
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function barChart({ dates, values, known, goal, colorFor, unit }) {
  const n = dates.length;
  const plotW = CHART_W - PAD_L - 6;
  const plotH = CHART_H - PAD_T - PAD_B;
  const max = chartMax(values, goal);
  const gap = n > 30 ? 1 : 3;
  const barW = Math.max(1, plotW / n - gap);
  const every = xLabelEvery(n);

  let bars = "";
  values.forEach((v, i) => {
    const h = (v / max) * plotH;
    const x = PAD_L + (plotW / n) * i + gap / 2;
    const y = PAD_T + plotH - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
      height="${Math.max(h, known[i] && v > 0 ? 2 : 0).toFixed(1)}" rx="1.5"
      fill="${colorFor(v, known[i])}">
      <title>${shortLabel(dates[i])}: ${known[i] ? v + unit : "not logged"}</title></rect>`;
    if (i % every === 0) {
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${CHART_H - 4}"
        font-size="8" fill="#94a3b8" text-anchor="middle">${shortLabel(dates[i])}</text>`;
    }
  });

  const goalLine = goal
    ? (() => {
        const gy = PAD_T + plotH - (goal / max) * plotH;
        return `<line x1="${PAD_L}" y1="${gy}" x2="${CHART_W - 4}" y2="${gy}"
          stroke="#fbbf24" stroke-width="1" stroke-dasharray="4 3" />
          <text x="${CHART_W - 4}" y="${gy - 3}" font-size="8" fill="#fbbf24"
          text-anchor="end">goal ${goal}${unit}</text>`;
      })()
    : "";

  return `<svg viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="Bar chart">
    ${yAxis(max, plotH, unit)}${bars}${goalLine}</svg>`;
}

function lineChart({ dates, points, unit }) {
  const n = dates.length;
  const plotW = CHART_W - PAD_L - 10;
  const plotH = CHART_H - PAD_T - PAD_B;
  const max = chartMax(points.map((p) => p.value));
  const every = xLabelEvery(n);

  const xy = (p) => ({
    x: PAD_L + (plotW / Math.max(n - 1, 1)) * p.i,
    y: PAD_T + plotH - (p.value / max) * plotH
  });

  const poly = points.map((p) => {
    const { x, y } = xy(p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  let dots = "";
  points.forEach((p) => {
    const { x, y } = xy(p);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#38bdf8">
      <title>${shortLabel(p.iso)}: ${p.value}${unit}</title></circle>`;
  });

  let xLabels = "";
  dates.forEach((iso, i) => {
    if (i % every !== 0) return;
    const x = PAD_L + (plotW / Math.max(n - 1, 1)) * i;
    xLabels += `<text x="${x.toFixed(1)}" y="${CHART_H - 4}" font-size="8"
      fill="#94a3b8" text-anchor="middle">${shortLabel(iso)}</text>`;
  });

  return `<svg viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="Line chart">
    ${yAxis(max, plotH, unit)}
    ${points.length > 1 ? `<polyline points="${poly}" fill="none" stroke="#38bdf8" stroke-width="2" />` : ""}
    ${dots}${xLabels}</svg>`;
}

function yAxis(max, plotH, unit) {
  let out = "";
  [0, 0.5, 1].forEach((t) => {
    const y = PAD_T + plotH - t * plotH;
    const val = max * t;
    out += `<line x1="${PAD_L}" y1="${y}" x2="${CHART_W - 4}" y2="${y}"
      stroke="#1e293b" stroke-width="1" />
      <text x="${PAD_L - 4}" y="${y + 3}" font-size="8" fill="#64748b"
      text-anchor="end">${val >= 1000 ? (val / 1000) + "k" : Math.round(val * 10) / 10}</text>`;
  });
  return out;
}

/* =========================================================
   Library + weekly plan
   ========================================================= */
function handleNewExercise(event) {
  event.preventDefault();
  const name = refs.newExerciseName.value.trim();
  const gif = refs.newExerciseGif.value.trim();

  if (!name) {
    showToast("Enter an exercise name.");
    return;
  }
  if (getLibrary()[name]) {
    showToast("This exercise already exists.");
    return;
  }

  db.library[name] = gif;
  saveDB();
  refreshExerciseDropdowns();
  refs.exerciseSelect.value = name;
  updateGifPreview();
  refs.newExerciseForm.reset();
  renderLibrary();
  showToast(`"${name}" added to library.`);
}

function deleteCustomExercise(name) {
  delete db.library[name];
  saveDB();
  refreshExerciseDropdowns();
  renderLibrary();
  showToast(`"${name}" removed from library.`);
}

function renderLibrary() {
  const names = Object.keys(db.library).sort();
  if (!names.length) {
    refs.customList.innerHTML =
      `<div class="empty-state">No custom exercises yet — add your first above.</div>`;
    return;
  }
  refs.customList.innerHTML = names.map((name) => `
    <div class="card custom-row">
      <div>
        <h3>${escapeHtml(name)}</h3>
        <span class="gif-path">${db.library[name] ? escapeHtml(db.library[name]) : "No GIF"}</span>
      </div>
      <button class="remove-btn" type="button" data-delete-exercise="${escapeHtml(name)}">Remove</button>
    </div>`).join("");
}

function renderPlanEditor() {
  const day = refs.planDay.value || DAYS[0];
  const exercises = db.plan[day] || [];

  if (!exercises.length) {
    refs.planEditor.innerHTML =
      `<div class="empty-state">No exercises planned for ${escapeHtml(day)} yet.</div>`;
    return;
  }

  refs.planEditor.innerHTML = exercises.map((exercise, index) => `
    <div class="plan-editor-row">
      <input type="text" value="${escapeHtml(exercise)}" data-index="${index}"
        class="plan-editor-input" aria-label="Planned exercise ${index + 1}" />
      <button type="button" class="remove-btn" data-remove-index="${index}">Remove</button>
    </div>`).join("");
}

function saveEditedPlan() {
  const day = refs.planDay.value;
  db.plan[day] = Array.from(refs.planEditor.querySelectorAll(".plan-editor-input"))
    .map((input) => input.value.trim())
    .filter((v) => v !== "");
  saveDB();
  renderPlanEditor();
  renderPlanned();
  showToast(`${day} plan saved.`);
}

/* =========================================================
   Toast + service worker
   ========================================================= */
let toastTimer = null;
function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { refs.toast.hidden = true; }, 2600);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode unavailable */ });
  }
}

init();
