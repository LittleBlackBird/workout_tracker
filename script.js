const STORAGE = "workoutV6";
const CUSTOM_EXERCISES_STORAGE = "workoutCustomExercisesV6";
const PLAN_STORAGE = "workoutPlanV6";

const weeks = Array.from({ length: 8 }, (_, i) => `Week ${i + 1}`);
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultPlan = {
  Monday: [
    "Lat Pulldown",
    "Row",
    "Barbell Curl",
    "Hammer Curl",
    "Farmer Walk",
    "Dead Hang"
  ],
  Tuesday: [
    "Bench Press",
    "Incline Bench",
    "Tricep Skullcrusher",
    "Tricep Pushdown",
    "Dips"
  ],
  Wednesday: [
    "Walk"
  ],
  Thursday: [
    "Lateral Raise",
    "Shoulder Press",
    "Alternating Curl",
    "Tricep Pushdown",
    "Reverse Curl"
  ],
  Friday: [
    "Run"
  ],
  Saturday: [
    "Hike"
  ],
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

let customLibrary = loadCustomExercises();
let plan = loadPlan();
let data = loadData();
let editingId = null;

const weekEl = document.getElementById("week");
const dayEl = document.getElementById("day");
const exerciseSelect = document.getElementById("exerciseSelect");
const setsEl = document.getElementById("sets");
const loadEl = document.getElementById("load");
const repsEl = document.getElementById("reps");
const notesEl = document.getElementById("notes");
const doneCheckbox = document.getElementById("doneCheckbox");
const completedDateEl = document.getElementById("completedDate");
const form = document.getElementById("form");
const list = document.getElementById("list");
const previous = document.getElementById("previous");
const plannedList = document.getElementById("plannedList");
const todayDate = document.getElementById("todayDate");
const loadPlanBtn = document.getElementById("loadPlanBtn");
const resetBtn = document.getElementById("reset");
const newExerciseForm = document.getElementById("newExerciseForm");
const newExerciseName = document.getElementById("newExerciseName");
const newExerciseGif = document.getElementById("newExerciseGif");
const gifPreviewContainer = document.getElementById("gifPreviewContainer");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

const planDayEl = document.getElementById("planDay");
const planEditor = document.getElementById("planEditor");
const addPlanExerciseBtn = document.getElementById("addPlanExercise");
const savePlanBtn = document.getElementById("savePlan");

init();

function init() {
  renderTodayDate();
  setDefaultCompletedDate();

  weeks.forEach((week) => {
    weekEl.innerHTML += `<option value="${week}">${week}</option>`;
  });

  days.forEach((day) => {
    dayEl.innerHTML += `<option value="${day}">${day}</option>`;
    planDayEl.innerHTML += `<option value="${day}">${day}</option>`;
  });

  refreshExerciseDropdown();

  form.addEventListener("submit", handleSubmit);
  weekEl.addEventListener("change", handleSelectionChange);
  dayEl.addEventListener("change", handleSelectionChange);
  loadPlanBtn.addEventListener("click", loadPlannedExercisesIntoDay);
  resetBtn.addEventListener("click", resetAll);
  newExerciseForm.addEventListener("submit", handleNewExercise);
  exerciseSelect.addEventListener("change", updateGifPreview);

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  planDayEl.addEventListener("change", renderPlanEditor);
  addPlanExerciseBtn.addEventListener("click", addPlanExerciseRow);
  savePlanBtn.addEventListener("click", saveEditedPlan);

  handleSelectionChange();
  updateGifPreview();
  renderPlanEditor();
  switchTab("tab-plan");
}

function switchTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function renderTodayDate() {
  todayDate.textContent = new Date().toLocaleDateString("en-CA");
}

function setDefaultCompletedDate() {
  completedDateEl.value = new Date().toLocaleDateString("en-CA");
}

function getLibrary() {
  return { ...defaultLibrary, ...customLibrary };
}

function refreshExerciseDropdown() {
  const library = getLibrary();
  exerciseSelect.innerHTML = "";

  Object.keys(library)
    .sort()
    .forEach((exercise) => {
      exerciseSelect.innerHTML += `<option value="${exercise}">${exercise}</option>`;
    });
}

function updateGifPreview() {
  const library = getLibrary();
  const selectedExercise = exerciseSelect.value;
  const gif = library[selectedExercise];

  if (!gif) {
    gifPreviewContainer.innerHTML = `<span class="muted">No GIF selected</span>`;
    return;
  }

  gifPreviewContainer.innerHTML = `
    <img src="${gif}" alt="${selectedExercise}" onerror="this.parentElement.innerHTML='<span class=&quot;muted&quot;>GIF not found</span>'" />
  `;
}

function loadData() {
  const saved = localStorage.getItem(STORAGE);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveData() {
  localStorage.setItem(STORAGE, JSON.stringify(data));
}

function loadCustomExercises() {
  const saved = localStorage.getItem(CUSTOM_EXERCISES_STORAGE);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveCustomExercises() {
  localStorage.setItem(CUSTOM_EXERCISES_STORAGE, JSON.stringify(customLibrary));
}

function loadPlan() {
  const saved = localStorage.getItem(PLAN_STORAGE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.setItem(PLAN_STORAGE, JSON.stringify(defaultPlan));
      return structuredCloneSafe(defaultPlan);
    }
  }

  localStorage.setItem(PLAN_STORAGE, JSON.stringify(defaultPlan));
  return structuredCloneSafe(defaultPlan);
}

function savePlan() {
  localStorage.setItem(PLAN_STORAGE, JSON.stringify(plan));
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function currentKey() {
  return `${weekEl.value}-${dayEl.value}`;
}

function currentWeekNumber() {
  return Number(weekEl.value.split(" ")[1]);
}

function currentEntryList() {
  if (!data[currentKey()]) {
    data[currentKey()] = [];
  }
  return data[currentKey()];
}

function handleSelectionChange() {
  renderPlannedExercises();
  renderCompletedExercises();
  renderPreviousWeek();
}

function handleNewExercise(event) {
  event.preventDefault();

  const name = newExerciseName.value.trim();
  const gif = newExerciseGif.value.trim();

  if (!name) {
    alert("Please enter an exercise name.");
    return;
  }

  const library = getLibrary();
  if (library[name]) {
    alert("This exercise already exists.");
    return;
  }

  customLibrary[name] = gif;
  saveCustomExercises();
  refreshExerciseDropdown();

  exerciseSelect.value = name;
  updateGifPreview();

  newExerciseForm.reset();
  switchTab("tab-plan");
}

function handleSubmit(event) {
  event.preventDefault();

  const library = getLibrary();

  const entry = {
    id: editingId || Date.now(),
    name: exerciseSelect.value,
    sets: Number(setsEl.value) || 0,
    load: Number(loadEl.value) || 0,
    reps: Number(repsEl.value) || 0,
    notes: notesEl.value.trim(),
    gif: library[exerciseSelect.value] || "",
    done: doneCheckbox.checked,
    completedDate: completedDateEl.value || new Date().toLocaleDateString("en-CA"),
    planned: isExercisePlannedForDay(exerciseSelect.value, dayEl.value)
  };

  if (!entry.name) {
    alert("Please select an exercise.");
    return;
  }

  if (editingId) {
    const list = currentEntryList();
    const index = list.findIndex((item) => item.id === editingId);
    if (index !== -1) {
      list[index] = entry;
    }
    editingId = null;
  } else {
    currentEntryList().push(entry);
  }

  saveData();
  form.reset();
  setDefaultCompletedDate();
  doneCheckbox.checked = true;
  updateGifPreview();
  renderPlannedExercises();
  renderCompletedExercises();
  renderPreviousWeek();
  switchTab("tab-history");
}

function isExercisePlannedForDay(exerciseName, day) {
  return (plan[day] || []).includes(exerciseName);
}

function renderPlannedExercises() {
  plannedList.innerHTML = "";

  const plannedExercises = plan[dayEl.value] || [];
  const entries = currentEntryList();

  if (!plannedExercises.length) {
    plannedList.innerHTML = `
      <div class="empty-state">
        No planned exercises for ${dayEl.value}.
      </div>
    `;
    return;
  }

  plannedExercises.forEach((exerciseName) => {
    const existingEntry = entries.find((item) => item.name === exerciseName);
    const isDone = existingEntry ? existingEntry.done : false;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="plan-check-row">
        <div>
          <h3>${exerciseName}</h3>
          <div class="badge-row">
            <span class="badge planned">Planned</span>
            ${isDone ? `<span class="badge done">Completed</span>` : ""}
          </div>
          ${
            isDone
              ? `<p class="muted">Done on ${existingEntry.completedDate || "today"}</p>`
              : `<p class="muted">Not completed yet</p>`
          }
        </div>
        <label>
          <input 
            type="checkbox" 
            ${isDone ? "checked" : ""} 
            data-exercise="${escapeAttribute(exerciseName)}"
            class="planned-checkbox"
          />
        </label>
      </div>
    `;

    plannedList.appendChild(card);
  });

  attachPlannedCheckboxEvents();
}

function attachPlannedCheckboxEvents() {
  const checkboxes = document.querySelectorAll(".planned-checkbox");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const exerciseName = checkbox.dataset.exercise;
      togglePlannedExercise(exerciseName, checkbox.checked);
    });
  });
}

function togglePlannedExercise(exerciseName, isChecked) {
  const entries = currentEntryList();
  const library = getLibrary();

  let entry = entries.find((item) => item.name === exerciseName);

  if (entry) {
    entry.done = isChecked;
    entry.completedDate = isChecked ? new Date().toLocaleDateString("en-CA") : "";
  } else if (isChecked) {
    entry = {
      id: Date.now(),
      name: exerciseName,
      sets: 0,
      load: 0,
      reps: 0,
      notes: "",
      gif: library[exerciseName] || "",
      done: true,
      completedDate: new Date().toLocaleDateString("en-CA"),
      planned: true
    };

    entries.push(entry);
  }

  saveData();
  renderPlannedExercises();
  renderCompletedExercises();
  renderPreviousWeek();
}

function renderCompletedExercises() {
  list.innerHTML = "";
  const entries = currentEntryList();

  if (!entries.length) {
    list.innerHTML = `<div class="empty-state">No completed or recorded exercises for ${weekEl.value} on ${dayEl.value}.</div>`;
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "card";

    const gifHtml = entry.gif
      ? `<img class="exercise-gif" src="${entry.gif}" alt="${escapeAttribute(entry.name)}" onerror="this.style.display='none'" />`
      : "";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${entry.name}</h3>
          <p class="meta">${entry.sets} sets • ${entry.reps} reps • ${entry.load} kg</p>
          ${entry.notes ? `<p class="muted">${entry.notes}</p>` : ""}
        </div>
      </div>

      <div class="badge-row">
        ${entry.planned ? `<span class="badge planned">Planned</span>` : `<span class="badge planned">Extra</span>`}
        ${entry.done ? `<span class="badge done">Done</span>` : `<span class="badge planned">Recorded only</span>`}
        <span class="badge date">${entry.completedDate || "No date"}</span>
      </div>

      ${entry.done ? `<div class="completed-line"><span class="tick"></span><span>Completed workout recorded</span></div>` : ""}

      ${gifHtml}

      <div class="card-actions">
        <button class="small-btn" onclick="editEntry(${entry.id})">Edit</button>
        <button class="small-btn" onclick="duplicateEntry(${entry.id})">Duplicate</button>
        <button class="danger-btn" onclick="deleteEntry(${entry.id})">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });
}

function renderPreviousWeek() {
  previous.innerHTML = "";
  const currentWeek = currentWeekNumber();

  if (currentWeek === 1) {
    previous.innerHTML = `<div class="empty-state">No previous week available yet.</div>`;
    return;
  }

  const prevKey = `Week ${currentWeek - 1}-${dayEl.value}`;
  const prevEntries = data[prevKey] || [];

  if (!prevEntries.length) {
    previous.innerHTML = `<div class="empty-state">No records found for the previous week.</div>`;
    return;
  }

  prevEntries.forEach((entry) => {
    const block = document.createElement("div");
    block.className = "card";
    block.innerHTML = `
      <h3>${entry.name}</h3>
      <p class="meta">${entry.sets} sets • ${entry.reps} reps • ${entry.load} kg</p>
      <p class="muted">${entry.completedDate || "No completion date"}</p>
    `;
    previous.appendChild(block);
  });
}

function loadPlannedExercisesIntoDay() {
  const selectedDayPlan = plan[dayEl.value] || [];
  if (!selectedDayPlan.length) {
    alert(`There are no planned exercises for ${dayEl.value}.`);
    return;
  }

  const entries = currentEntryList();
  const library = getLibrary();

  selectedDayPlan.forEach((exerciseName) => {
    const alreadyExists = entries.some((item) => item.name === exerciseName);
    if (!alreadyExists) {
      entries.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        name: exerciseName,
        sets: 0,
        load: 0,
        reps: 0,
        notes: "",
        gif: library[exerciseName] || "",
        done: false,
        completedDate: "",
        planned: true
      });
    }
  });

  saveData();
  renderPlannedExercises();
  renderCompletedExercises();
}

function editEntry(id) {
  const entry = currentEntryList().find((item) => item.id === id);
  if (!entry) return;

  exerciseSelect.value = entry.name;
  setsEl.value = entry.sets;
  loadEl.value = entry.load;
  repsEl.value = entry.reps;
  notesEl.value = entry.notes;
  doneCheckbox.checked = entry.done;
  completedDateEl.value = entry.completedDate || new Date().toLocaleDateString("en-CA");
  editingId = id;
  updateGifPreview();
  switchTab("tab-plan");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateEntry(id) {
  const entry = currentEntryList().find((item) => item.id === id);
  if (!entry) return;

  currentEntryList().push({
    ...entry,
    id: Date.now()
  });

  saveData();
  renderCompletedExercises();
  renderPlannedExercises();
}

function deleteEntry(id) {
  data[currentKey()] = currentEntryList().filter((item) => item.id !== id);
  saveData();
  renderCompletedExercises();
  renderPlannedExercises();
  renderPreviousWeek();
}

function renderPlanEditor() {
  const day = planDayEl.value;
  planEditor.innerHTML = "";

  const exercises = plan[day] || [];

  if (!exercises.length) {
    planEditor.innerHTML = `
      <div class="empty-state">No exercises planned for ${day} yet.</div>
    `;
    return;
  }

  exercises.forEach((exercise, index) => {
    const row = document.createElement("div");
    row.className = "plan-editor-row";

    row.innerHTML = `
      <input type="text" value="${escapeAttribute(exercise)}" data-index="${index}" class="plan-editor-input" />
      <button type="button" class="remove-btn" data-remove-index="${index}">Remove</button>
    `;

    planEditor.appendChild(row);
  });

  const removeButtons = planEditor.querySelectorAll("[data-remove-index]");
  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeIndex);
      removePlanExercise(index);
    });
  });
}

function addPlanExerciseRow() {
  const day = planDayEl.value;
  if (!plan[day]) plan[day] = [];
  plan[day].push("New Exercise");
  renderPlanEditor();
}

function removePlanExercise(index) {
  const day = planDayEl.value;
  plan[day].splice(index, 1);
  renderPlanEditor();
}

function saveEditedPlan() {
  const day = planDayEl.value;
  const inputs = planEditor.querySelectorAll(".plan-editor-input");

  plan[day] = Array.from(inputs)
    .map((input) => input.value.trim())
    .filter((value) => value !== "");

  savePlan();
  renderPlanEditor();
  renderPlannedExercises();
  alert("Plan updated.");
}

function resetAll() {
  if (!confirm("Are you sure you want to delete all workout data?")) return;

  localStorage.removeItem(STORAGE);
  localStorage.removeItem(CUSTOM_EXERCISES_STORAGE);
  localStorage.removeItem(PLAN_STORAGE);

  data = {};
  customLibrary = {};
  plan = structuredCloneSafe(defaultPlan);
  editingId = null;

  form.reset();
  newExerciseForm.reset();
  refreshExerciseDropdown();
  setDefaultCompletedDate();
  doneCheckbox.checked = true;
  updateGifPreview();
  renderPlanEditor();
  renderPlannedExercises();
  renderCompletedExercises();
  renderPreviousWeek();
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

window.editEntry = editEntry;
window.duplicateEntry = duplicateEntry;
window.deleteEntry = deleteEntry;