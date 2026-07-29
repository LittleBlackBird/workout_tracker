"use strict";

/* =========================================================
   Constants
   ========================================================= */
const STORAGE_KEY = "trackerV7";
const DB_VERSION = 8; // v8 = loads stored in pounds
const LEGACY_KEYS = {
  data: "workoutV6",
  custom: "workoutCustomExercisesV6",
  plan: "workoutPlanV6"
};
const STUDY_GOAL = 7;   // hours per day
const UNIT = "lb";      // weight unit used everywhere
const KG_TO_LB = 2.20462;

/* Free Exercise DB (github.com/yuhonas/free-exercise-db) — public domain
   (Unlicense). Each exercise has two frames, 0.jpg and 1.jpg, which the app
   alternates to produce a GIF-like animation. */
const FEDB_IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const FEDB_JSON = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

/* Search hints used when auto-matching our names against that dataset. */
const FEDB_ALIASES = {
  "Lat Pulldown": "wide grip lat pulldown",
  "Farmer Walk": "farmers walk",
  "Dead Hang": "pullup",
  "Passive Dead Hang": "pullup",
  "Tricep Pushdown": "triceps pushdown",
  "Lateral Raise": "side lateral raise",
  "Romanian Deadlift": "romanian deadlift",
  "Daily Walk": "walking treadmill",
  "Run": "running treadmill",
  "Hike": "walking treadmill",
  "Cat-Cow": "cat stretch",
  "Bird-Dog": "bird dog",
  "Child's Pose with Side Reach": "childs pose",
  "Thread the Needle": "thoracic rotation",
  "World's Greatest Stretch": "groiners",
  "Legs-Up-The-Wall": "lying hamstring stretch",
  "Standing Forward Fold": "standing toe touches",
  "Wall Calf Stretch": "calf stretch elbows against wall",
  "Kneeling Hip Flexor Stretch": "kneeling hip flexor",
  "Kneeling Lunge Hip Flexor Stretch": "kneeling hip flexor",
  "Standing Overhead Lat & Side Stretch": "lats side stretch",
  "Deep Squat Hold": "bodyweight squat",
  "Spinal Decompression": "lying hamstring stretch",
  "Glute Bridge": "glute bridge"
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const dayTitles = {
  Monday: "Pull & Grip (Gym)",
  Tuesday: "Push (Gym)",
  Wednesday: "Active Recovery (Walk)",
  Thursday: "Lower Body & Legs (Gym)",
  Friday: "Cardio & Endurance (Run)",
  Saturday: "Outdoor Endurance (Hike)",
  Sunday: "Rest & Reset"
};

const ROUTINE_VERSION = 2;

/* The routine that shipped before the stretching plan was added. A stored day
   that still matches this was never edited, so it is safe to upgrade. */
const previousDefaultPlan = {
  Monday: ["Lat Pulldown", "Row", "Barbell Curl", "Hammer Curl", "Farmer Walk", "Dead Hang"],
  Tuesday: ["Bench Press", "Incline Bench", "Tricep Skullcrusher", "Tricep Pushdown", "Dips"],
  Wednesday: ["Walk"],
  Thursday: ["Lateral Raise", "Shoulder Press", "Alternating Curl", "Tricep Pushdown", "Reverse Curl"],
  Friday: ["Run"],
  Saturday: ["Hike"],
  Sunday: []
};

const defaultPlan = {
  Monday: [
    "Lat Pulldown", "Cable / Barbell Row", "Barbell Curl", "Hammer Curl",
    "Farmer Walk", "Dead Hang",
    "Child's Pose with Side Reach", "Passive Dead Hang", "Thread the Needle"
  ],
  Tuesday: [
    "Bench Press", "Incline Bench Press", "Dips", "Tricep Pushdown", "Lateral Raise",
    "Doorway / Corner Chest Stretch", "Standing Overhead Lat & Side Stretch", "Cat-Cow"
  ],
  Wednesday: [
    "Daily Walk",
    "Kneeling Hip Flexor Stretch", "Glute Bridge", "Figure-4 / Seated Pigeon Stretch"
  ],
  Thursday: [
    "Squat / Goblet Squat", "Romanian Deadlift", "Lunge / Step-up", "Calf Raise",
    "Quad Stretch", "Single-Leg Hamstring Stretch", "Spinal Decompression"
  ],
  Friday: [
    "Run",
    "Wall Calf Stretch", "Kneeling Lunge Hip Flexor Stretch", "Standing Forward Fold"
  ],
  Saturday: [
    "Hike",
    "Pigeon Pose / Floor Figure-4", "Butterfly Stretch", "Legs-Up-The-Wall"
  ],
  Sunday: [
    "Complete Physical Rest",
    "World's Greatest Stretch", "Bird-Dog", "Kneeling Hip Flexor Stretch", "Deep Squat Hold"
  ]
};

/* Library entries: { gif, cue, type }
   type: "main" = strength/cardio, "mobility" = stretch & mobility,
         "legacy" = kept only so older logged entries still display. */
const defaultLibrary = {
  /* ---- Monday: pull & grip ---- */
  "Lat Pulldown":                        { gif: "gifs/lat-pulldown.gif",       cue: "3-4 sets",              type: "main" },
  "Cable / Barbell Row":                 { gif: "gifs/row.gif",                cue: "3-4 sets",              type: "main", fedb: "Bent_Over_Barbell_Row" },
  "Barbell Curl":                        { gif: "gifs/barbell-curl.gif",       cue: "3 sets",                type: "main", fedb: "Barbell_Curl" },
  "Hammer Curl":                         { gif: "gifs/hammer-curl.gif",        cue: "3 sets",                type: "main", fedb: "Alternate_Hammer_Curl" },
  "Farmer Walk":                         { gif: "gifs/farmer-walk.gif",        cue: "3 loaded carries",      type: "main" },
  "Dead Hang":                           { gif: "gifs/dead-hang.gif",          cue: "Max hold",              type: "main" },
  "Child's Pose with Side Reach":        { gif: "",                            cue: "30 sec / side",         type: "mobility" },
  "Passive Dead Hang":                   { gif: "gifs/dead-hang.gif",          cue: "2-3 x 20-30 sec",       type: "mobility" },
  "Thread the Needle":                   { gif: "",                            cue: "30 sec / side",         type: "mobility" },

  /* ---- Tuesday: push ---- */
  "Bench Press":                         { gif: "gifs/bench-press.gif",        cue: "4 sets",                type: "main", fedb: "Barbell_Bench_Press_-_Medium_Grip" },
  "Incline Bench Press":                 { gif: "gifs/incline-bench.gif",      cue: "3 sets",                type: "main", fedb: "Barbell_Incline_Bench_Press_-_Medium_Grip" },
  "Dips":                                { gif: "gifs/dips.gif",               cue: "3 sets",                type: "main", fedb: "Bench_Dips" },
  "Tricep Pushdown":                     { gif: "gifs/tricep-pushdown.gif",    cue: "3 sets",                type: "main" },
  "Lateral Raise":                       { gif: "gifs/lateral-raise.gif",      cue: "3 sets",                type: "main" },
  "Doorway / Corner Chest Stretch":      { gif: "",                            cue: "30 sec / side",         type: "mobility", fedb: "Behind_Head_Chest_Stretch" },
  "Standing Overhead Lat & Side Stretch":{ gif: "",                            cue: "30 sec / side",         type: "mobility" },
  "Cat-Cow":                             { gif: "",                            cue: "10 slow reps",          type: "mobility" },

  /* ---- Wednesday: active recovery ---- */
  "Daily Walk":                          { gif: "gifs/walk.gif",               cue: "8,000-10,000 steps",    type: "main" },
  "Kneeling Hip Flexor Stretch":         { gif: "",                            cue: "45 sec / side",         type: "mobility" },
  "Glute Bridge":                        { gif: "",                            cue: "2 x 12 (activation)",   type: "mobility", fedb: "Barbell_Glute_Bridge" },
  "Figure-4 / Seated Pigeon Stretch":    { gif: "",                            cue: "45 sec / side",         type: "mobility", fedb: "Ankle_On_The_Knee" },

  /* ---- Thursday: lower body ---- */
  "Squat / Goblet Squat":                { gif: "https://commons.wikimedia.org/wiki/Special:FilePath/Squats.gif", cue: "4 sets", type: "main", fedb: "Barbell_Squat" },
  "Romanian Deadlift":                   { gif: "",                            cue: "3-4 sets",              type: "main" },
  "Lunge / Step-up":                     { gif: "",                            cue: "3 sets / side",         type: "main", fedb: "Barbell_Walking_Lunge" },
  "Calf Raise":                          { gif: "",                            cue: "3-4 sets",              type: "main", fedb: "Barbell_Seated_Calf_Raise" },
  "Quad Stretch":                        { gif: "",                            cue: "30 sec / side",         type: "mobility", fedb: "All_Fours_Quad_Stretch" },
  "Single-Leg Hamstring Stretch":        { gif: "",                            cue: "45 sec / side, soft knee", type: "mobility", fedb: "90_90_Hamstring" },
  "Spinal Decompression":                { gif: "",                            cue: "5 min, legs 90° on chair", type: "mobility" },

  /* ---- Friday: cardio ---- */
  "Run":                                 { gif: "gifs/run.gif",                cue: "Road or trail",         type: "main" },
  "Wall Calf Stretch":                   { gif: "",                            cue: "45 sec / side",         type: "mobility" },
  "Kneeling Lunge Hip Flexor Stretch":   { gif: "",                            cue: "45 sec / side",         type: "mobility" },
  "Standing Forward Fold":               { gif: "",                            cue: "30 sec, soft knees",    type: "mobility" },

  /* ---- Saturday: hike ---- */
  "Hike":                                { gif: "gifs/hike.gif",               cue: "Trail / mountain",      type: "main" },
  "Pigeon Pose / Floor Figure-4":        { gif: "",                            cue: "60 sec / side",         type: "mobility", fedb: "Ankle_On_The_Knee" },
  "Butterfly Stretch":                   { gif: "",                            cue: "45 sec (adductors)",    type: "mobility", fedb: "Adductor_Groin" },
  "Legs-Up-The-Wall":                    { gif: "",                            cue: "5 min passive",         type: "mobility" },

  /* ---- Sunday: rest & reset ---- */
  "Complete Physical Rest":              { gif: "",                            cue: "No training today",     type: "main" },
  "World's Greatest Stretch":            { gif: "",                            cue: "5 reps / side",         type: "mobility" },
  "Bird-Dog":                            { gif: "",                            cue: "3 x 6-8 / side",        type: "mobility" },
  "Deep Squat Hold":                     { gif: "",                            cue: "Hold, breathe",         type: "mobility" },

  /* ---- Kept so previously logged entries still show correctly ---- */
  "Row":                                 { gif: "gifs/row.gif",                cue: "", type: "legacy" },
  "Incline Bench":                       { gif: "gifs/incline-bench.gif",      cue: "", type: "legacy" },
  "Tricep Skullcrusher":                 { gif: "gifs/skullcrusher.gif",       cue: "", type: "legacy" },
  "Shoulder Press":                      { gif: "gifs/shoulder-press.gif",     cue: "", type: "legacy" },
  "Alternating Curl":                    { gif: "gifs/alternating-curl.gif",   cue: "", type: "legacy" },
  "Reverse Curl":                        { gif: "gifs/reverse-curl.gif",       cue: "", type: "legacy" },
  "Walk":                                { gif: "gifs/walk.gif",               cue: "", type: "legacy" }
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
let pendingUnitNotice = false;
let pendingRoutineNotice = false;
let db = loadDB();

function emptyDB() {
  return {
    version: DB_VERSION, studyGoal: STUDY_GOAL, unit: UNIT, routine: ROUTINE_VERSION,
    library: {}, plan: clone(defaultPlan), days: {}
  };
}

/** Loads/normalises the stored database, upgrading older shapes:
 *  v6 (Week X-Day keys)  -> date-keyed days
 *  v7 (loads in kg)      -> loads converted to pounds */
function loadDB() {
  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) { /* corrupted -> rebuild */ }

  if (parsed && typeof parsed.days === "object" &&
      (parsed.version === 7 || parsed.version === DB_VERSION)) {
    normaliseDB(parsed);
    if (upgradeRoutine(parsed)) {
      pendingRoutineNotice = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    if (parsed.version === 7) {
      convertLoadsKgToLb(parsed);
      parsed.version = DB_VERSION;
      parsed.unit = UNIT;
      pendingUnitNotice = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  }

  const fresh = emptyDB();
  migrateFromV6(fresh);           // old data was recorded in kilograms
  convertLoadsKgToLb(fresh);
  upgradeRoutine(fresh);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function sameList(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Brings each weekday up to the current built-in routine, but only where the
 *  stored day still matches the previous built-in one (or is empty). Days the
 *  user edited themselves are left exactly as they are. */
function upgradeRoutine(target) {
  if (target.routine === ROUTINE_VERSION) return 0;
  let upgraded = 0;
  DAYS.forEach((day) => {
    const stored = target.plan[day];
    const untouched = !Array.isArray(stored) || stored.length === 0 ||
      sameList(stored, previousDefaultPlan[day]);
    if (untouched && !sameList(stored, defaultPlan[day])) {
      target.plan[day] = clone(defaultPlan[day]);
      upgraded++;
    }
  });
  target.routine = ROUTINE_VERSION;
  return upgraded;
}

function normaliseDB(target) {
  target.library = target.library || {};
  target.plan = target.plan || clone(defaultPlan);
  target.studyGoal = Number(target.studyGoal) || STUDY_GOAL;
  DAYS.forEach((day) => {
    if (!Array.isArray(target.plan[day])) target.plan[day] = clone(defaultPlan[day] || []);
  });
}

/** One-time unit change: every stored load was entered in kilograms, so
 *  convert to pounds and round to the nearest half pound. */
function convertLoadsKgToLb(target) {
  let touched = 0;
  Object.keys(target.days || {}).forEach((iso) => {
    (target.days[iso].workouts || []).forEach((w) => {
      (w.sets || []).forEach((s) => {
        const kg = Number(s.load) || 0;
        if (kg > 0) {
          s.load = Math.round(kg * KG_TO_LB * 2) / 2;
          touched++;
        }
      });
    });
  });
  return touched;
}

/** Import old "Week X-Day" data. Entries with a completedDate move to that
 *  date; entries without one can't be placed on a real calendar and are
 *  skipped. Old keys are left untouched as a safety net. */
function migrateFromV6(target) {
  try {
    const oldCustom = JSON.parse(localStorage.getItem(LEGACY_KEYS.custom) || "{}");
    if (oldCustom && typeof oldCustom === "object") {
      Object.keys(oldCustom).forEach((name) => {
        target.library[name] = { gif: String(oldCustom[name] || ""), cue: "", type: "main" };
      });
    }
  } catch (e) { /* ignore */ }

  try {
    const oldPlan = JSON.parse(localStorage.getItem(LEGACY_KEYS.plan) || "null");
    if (oldPlan && typeof oldPlan === "object") {
      // Keep the new routine, but don't lose days the user had customised.
      Object.keys(oldPlan).forEach((day) => {
        if (Array.isArray(oldPlan[day]) && oldPlan[day].length) {
          target.plan[day] = oldPlan[day].slice();
        }
      });
    }
  } catch (e) { /* ignore */ }

  try {
    const oldData = JSON.parse(localStorage.getItem(LEGACY_KEYS.data) || "{}");
    let migrated = 0;
    Object.keys(oldData || {}).forEach((key) => {
      (oldData[key] || []).forEach((e) => {
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
          id: uid(), name: String(e.name), sets,
          notes: String(e.notes || ""), done: Boolean(e.done)
        });
        migrated++;
      });
    });
    if (migrated) console.info("Migrated " + migrated + " entries from the old format.");
  } catch (e) { /* ignore */ }
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

/** Library entries may be a plain gif string (older data) or an object. */
function normaliseEntry(value) {
  if (!value) return { gif: "", cue: "", type: "main" };
  if (typeof value === "string") {
    return { gif: value, cue: "", type: "main", fedb: "", frames: [] };
  }
  return {
    gif: value.gif || "",
    cue: value.cue || "",
    type: value.type || "main",
    fedb: value.fedb || "",
    frames: Array.isArray(value.frames) ? value.frames.slice(0, 2) : []
  };
}

function getLibrary() {
  const merged = {};
  Object.keys(defaultLibrary).forEach((name) => {
    merged[name] = normaliseEntry(defaultLibrary[name]);
  });
  Object.keys(db.library || {}).forEach((name) => {
    const custom = normaliseEntry(db.library[name]);
    // A user-set GIF overrides the built-in one; cue/type fall back to it.
    merged[name] = merged[name]
      ? { gif: custom.gif || merged[name].gif,
          cue: custom.cue || merged[name].cue,
          type: merged[name].type,
          fedb: custom.fedb || merged[name].fedb,
          frames: custom.frames.length ? custom.frames : merged[name].frames }
      : custom;
  });
  return merged;
}

function libEntry(name) {
  return getLibrary()[name] || { gif: "", cue: "", type: "main", fedb: "", frames: [] };
}

function hasImage(name) {
  return frameUrls(libEntry(name)).length > 0 || Boolean(libEntry(name).gif);
}

/** Full URLs of the two still frames, from stored paths or a known id. */
function frameUrls(entry) {
  if (entry.frames && entry.frames.length) {
    return entry.frames.map((path) =>
      /^https?:/i.test(path) ? path : FEDB_IMG + encodeURI(path));
  }
  if (entry.fedb) {
    return [FEDB_IMG + encodeURI(entry.fedb) + "/0.jpg",
            FEDB_IMG + encodeURI(entry.fedb) + "/1.jpg"];
  }
  return [];
}

/** Renders an exercise image. A GIF you supplied wins; if it is missing or
 *  fails to load, it falls back to the two public-domain frames, which
 *  animateFrames() alternates to imitate an animation. */
function exerciseImageHtml(name, className) {
  const entry = libEntry(name);
  const alt = escapeHtml(name);
  const urls = frameUrls(entry);
  const a = urls[0] ? escapeHtml(urls[0]) : "";
  const b = urls[1] ? escapeHtml(urls[1]) : a;
  const frames = a ? `data-frame-a="${a}" data-frame-b="${b}"` : "";

  if (entry.gif) {
    return `<img class="${className}" src="${escapeHtml(entry.gif)}" alt="${alt}"
      loading="lazy" ${frames} onerror="imageFallback(this)" />`;
  }
  if (a) {
    return `<img class="${className} frame-anim" src="${a}" alt="${alt}"
      loading="lazy" ${frames} onerror="this.remove()" />`;
  }
  return "";
}

/** A local GIF that isn't there shouldn't leave an empty box. */
function imageFallback(img) {
  const a = img.dataset.frameA;
  if (a && img.getAttribute("src") !== a) {
    img.classList.add("frame-anim");
    img.setAttribute("src", a);
    img.onerror = () => img.remove();
  } else {
    img.remove();
  }
}

/** Alternates the two still frames so the images read as animations. */
function animateFrames() {
  let flipped = false;
  setInterval(() => {
    flipped = !flipped;
    document.querySelectorAll("img.frame-anim").forEach((img) => {
      const next = flipped ? img.dataset.frameB : img.dataset.frameA;
      if (next && img.getAttribute("src") !== next) img.setAttribute("src", next);
    });
  }, 900);
}

function gifFor(name) {
  return libEntry(name).gif;
}

function cueFor(name) {
  return libEntry(name).cue;
}

function typeFor(name) {
  return libEntry(name).type;
}

function isCustom(name) {
  return Object.prototype.hasOwnProperty.call(db.library || {}, name);
}

/** Opens an image search for this exercise so a GIF can be found quickly. */
function gifSearchUrl(name) {
  return "https://duckduckgo.com/?iax=images&ia=images&q=" +
    encodeURIComponent(name + " exercise gif");
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
  return entry.sets.map((s) => `${s.load || 0} ${UNIT} × ${s.reps || 0}`).join("  ·  ");
}

/* =========================================================
   State + DOM refs
   ========================================================= */
let selectedDate = todayISO();
let editing = null; // { id, date }
let dashRange = 7;
let libraryFilter = "";
let showMissingOnly = false;
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
  customList: $("customList"), libraryCount: $("libraryCount"),
  librarySearch: $("librarySearch"), showMissingOnly: $("showMissingOnly"),
  autoMatch: $("autoMatch"),
  planDay: $("planDay"), planEditor: $("planEditor"),
  routineBanner: $("routineBanner"),
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
  $("importMerge").addEventListener("click", () => applyImport("merge"));
  $("importReplace").addEventListener("click", () => applyImport("replace"));
  $("importCancel").addEventListener("click", clearPendingImport);
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
    const del = e.target.closest("[data-delete-exercise]");
    if (del) { deleteCustomExercise(del.dataset.deleteExercise); return; }
    const save = e.target.closest("[data-save-gif]");
    if (save) saveGifFor(save.dataset.saveGif);
  });
  refs.customList.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList.contains("library-gif-input")) {
      e.preventDefault();
      saveGifFor(e.target.dataset.gifFor);
    }
  });
  refs.librarySearch.addEventListener("input", () => {
    libraryFilter = refs.librarySearch.value;
    renderLibrary();
  });
  refs.autoMatch.addEventListener("click", autoMatchImages);
  refs.showMissingOnly.addEventListener("change", () => {
    showMissingOnly = refs.showMissingOnly.checked;
    renderLibrary();
  });
  refs.planDay.addEventListener("change", renderPlanEditor);
  $("addPlanExercise").addEventListener("click", () => {
    const day = refs.planDay.value;
    (db.plan[day] = db.plan[day] || []).push("New Exercise");
    renderPlanEditor();
  });
  $("savePlan").addEventListener("click", saveEditedPlan);
  $("restoreRoutine").addEventListener("click", restoreBuiltInRoutine);
  $("restoreDay").addEventListener("click", () => restoreRoutine("day"));
  $("restoreAll").addEventListener("click", () => restoreRoutine("all"));
  $("bannerLoadRoutine").addEventListener("click", () => restoreRoutine("all"));
  $("bannerDismiss").addEventListener("click", hideRoutineBanner);
  refs.planEditor.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-index]");
    if (btn) {
      db.plan[refs.planDay.value].splice(Number(btn.dataset.removeIndex), 1);
      renderPlanEditor();
    }
  });

  renderAll();
  maybeOfferRoutine();
  animateFrames();
  registerServiceWorker();

  if (pendingRoutineNotice) {
    pendingRoutineNotice = false;
    showToast("Weekly routine updated — stretching added.");
  } else if (pendingUnitNotice) {
    pendingUnitNotice = false;
    showToast("Loads converted from kg to lb.");
  }
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
  refs.studyHours.value = hours === null ? "" : hours;

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
  refs.plannedDayName.textContent = dayTitles[weekday]
    ? `${weekday} — ${dayTitles[weekday]}`
    : weekday;
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
      `<div class="empty-state">Nothing planned for ${escapeHtml(weekday)}. Edit your plan in the Library tab.</div>`;
    return;
  }

  const mobility = planned.filter((n) => typeFor(n) === "mobility");
  const main = planned.filter((n) => typeFor(n) !== "mobility");

  let html = "";
  if (main.length) {
    html += `<p class="group-label">Main${main.length > 1 ? " exercises" : ""}</p>`;
    html += main.map(plannedCard).join("");
  }
  if (mobility.length) {
    html += `<p class="group-label">Stretching &amp; mobility</p>`;
    html += mobility.map(plannedCard).join("");
  }
  refs.plannedList.innerHTML = html;

  function plannedCard(name) {
    const matches = entries.filter((e) => e.name === name);
    const isDone = matches.some((e) => e.done);
    const hasLog = matches.length > 0;
    const cue = cueFor(name);
    const isMobility = typeFor(name) === "mobility";
    return `
      <div class="card${isMobility ? " mobility-card" : ""}">
        <div class="plan-check-row">
          <div>
            <h3>${escapeHtml(name)}</h3>
            ${cue ? `<p class="cue">${escapeHtml(cue)}</p>` : ""}
            <div class="badge-row">
              ${isDone ? `<span class="badge done">Completed</span>`
                       : `<span class="badge planned">To do</span>`}
            </div>
            ${isMobility ? "" :
              `<button class="small-btn" type="button" data-log-exercise="${escapeHtml(name)}">Log details</button>`}
            ${!isMobility && hasLog && !isDone
              ? `<p class="muted">Logged, not marked done</p>` : ""}
          </div>
          <label>
            <input type="checkbox" class="planned-checkbox"
              ${isDone ? "checked" : ""} data-exercise="${escapeHtml(name)}"
              aria-label="Mark ${escapeHtml(name)} as done" />
          </label>
        </div>
      </div>`;
  }
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
    const planned = isPlanned(entry.name, selectedDate);
    const vol = totalVolume(entry);
    return `
      <div class="card">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(entry.name)}</h3>
            <p class="meta">${escapeHtml(setsSummary(entry))}</p>
            ${vol ? `<p class="meta">Volume: ${vol.toLocaleString()} ${UNIT}·reps</p>` : ""}
            ${entry.notes ? `<p class="muted">${escapeHtml(entry.notes)}</p>` : ""}
          </div>
        </div>
        <div class="badge-row">
          <span class="badge planned">${planned ? "Planned" : "Extra"}</span>
          ${entry.done ? `<span class="badge done">Done</span>` : `<span class="badge date">Recorded only</span>`}
        </div>
        ${exerciseImageHtml(entry.name, "exercise-gif")}
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
  const lib = getLibrary();
  const names = Object.keys(lib).sort();
  const groups = [
    ["Main exercises", names.filter((n) => lib[n].type === "main")],
    ["Stretching & mobility", names.filter((n) => lib[n].type === "mobility")],
    ["Other / previously used", names.filter((n) => lib[n].type === "legacy")]
  ];

  const options = groups.map(([label, items]) => {
    if (!items.length) return "";
    return `<optgroup label="${escapeHtml(label)}">` +
      items.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("") +
      `</optgroup>`;
  }).join("");

  const keepExercise = refs.exerciseSelect.value;
  const keepTrend = refs.trendExercise.value;
  refs.exerciseSelect.innerHTML = options;
  refs.trendExercise.innerHTML = options;
  if (keepExercise && lib[keepExercise]) refs.exerciseSelect.value = keepExercise;
  if (keepTrend && lib[keepTrend]) refs.trendExercise.value = keepTrend;
  updateGifPreview();
}

function updateGifPreview() {
  const name = refs.exerciseSelect.value;
  const html = exerciseImageHtml(name, "preview-img");
  if (html) {
    refs.gifPreviewContainer.innerHTML = html;
    return;
  }
  const cue = cueFor(name);
  refs.gifPreviewContainer.innerHTML =
    `<span class="muted">${cue ? escapeHtml(cue) + " — n" : "N"}o image yet.
      Add one in the Library tab.</span>`;
}

function addSetRow(load = "", reps = "") {
  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML = `
    <span class="set-num"></span>
    <input type="number" min="0" step="0.5" placeholder="lb" class="set-load" aria-label="Load in pounds" />
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
        <p class="meta">${d.workouts.length} exercise${d.workouts.length === 1 ? "" : "s"} logged · ${doneCount} done${vol ? ` · ${vol.toLocaleString()} ${UNIT}·reps` : ""}</p>
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

let pendingImport = null;

function importData(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const okVersion = parsed &&
        (parsed.version === 7 || parsed.version === DB_VERSION);
      if (!okVersion || typeof parsed.days !== "object") {
        showToast("That file is not a valid backup from this app.");
        return;
      }
      normaliseDB(parsed);
      let converted = false;
      if (parsed.version === 7) {
        convertLoadsKgToLb(parsed);   // older backup still in kilograms
        parsed.version = DB_VERSION;
        parsed.unit = UNIT;
        converted = true;
      }

      pendingImport = parsed;

      let workoutCount = 0, studyDays = 0;
      Object.keys(parsed.days).forEach((iso) => {
        const d = parsed.days[iso] || {};
        workoutCount += (d.workouts || []).length;
        if (typeof d.study === "number") studyDays++;
      });
      $("importSummary").textContent =
        `The file contains ${Object.keys(parsed.days).length} day(s): ` +
        `${workoutCount} workout entr${workoutCount === 1 ? "y" : "ies"} and ` +
        `${studyDays} day(s) of study hours. ` +
        `Merge keeps everything on this device and adds what's new from the file ` +
        `(this device's weekly plan is kept). Replace erases this device's data first.` +
        (converted ? " This backup was in kilograms and will be converted to pounds." : "");
      $("importChoice").hidden = false;
    } catch {
      showToast("Could not read that file as JSON.");
    }
  };
  reader.readAsText(file);
}

function clearPendingImport() {
  pendingImport = null;
  $("importChoice").hidden = true;
}

function applyImport(mode) {
  if (!pendingImport) return;

  if (mode === "replace") {
    db = pendingImport;
  } else {
    mergeIntoDB(pendingImport);
  }

  saveDB();
  clearPendingImport();
  cancelEdit();
  refreshExerciseDropdowns();
  renderAll();
  showToast(mode === "replace" ? "Backup imported (replaced everything)." : "Backup merged.");
}

/** Merge rules:
 *  - Days: union. Workout entries are added unless an entry with the same id
 *    already exists here (so re-importing the same backup never duplicates).
 *  - Study hours: taken from the file when this device has none for that day;
 *    if both devices logged the same day, the higher value is kept.
 *  - Exercise library: union; on a name clash this device's GIF path wins.
 *  - Weekly plan and study goal: this device's are kept. */
function mergeIntoDB(incoming) {
  db.library = { ...incoming.library, ...db.library };

  Object.keys(incoming.days).forEach((iso) => {
    if (!isValidISO(iso)) return;
    const inc = incoming.days[iso] || {};
    const local = getDay(iso);

    const existingIds = {};
    local.workouts.forEach((w) => { existingIds[w.id] = true; });
    (inc.workouts || []).forEach((w) => {
      if (w && w.name && !existingIds[w.id]) {
        local.workouts.push(clone(w));
      }
    });

    if (typeof inc.study === "number") {
      local.study = typeof local.study === "number"
        ? Math.max(local.study, inc.study)
        : inc.study;
    }
    pruneDay(iso);
  });
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
    values: values.map((v) => (v === null ? 0 : v)),
    known: values.map((v) => v !== null),
    goal: db.studyGoal,
    colorFor: (v, has) => !has ? "#334155" : v >= db.studyGoal ? "#22c55e" : "#0ea5e9",
    unit: "h"
  });
}

function renderWorkoutDashboard(dates) {
  const doneCounts = dates.map((iso) =>
    ((db.days[iso] || {}).workouts || []).filter((w) => w.done).length);
  const volumes = dates.map((iso) =>
    ((db.days[iso] || {}).workouts || []).reduce((s, w) => s + totalVolume(w), 0));

  const activeDays = doneCounts.filter((c) => c > 0).length;
  const totalDone = doneCounts.reduce((a, b) => a + b, 0);
  const totalVol = volumes.reduce((a, b) => a + b, 0);

  refs.workoutStats.innerHTML = `
    <div class="stat"><strong>${activeDays}/${dates.length}</strong><span>active days</span></div>
    <div class="stat"><strong>${totalDone}</strong><span>exercises done</span></div>
    <div class="stat"><strong>${totalVol >= 10000 ? (totalVol / 1000).toFixed(1) + "k" : totalVol.toLocaleString()}</strong><span>total ${UNIT}·reps</span></div>`;

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
    unit: " " + UNIT + "·reps"
  });
}

function renderTrendChart() {
  const name = refs.trendExercise.value;
  const dates = lastNDates(dashRange, todayISO());
  const points = [];

  dates.forEach((iso, i) => {
    const entries = ((db.days[iso] || {}).workouts || []).filter((w) => w.name === name);
    if (!entries.length) return;
    const max = Math.max(...entries.map(topLoad));
    if (max > 0) points.push({ i, iso, value: max });
  });

  refs.trendChart.innerHTML = points.length
    ? lineChart({ dates, points, unit: " " + UNIT })
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

  db.library[name] = { gif, cue: "", type: "main" };
  saveDB();
  refreshExerciseDropdowns();
  refs.exerciseSelect.value = name;
  updateGifPreview();
  refs.newExerciseForm.reset();
  renderLibrary();
  showToast(`"${name}" added to library.`);
}

function deleteCustomExercise(name) {
  const wasBuiltIn = Boolean(defaultLibrary[name]);
  delete db.library[name];
  saveDB();
  refreshExerciseDropdowns();
  renderLibrary();
  updateGifPreview();
  showToast(wasBuiltIn
    ? `"${name}" reset to its built-in setting.`
    : `"${name}" removed from library.`);
}

function renderLibrary() {
  const lib = getLibrary();
  const filter = (libraryFilter || "").trim().toLowerCase();
  const names = Object.keys(lib)
    .filter((n) => !filter || n.toLowerCase().indexOf(filter) !== -1)
    .filter((n) => !(showMissingOnly && (lib[n].gif || lib[n].fedb)))
    .sort();

  const missing = Object.keys(lib).filter((n) => !lib[n].gif && !lib[n].fedb).length;
  refs.libraryCount.textContent =
    `${Object.keys(lib).length} exercises · ${missing} still without an image`;

  if (!names.length) {
    refs.customList.innerHTML = `<div class="empty-state">No exercises match that filter.</div>`;
    return;
  }

  refs.customList.innerHTML = names.map((name) => {
    const entry = lib[name];
    return `
      <div class="card library-row">
        <div class="library-head">
          <div>
            <h3>${escapeHtml(name)}</h3>
            ${entry.cue ? `<p class="cue">${escapeHtml(entry.cue)}</p>` : ""}
          </div>
          <span class="badge ${entry.gif || entry.fedb ? "done" : "planned"}">${
            entry.gif ? "Custom GIF" : entry.fedb ? "Free Exercise DB" : "No image"
          }</span>
        </div>
        <div class="library-gif-row">
          <input type="text" class="library-gif-input" data-gif-for="${escapeHtml(name)}"
            value="${escapeHtml(entry.gif)}" placeholder="gifs/my-exercise.gif or https://..."
            aria-label="GIF path or URL for ${escapeHtml(name)}" />
          <button class="small-btn" type="button" data-save-gif="${escapeHtml(name)}">Save</button>
        </div>
        <div class="library-actions">
          <a class="small-btn find-gif" target="_blank" rel="noopener noreferrer"
            href="${escapeHtml(gifSearchUrl(name))}">Find a GIF</a>
          ${isCustom(name)
            ? `<button class="remove-btn" type="button" data-delete-exercise="${escapeHtml(name)}">Reset / remove</button>`
            : ""}
        </div>
      </div>`;
  }).join("");
}

/** Downloads the public-domain exercise index once and fills in an image for
 *  every exercise that still lacks one, by matching names. Only the resulting
 *  name -> id map is kept; the dataset itself is discarded. */
async function autoMatchImages() {
  const btn = refs.autoMatch;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Matching...";

  try {
    const res = await fetch(FEDB_JSON);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    const index = data
      .filter((ex) => ex && ex.images && ex.images.length)
      .map((ex) => ({ id: ex.id, images: ex.images.slice(0, 2), tokens: tokenise(ex.name) }));
    const lib = getLibrary();
    let matched = 0;

    Object.keys(lib).forEach((name) => {
      if (lib[name].fedb) return;
      const query = tokenise(FEDB_ALIASES[name] || name);
      const best = bestMatch(query, index);
      if (!best) return;
      const base = normaliseEntry(defaultLibrary[name]);
      db.library[name] = {
        gif: (db.library[name] && db.library[name].gif) || "",
        cue: (db.library[name] && db.library[name].cue) || base.cue,
        type: base.type || "main",
        fedb: best.id,
        frames: best.images
      };
      matched++;
    });

    saveDB();
    renderLibrary();
    renderLogged();
    updateGifPreview();
    showToast(matched
      ? `Matched ${matched} exercise${matched === 1 ? "" : "s"}.`
      : "Everything already has an image.");
  } catch (err) {
    showToast("Couldn't reach the image database — check your connection.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function tokenise(text) {
  return String(text).toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && t !== "the" && t !== "a" && t !== "and" && t !== "with");
}

/** Overlap score; requires a decent share of the query to be present. */
function bestMatch(query, index) {
  if (!query.length) return null;
  let best = null, bestScore = 0;
  index.forEach((item) => {
    let hits = 0;
    query.forEach((q) => {
      if (item.tokens.some((t) => t === q || t.indexOf(q) === 0 || q.indexOf(t) === 0)) hits++;
    });
    if (!hits) return;
    // favour matches that don't drag in lots of unrelated words
    const score = (hits / query.length) * 2 - (item.tokens.length - hits) * 0.06;
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return bestScore >= 1.0 ? best : null;
}

function saveGifFor(name) {
  const input = refs.customList.querySelector(`[data-gif-for="${cssEscape(name)}"]`);
  if (!input) return;
  const value = input.value.trim();
  const base = normaliseEntry(defaultLibrary[name]);

  if (!value && !defaultLibrary[name]) {
    showToast("Add a path or URL first.");
    return;
  }

  db.library[name] = {
    gif: value,
    cue: (db.library[name] && db.library[name].cue) || base.cue,
    type: base.type || "main"
  };
  saveDB();
  renderLibrary();
  updateGifPreview();
  renderLogged();
  showToast(value ? `GIF saved for ${name}.` : `GIF cleared for ${name}.`);
}

/** Minimal attribute-selector escaping for names with quotes or backslashes. */
function cssEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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

/** True when the saved plan predates the current built-in routine. */
function planLooksOutdated() {
  const lib = getLibrary();
  const hasMobility = DAYS.some((day) =>
    (db.plan[day] || []).some((n) => lib[n] && lib[n].type === "mobility"));
  return !hasMobility;
}

function restoreRoutine(scope) {
  if (scope === "day") {
    const day = refs.planDay.value;
    db.plan[day] = clone(defaultPlan[day] || []);
    saveDB();
    renderPlanEditor();
    renderPlanned();
    showToast(`${day} reset to the built-in routine.`);
    return;
  }
  DAYS.forEach((day) => { db.plan[day] = clone(defaultPlan[day] || []); });
  saveDB();
  renderPlanEditor();
  renderPlanned();
  hideRoutineBanner();
  showToast("Built-in routine loaded for all 7 days.");
}

function hideRoutineBanner() {
  refs.routineBanner.hidden = true;
}

function maybeOfferRoutine() {
  refs.routineBanner.hidden = !planLooksOutdated();
}

/** Puts the full built-in routine back, for a single day or the whole week. */
function restoreBuiltInRoutine() {
  const day = refs.planDay.value;
  db.plan[day] = clone(defaultPlan[day] || []);
  db.routine = ROUTINE_VERSION;
  saveDB();
  renderPlanEditor();
  renderPlanned();
  showToast(`${day} reset to the built-in routine.`);
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

try {
  init();
} catch (err) {
  // If startup fails, say so on screen instead of leaving a dead UI.
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;top:10px;left:10px;right:10px;z-index:99;" +
    "background:#7f1d1d;color:#fff;padding:12px;border-radius:12px;font:14px sans-serif";
  box.textContent = "The app failed to start: " + (err && err.message ? err.message : err) +
    " — make sure index.html, style.css and script.js are all from the same version, then hard-refresh (Ctrl+Shift+R).";
  document.body.appendChild(box);
  console.error(err);
}
