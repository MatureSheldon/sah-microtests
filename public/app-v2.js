// =================================================================
// SAH Microtests — Zero-server PWA (no Node.js required)
// Data:   Google Sheets (primary) → IndexedDB session cache
// Export: JSZip in-browser → browser download API
// Log:    IndexedDB (syncs to Sheets when online)
// =================================================================

// ─────────── STATE ───────────────────────────────────────────────
const state = {
  bank: null,
  selectedQuestions: [],
  lockedIds: new Set(),
  questionToFlag: null
};

// ─────────── INDEXEDDB HELPERS ───────────────────────────────────
const DB_NAME = "sah-microtests";
const DB_VERSION = 1;
let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      // Key-value cache (bank snapshot, etc.)
      if (!d.objectStoreNames.contains("cache")) d.createObjectStore("cache");
      // Log store keyed by microtestId
      if (!d.objectStoreNames.contains("log")) {
        d.createObjectStore("log", { keyPath: "microtestId" });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, key) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, key, value) {
  // For "cache" store — manual key
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function dbPutKeyed(store, value) {
  // For "log" store — uses keyPath ("microtestId")
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

// ─────────── SETTINGS (localStorage) ─────────────────────────────
function getSheetsUrl() {
  return localStorage.getItem("sah-sheets-url") || "";
}

function setSheetsUrl(url) {
  if (url && url.trim()) localStorage.setItem("sah-sheets-url", url.trim());
  else localStorage.removeItem("sah-sheets-url");
}

function getSheetsPasscode() {
  return localStorage.getItem("sah-sheets-passcode") || "";
}

function setSheetsPasscode(passcode) {
  if (passcode && passcode.trim()) localStorage.setItem("sah-sheets-passcode", passcode.trim());
  else localStorage.removeItem("sah-sheets-passcode");
}

// ─────────── DOM ELEMENTS ─────────────────────────────────────────
const els = {
  activeDatasetPill: document.querySelector("#activeDatasetPill"),
  bankCount: document.querySelector("#bankCount"),
  refreshBank: document.querySelector("#refreshBank"),
  classSelect: document.querySelector("#classSelect"),
  subjectSelect: document.querySelector("#subjectSelect"),
  datasetHint: document.querySelector("#datasetHint"),
  connectionHint: document.querySelector("#connectionHint"),
  chapterRows: document.querySelector("#chapterRows"),
  chapterSplitBar: document.querySelector("#chapterSplitBar"),
  chapterHint: document.querySelector("#chapterHint"),
  pctRemaining: document.querySelector("#pctRemaining"),
  addChapter: document.querySelector("#addChapter"),
  typeFilters: document.querySelector("#typeFilters"),
  generate: document.querySelector("#generate"),
  clearLocks: document.querySelector("#clearLocks"),
  questions: document.querySelector("#questions"),
  summary: document.querySelector("#summary"),
  paperMeta: document.querySelector("#paperMeta"),
  exportDocx: document.querySelector("#exportDocx"),
  downloadLink: document.querySelector("#downloadLink"),
  refreshLog: document.querySelector("#refreshLog"),
  showDemos: document.querySelector("#showDemos"),
  logList: document.querySelector("#logList"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsModal: document.querySelector("#settingsModal"),
  sheetsUrlInput: document.querySelector("#sheetsUrlInput"),
  sheetsPasscodeInput: document.querySelector("#sheetsPasscodeInput"),
  saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
  cancelSettingsBtn: document.querySelector("#cancelSettingsBtn"),
  microtestNumber: document.querySelector("#microtestNumber"),
  demoMode: document.querySelector("#demoMode"),
  flagModal: document.querySelector("#flagModal"),
  flagQuestionSnippet: document.querySelector("#flagQuestionSnippet"),
  flagNoteInput: document.querySelector("#flagNoteInput"),
  confirmFlagBtn: document.querySelector("#confirmFlagBtn"),
  cancelFlagBtn: document.querySelector("#cancelFlagBtn"),
  cancelFlagBtnSecondary: document.querySelector("#cancelFlagBtnSecondary"),
  topicModal: document.querySelector("#topicModal"),
  topicModalName: document.querySelector("#topicModalTitle"),
  topicTypeGrid: document.querySelector("#topicTypeGrid"),
  topicSwapBtn: document.querySelector("#topicSwapBtn"),
  topicAddBtn: document.querySelector("#topicAddBtn"),
  closeTopicModalBtn: document.querySelector("#closeTopicModalBtn"),
  emptyState: document.querySelector("#emptyState"),
  exportActionContainer: document.querySelector("#exportActionContainer")
};

// ─────────── UTILITIES ───────────────────────────────────────────
function value(id) { return document.querySelector(`#${id}`).value; }
function numberValue(id) { return Number(value(id) || 0); }

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function unique(items) { return [...new Set(items)]; }

function transitionState(updateFn) {
  if (document.startViewTransition) {
    document.startViewTransition(updateFn);
  } else {
    updateFn();
  }
}

// ─────────── DATASET HELPERS ─────────────────────────────────────
function currentClassLevel() { return els.classSelect.value; }
function currentSubject() { return els.subjectSelect.value; }

function subjectCode(subject) {
  return String(subject || "")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

function subjectsMatch(s1, s2) {
  const norm = (s) => String(s || "").toLowerCase().trim().replace(/maths|mathematics/, "math");
  return norm(s1) === norm(s2);
}

function questionsForCurrentDataset() {
  if (!state.bank) return [];
  return (state.bank.questions || []).filter(
    (q) => q.classLevel === currentClassLevel() && subjectsMatch(q.subject, currentSubject())
  );
}

function chaptersForCurrentDataset() {
  if (!state.bank) return [];
  const map = new Map();
  for (const ch of state.bank.chapters || []) {
    if (ch.classLevel !== currentClassLevel() || !subjectsMatch(ch.subject, currentSubject())) continue;
    map.set(ch.chapterNumber, { chapterNumber: ch.chapterNumber, chapterName: ch.chapterName });
  }
  for (const q of questionsForCurrentDataset()) {
    if (!map.has(q.chapterNumber))
      map.set(q.chapterNumber, { chapterNumber: q.chapterNumber, chapterName: q.chapterName });
  }
  return [...map.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function hasCurrentDataset() { return questionsForCurrentDataset().length > 0; }

// ─────────── CHAPTER PLAN ────────────────────────────────────────
function getChapterPlan() {
  const chapters = chaptersForCurrentDataset();
  const rawPlan = [...document.querySelectorAll(".chapter-row")]
    .map((row) => {
      const rawValue = row.querySelector(".chapter-select").value;
      if (!rawValue) return null;
      const chapterNumber = Number(rawValue);
      const chapter = chapters.find((c) => Number(c.chapterNumber) === chapterNumber);
      return {
        chapterNumber,
        chapterName: chapter ? chapter.chapterName : `Chapter ${chapterNumber}`,
        rawWeight: Number(row.querySelector(".chapter-pct").value || 0)
      };
    })
    .filter((item) => item !== null && item.chapterNumber > 0 && item.rawWeight > 0);

  const totalRawWeight = rawPlan.reduce((s, i) => s + i.rawWeight, 0);
  if (totalRawWeight === 0) return [];

  // Apportion to multiples of 5 summing to 100% (20 steps of 5%)
  const totalSteps = 20;
  rawPlan.forEach(item => {
    item.exactSteps = (item.rawWeight / totalRawWeight) * totalSteps;
    item.baseSteps = Math.floor(item.exactSteps);
    item.remainder = item.exactSteps - item.baseSteps;
  });

  let assignedSteps = rawPlan.reduce((s, i) => s + i.baseSteps, 0);
  const sortedByRem = [...rawPlan].sort((a, b) => b.remainder - a.remainder);
  
  let i = 0;
  while (assignedSteps < totalSteps && i < sortedByRem.length) {
    sortedByRem[i].baseSteps++;
    assignedSteps++;
    i++;
  }

  return rawPlan.map(item => ({
    chapterNumber: item.chapterNumber,
    chapterName: item.chapterName,
    percentage: item.baseSteps * 5
  }));
}

function getDifficultyMix() {
  return { Easy: numberValue("easyPct"), Medium: numberValue("mediumPct"), Hard: numberValue("hardPct") };
}

function getSelectedTypes() {
  return [...document.querySelectorAll("[data-type-filter]:checked")].map((input) => input.value);
}

function getAvailableQuestions() {
  const types = getSelectedTypes();
  return questionsForCurrentDataset().filter((q) => q.useInPapers === "Yes" && types.includes(q.questionType));
}

// ─────────── CHAPTER ROWS ────────────────────────────────────────
function renderChapterOptions(select, selected) {
  const chapters = chaptersForCurrentDataset();
  const placeholder = select.querySelector('option[value=""]');
  select.innerHTML = "";
  if (placeholder) select.appendChild(placeholder);
  chapters.forEach((ch) => {
    const opt = document.createElement("option");
    opt.value = ch.chapterNumber;
    opt.textContent = `${ch.chapterNumber}. ${ch.chapterName}`;
    select.appendChild(opt);
  });
  if (selected != null && chapters.some((c) => Number(c.chapterNumber) === Number(selected))) {
    select.value = String(selected);
  }
}

function addChapterRow(selected, pct) {
  const template = document.querySelector("#chapterRowTemplate");
  const row = template.content.firstElementChild.cloneNode(true);
  renderChapterOptions(row.querySelector(".chapter-select"), selected ?? null);
  const inputEl = row.querySelector(".chapter-pct");
  inputEl.value = pct ?? 10;

  row.querySelector(".remove-chapter").addEventListener("click", () => {
    row.remove();
    distributeChaptersEqually();
  });
  row.addEventListener("input", validateMix);
  row.addEventListener("change", validateMix);
  els.chapterRows.appendChild(row);
  validateMix();
}

function renderTypeFilters() {
  const types = unique(questionsForCurrentDataset().map((q) => q.questionType)).sort();
  els.typeFilters.innerHTML = types.length
    ? types.map((t) => `<label class="check"><input data-type-filter type="checkbox" value="${t}" checked /> ${t}</label>`).join("")
    : '<p class="hint warn">No question types available for this dataset yet.</p>';
}

function distributeChaptersEqually() {
  const rows = [...document.querySelectorAll(".chapter-row")];
  if (!rows.length) return;
  const base = Math.floor(100 / rows.length);
  const rem = 100 - base * rows.length;
  rows.forEach((row, i) => {
    const inp = row.querySelector(".chapter-pct");
    if (inp) inp.value = base + (i < rem ? 1 : 0);
  });
  validateMix();
}

// ─────────── SPLIT BAR ───────────────────────────────────────────
const barColors = ["bg-indigo-400/60", "bg-emerald-400/60", "bg-amber-400/60", "bg-rose-400/60", "bg-cyan-400/60", "bg-violet-400/60"];

function renderSplitBar() {
  const bar = els.chapterSplitBar;
  if (!bar) return;
  const plan = getChapterPlan();
  const totalWeight = plan.reduce((s, i) => s + i.percentage, 0);
  
  bar.innerHTML = "";
  if (!plan.length || totalWeight === 0) { bar.style.display = "none"; return; }
  
  bar.style.display = "flex";
  bar.classList.remove("hidden");
  plan.forEach((item, i) => {
    const normalizedPct = (item.percentage / totalWeight) * 100;
    const seg = document.createElement("div");
    seg.className = `h-full transition-all duration-500 ${barColors[i % barColors.length]}`;
    seg.style.width = normalizedPct + "%";
    seg.title = `Ch ${item.chapterNumber}: ${Math.round(normalizedPct)}%`;
    bar.appendChild(seg);
  });
}

// ─────────── VALIDATION ──────────────────────────────────────────
function validateMix() {
  const plan = getChapterPlan();
  const chapterSum = plan.reduce((s, i) => s + i.percentage, 0);
  const diff = getDifficultyMix();
  const diffSum = diff.Easy + diff.Medium + diff.Hard;
  const msgs = [];
  if (!hasCurrentDataset()) msgs.push("No question bank for this class and subject yet.");
  if (chapterSum === 0) msgs.push("Set at least one chapter weight.");
  if (diffSum === 0) msgs.push("Set at least one difficulty weight.");
  
  els.chapterHint.textContent = msgs.length ? msgs.join(" ") : "✓ Blueprint ready.";
  els.chapterHint.classList.toggle("warn", msgs.length > 0);
  els.chapterHint.classList.toggle("ready", msgs.length === 0);
  renderSplitBar();
  
  // Remove the old strict pctRemaining logic completely as it's no longer needed for weights
  if (els.pctRemaining) {
    els.pctRemaining.style.display = "none";
  }
  return msgs.length === 0;
}

// ─────────── PAPER GENERATION ────────────────────────────────────
function targetMarks(total, pct) { return Math.max(1, Math.round((total * pct) / 100)); }

function scoreCandidate(q, selected, chapterTarget, diffTargets) {
  const chMrks = selected.filter((i) => i.chapterNumber === q.chapterNumber).reduce((s, i) => s + i.marks, 0);
  const dfMrks = selected.filter((i) => i.difficulty === q.difficulty).reduce((s, i) => s + i.marks, 0);
  return Math.max(0, chapterTarget - chMrks) * 3 +
    Math.max(0, (diffTargets[q.difficulty] || 0) - dfMrks) * 2 -
    q.marks - Number(q.timesAsked || 0);
}

function generatePaper() {
  if (!hasCurrentDataset()) { alert("This dataset has no questions yet."); return; }
  if (!validateMix()) { alert("Please set at least one chapter weight and difficulty weight."); return; }
  
  const totalMarks = numberValue("totalMarks");
  const plan = getChapterPlan();
  const chapterWeightSum = plan.reduce((s, i) => s + i.percentage, 0);
  
  const diff = getDifficultyMix();
  const diffWeightSum = diff.Easy + diff.Medium + diff.Hard;
  
  const diffTargets = {
    Easy: targetMarks(totalMarks, (diff.Easy / diffWeightSum) * 100 || 0),
    Medium: targetMarks(totalMarks, (diff.Medium / diffWeightSum) * 100 || 0),
    Hard: targetMarks(totalMarks, (diff.Hard / diffWeightSum) * 100 || 0)
  };
  
  const available = getAvailableQuestions();
  const locked = state.selectedQuestions.filter((q) => state.lockedIds.has(q.id));
  const selected = [...locked];
  const used = new Set(selected.map((q) => q.id));

  for (const p of plan) {
    const chTarget = targetMarks(totalMarks, (p.percentage / chapterWeightSum) * 100 || 0);
    let chMrks = selected.filter((q) => q.chapterNumber === p.chapterNumber).reduce((s, q) => s + q.marks, 0);
    const pool = shuffle(available.filter((q) => q.chapterNumber === p.chapterNumber && !used.has(q.id)));
    while (chMrks < chTarget && selected.reduce((s, q) => s + q.marks, 0) < totalMarks) {
      const rem = totalMarks - selected.reduce((s, q) => s + q.marks, 0);
      const candidates = pool
        .filter((q) => !used.has(q.id) && q.marks <= rem)
        .sort((a, b) => scoreCandidate(b, selected, chTarget, diffTargets) - scoreCandidate(a, selected, chTarget, diffTargets));
      if (!candidates.length) break;
      const next = candidates[0];
      selected.push(next); used.add(next.id); chMrks += next.marks;
    }
  }
  // Fill any remaining marks gap from any chapter in plan
  const remPool = shuffle(available.filter((q) => plan.some((p) => p.chapterNumber === q.chapterNumber) && !used.has(q.id)));
  for (const q of remPool) {
    const mrks = selected.reduce((s, i) => s + i.marks, 0);
    if (mrks >= totalMarks) break;
    if (q.marks <= totalMarks - mrks) { selected.push(q); used.add(q.id); }
  }

  const typeOrder = ["MCQ", "Assertion-Reason", "Very Short Answer", "Short Answer", "Long Answer", "Case/Source-Based"];
  state.selectedQuestions = selected.sort(
    (a, b) => typeOrder.indexOf(a.questionType) - typeOrder.indexOf(b.questionType) || a.chapterNumber - b.chapterNumber
  );
  transitionState(() => renderPreview());
}

function replaceQuestion(id) {
  const old = state.selectedQuestions.find((q) => q.id === id);
  if (!old || state.lockedIds.has(id)) return;
  const used = new Set(state.selectedQuestions.map((q) => q.id));
  const pool = getAvailableQuestions().filter((q) => !used.has(q.id) && q.chapterNumber === old.chapterNumber);
  const best =
    pool.find((q) => q.difficulty === old.difficulty && q.questionType === old.questionType && q.marks === old.marks) ||
    pool.find((q) => q.difficulty === old.difficulty && q.marks === old.marks) ||
    pool.find((q) => q.marks === old.marks) ||
    pool[0];
  if (!best) { alert("No replacement available for this chapter."); return; }
  state.selectedQuestions = state.selectedQuestions.map((q) => (q.id === id ? best : q));
  
  transitionState(() => {
    renderPreview();
    const newEl = els.questions.querySelector(`[data-id="${best.id}"]`);
    if (newEl) {
      newEl.classList.add("just-swapped");
      setTimeout(() => newEl.classList.remove("just-swapped"), 500);
    }
  });
}

function toggleLock(id) {
  if (state.lockedIds.has(id)) state.lockedIds.delete(id);
  else state.lockedIds.add(id);
  transitionState(() => renderPreview());
}

let topicModalState = { sourceQuestionId: null, topicName: null };

function openTopicModal(sourceId) {
  const q = state.selectedQuestions.find(x => x.id === sourceId);
  if (!q) return;
  topicModalState = { sourceQuestionId: q.id, topicName: q.topic };
  
  els.topicModalName.textContent = q.topic;
  
  const used = new Set(state.selectedQuestions.map(x => x.id));
  const pool = getAvailableQuestions().filter(x => !used.has(x.id) && x.topic === q.topic);
  
  const typeCounts = pool.reduce((acc, x) => {
    acc[x.questionType] = (acc[x.questionType] || 0) + 1;
    return acc;
  }, {});
  
  const types = Object.keys(typeCounts);
  topicModalState.selectedType = null;
  
  if (types.length === 0) {
    els.topicTypeGrid.innerHTML = `<div class="col-span-2 text-center text-[12px] text-slate-500 py-4">No additional questions available for this topic.</div>`;
    els.topicSwapBtn.disabled = true;
    els.topicAddBtn.disabled = true;
  } else {
    els.topicTypeGrid.innerHTML = types.map(t => {
      const count = typeCounts[t];
      return `<button type="button" class="topic-tile text-left p-3 border border-slate-200 rounded-lg hover:border-indigo-400 focus:outline-none transition-colors" data-type="${t}">
        <div class="text-[13px] font-semibold text-slate-800">${t}</div>
        <div class="text-[11px] font-medium text-slate-500 mt-0.5">${count} available</div>
      </button>`;
    }).join("");
    
    const tiles = els.topicTypeGrid.querySelectorAll(".topic-tile");
    tiles.forEach(tile => {
      tile.addEventListener("click", () => {
        tiles.forEach(t => {
          t.classList.remove("border-indigo-500", "ring-1", "ring-indigo-500", "bg-indigo-50/30");
          t.classList.add("border-slate-200");
        });
        tile.classList.remove("border-slate-200", "hover:border-indigo-400");
        tile.classList.add("border-indigo-500", "ring-1", "ring-indigo-500", "bg-indigo-50/30");
        
        topicModalState.selectedType = tile.dataset.type;
        els.topicSwapBtn.disabled = false;
        els.topicAddBtn.disabled = false;
      });
    });
    
    if (types.includes(q.questionType)) {
      const preselectTile = els.topicTypeGrid.querySelector(`[data-type="${q.questionType}"]`);
      if (preselectTile) preselectTile.click();
    } else {
      els.topicSwapBtn.disabled = true;
      els.topicAddBtn.disabled = true;
    }
  }
  
  els.topicModal.classList.remove("hidden");
  void els.topicModal.offsetWidth;
  els.topicModal.classList.remove("opacity-0");
  els.topicModal.firstElementChild.classList.remove("scale-95");
}

function closeTopicModal() {
  els.topicModal.classList.add("opacity-0");
  els.topicModal.firstElementChild.classList.add("scale-95");
  setTimeout(() => els.topicModal.classList.add("hidden"), 300);
}

function executeTopicSwap() {
  const selectedType = topicModalState.selectedType;
  if (!selectedType) return;
  
  const used = new Set(state.selectedQuestions.map(x => x.id));
  const pool = getAvailableQuestions().filter(x => 
    !used.has(x.id) && x.topic === topicModalState.topicName && x.questionType === selectedType
  );
  if (!pool.length) return;
  
  const best = pool[0];
  state.selectedQuestions = state.selectedQuestions.map(q => (q.id === topicModalState.sourceQuestionId ? best : q));
  
  closeTopicModal();
  transitionState(() => renderPreview());
}

function executeTopicAdd() {
  const selectedType = topicModalState.selectedType;
  if (!selectedType) return;
  
  const used = new Set(state.selectedQuestions.map(x => x.id));
  const pool = getAvailableQuestions().filter(x => 
    !used.has(x.id) && x.topic === topicModalState.topicName && x.questionType === selectedType
  );
  if (!pool.length) return;
  
  const best = pool[0];
  const idx = state.selectedQuestions.findIndex(q => q.id === topicModalState.sourceQuestionId);
  if (idx !== -1) {
    state.selectedQuestions.splice(idx + 1, 0, best);
  } else {
    state.selectedQuestions.push(best);
  }
  
  closeTopicModal();
  transitionState(() => renderPreview());
}

function removeQuestion(id) {
  state.lockedIds.delete(id);
  state.selectedQuestions = state.selectedQuestions.filter((q) => q.id !== id);
  transitionState(() => renderPreview());
}

function groupedCounts(items, key) {
  return items.reduce((acc, item) => { acc[item[key]] = (acc[item[key]] || 0) + item.marks; return acc; }, {});
}

function renderSummary() {
  const total = state.selectedQuestions.reduce((s, q) => s + q.marks, 0);
  const byDiff = groupedCounts(state.selectedQuestions, "difficulty");
  const byCh = unique(state.selectedQuestions.map((q) => q.chapterNumber)).length;
  els.summary.innerHTML = `
    <div class="stat"><strong>${state.selectedQuestions.length}</strong><span>Questions</span></div>
    <div class="stat"><strong>${total}</strong><span>Selected marks</span></div>
    <div class="stat"><strong>${byCh}</strong><span>Chapters</span></div>
    <div class="stat"><strong>${byDiff.Easy || 0}/${byDiff.Medium || 0}/${byDiff.Hard || 0}</strong><span>E / M / H marks</span></div>
  `;
}

let dragSrcEl = null;

function handleDragStart(e) {
  const card = e.target.closest(".question");
  if (!card) return;
  dragSrcEl = card;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.index);
  setTimeout(() => card.classList.add('dragging'), 0);
}

function handleDragOver(e) {
  e.preventDefault();
  const card = e.target.closest(".question");
  if (!card || card === dragSrcEl) return;
  e.dataTransfer.dropEffect = 'move';
  
  const rect = card.getBoundingClientRect();
  const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
  els.questions.insertBefore(dragSrcEl, next ? card.nextSibling : card);
}

function handleDragEnd(e) {
  const card = e.target.closest(".question");
  if (card) {
    card.classList.remove('dragging');
    card.removeAttribute('draggable');
  }
  
  const newOrderIds = [...els.questions.querySelectorAll(".question")].map(q => q.dataset.id);
  const reordered = newOrderIds.map(id => state.selectedQuestions.find(q => q.id === id));
  state.selectedQuestions = reordered;
  
  transitionState(() => renderPreview());
}


function renderPreview() {
  renderSummary();
  const marks = state.selectedQuestions.reduce((s, q) => s + q.marks, 0);
  const wanted = numberValue("totalMarks");
  const mt = value("microtestNumber");
  const isDemo = els.demoMode.checked;
  const label = isDemo ? "Demo Microtest" : "Microtest";
  
  els.paperMeta.textContent = `${label} ${mt} — ${marks}/${wanted} marks selected`;
  
  if (!state.selectedQuestions.length) {
    els.emptyState.classList.remove("hidden");
    els.paperMeta.classList.add("hidden");
    els.summary.classList.add("hidden");
    els.exportActionContainer.classList.add("hidden");
    
    // Clear the question list HTML but keep the emptyState element
    Array.from(els.questions.children).forEach(child => {
      if (child !== els.emptyState) child.remove();
    });
    return;
  }
  
  els.emptyState.classList.add("hidden");
  els.paperMeta.classList.remove("hidden");
  els.summary.classList.remove("hidden");
  els.exportActionContainer.classList.remove("hidden");
  
  // Re-append the empty state first, then the questions, so empty state doesn't get destroyed
  els.questions.innerHTML = "";
  els.questions.appendChild(els.emptyState);
  
  const questionsHtml = state.selectedQuestions.map((q, i) => {
    const locked = state.lockedIds.has(q.id);
    const assets = assetsFromQuestion(q);
    const assetAt = (placement) => assets.filter(a => a.placement === placement).map(assetToHtml).join("");

    const questionHtml = renderMarkdownToHtml(q.question);
    const optionHtml = q.options
      ? `<p class="options">
          A. ${renderMarkdownToHtml(q.options.A)}<br/>
          B. ${renderMarkdownToHtml(q.options.B)}<br/>
          C. ${renderMarkdownToHtml(q.options.C)}<br/>
          D. ${renderMarkdownToHtml(q.options.D)}
        </p>`
      : "";
    const imagePreview = q.imageUrl
      ? `<div class="question-image-container"><img class="question-image" src="${q.imageUrl}" alt="Diagram for ${q.id}" /></div>`
      : "";
    const diffColor = q.difficulty === "Easy" ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : q.difficulty === "Hard" ? "bg-rose-50 text-rose-600 border-rose-100" 
                    : "bg-amber-50 text-amber-600 border-amber-100";
    
    const lockBtnClass = locked ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100";

    const lockedClass = locked ? "bg-indigo-50/30 border-l-2 border-indigo-400" : "border-b border-slate-100 hover:bg-slate-50/50";
    
    return `<article class="group relative flex gap-4 p-4 transition-colors ${lockedClass}" data-id="${q.id}" data-index="${i}">
      <!-- Left side: Drag handle & Q Number -->
      <div class="flex flex-col items-center gap-2 w-8 shrink-0 pt-1">
        <div class="text-slate-300 cursor-grab hover:text-slate-500 font-bold" title="Drag to reorder">⋮⋮</div>
        <span class="text-[10px] font-bold text-slate-400 tracking-wider">Q${i + 1}</span>
      </div>

      <!-- Main Content -->
      <div class="flex-1 min-w-0 pr-24">
        <!-- Meta Row -->
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">${q.id}</span>
          <span class="text-slate-300">•</span>
          <span class="text-[11px] font-medium text-slate-500">${q.marks} mark${q.marks === 1 ? "" : "s"}</span>
          <span class="text-slate-300">•</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold border ${diffColor}">${q.difficulty}</span>
          <span class="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200/60 text-[10px] font-medium">Ch ${q.chapterNumber}</span>
          <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-medium">${q.questionType}</span>
          <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/60 text-[10px] font-medium">${q.topic}</span>
        </div>

        <!-- Question Body -->
        <div class="text-sm text-slate-800 leading-snug mb-2">
          ${assetAt("Before Question")}
          ${questionHtml}
          ${imagePreview}
          ${assetAt("Before Options")}
        </div>
        
        <!-- Options (if any) -->
        ${q.options ? `<div class="text-[13px] text-slate-600 leading-relaxed bg-white/60 rounded-md p-3 border border-slate-100">
          A. ${renderMarkdownToHtml(q.options.A)}<br/>
          B. ${renderMarkdownToHtml(q.options.B)}<br/>
          C. ${renderMarkdownToHtml(q.options.C)}<br/>
          D. ${renderMarkdownToHtml(q.options.D)}
        </div>` : ""}
        
        ${assetAt("After Options")}
        ${assetAt("After Question")}
        
        <!-- Action Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button type="button" class="px-3 py-1.5 rounded-md bg-blue-50/50 text-blue-600 border border-blue-100 text-[11px] font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5 shrink-0" data-topic-action="${q.id}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            More from Topic
          </button>
          
          <div class="flex flex-wrap items-center gap-1.5 justify-end">
            <button class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100" type="button" data-swap="${q.id}">Swap</button>
            <button class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${lockBtnClass}" type="button" data-lock="${q.id}">${locked ? "Unlock" : "Lock"}</button>
            <button class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50" type="button" data-flag="${q.id}">Flag</button>
            <button class="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50" type="button" data-remove="${q.id}">Remove</button>
          </div>
        </div>
      </div>
    </article>`;
  });
  
  els.questions.insertAdjacentHTML("beforeend", questionsHtml.join(""));
}

function microtestPayload() {
  const microtestNumber = numberValue("microtestNumber");
  const padded = String(microtestNumber).padStart(3, "0");
  const isDemo = els.demoMode.checked;
  const classCode = `C${currentClassLevel()}`;
  const subjCode = subjectCode(currentSubject());
  return {
    test: {
      microtestId: `SAH-${classCode}-${subjCode}-${isDemo ? "DEMO" : "MT"}-${padded}`,
      microtestNumber,
      isDemo,
      classLevel: currentClassLevel(),
      subject: currentSubject(),
      teacherName: value("teacherName"),
      totalMarks: numberValue("totalMarks"),
      durationMinutes: numberValue("durationMinutes"),
      chapterPlan: getChapterPlan(),
      difficultyMix: getDifficultyMix()
    },
    questions: state.selectedQuestions
  };
}

// ─────────── PRODUCT SELECTORS ───────────────────────────────────
function renderProductSelectors() {
  const product = state.bank.product;
  els.classSelect.innerHTML = product.classes
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  els.classSelect.value = product.activeClassLevel;
  renderSubjectOptions(product.activeSubject);
}

function renderSubjectOptions(preferredSubject) {
  const subjects = (state.bank.product.subjectsByClass || {})[currentClassLevel()] || [];
  els.subjectSelect.innerHTML = subjects
    .map((s) => `<option value="${s}">${s}</option>`)
    .join("");
  if (preferredSubject && subjects.includes(preferredSubject)) els.subjectSelect.value = preferredSubject;
}

function applyTheme() {
  const subject = currentSubject();
  const body = document.body;

  // Remove existing theme classes
  body.className = body.className.replace(/\btheme-\S+/g, "");

  // Add new theme class
  let themeColor = "#1e40af"; // default blue
  if (subject) {
    const slug = subject.toLowerCase().replace(/\s+/g, "-");
    const themeClass = `theme-${slug}`;
    body.classList.add(themeClass);

    if (slug === "science") themeColor = "#059669";
    else if (slug === "maths" || slug === "mathematics" || slug === "physics" || slug === "chemistry") themeColor = "#2563eb";
    else if (slug === "english") themeColor = "#db2777";
    else if (slug === "hindi") themeColor = "#ea580c";
    else if (slug === "social-science" || slug === "evs" || slug === "biology") themeColor = "#7c3aed";
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", themeColor);
}

function resetDatasetView() {
  transitionState(() => {
    applyTheme();
    state.selectedQuestions = [];
    state.lockedIds.clear();
    els.chapterRows.innerHTML = "";
    renderTypeFilters();
    const chapters = chaptersForCurrentDataset();
    if (chapters.length) addChapterRow(chapters[0].chapterNumber, 100);
    updateDatasetStatus();
    renderPreview();
  });
}

function updateDatasetStatus() {
  if (!state.bank) return;
  const count = questionsForCurrentDataset().length;
  const chapterCount = chaptersForCurrentDataset().length;
  const conn = state.bank.connection || {};

  els.activeDatasetPill.textContent = `Class ${currentClassLevel()} ${currentSubject()}`;
  els.bankCount.textContent = `${count} usable question${count !== 1 ? "s" : ""} · ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""}`;

  const isLive = conn.source === "google-sheets";
  const isCache = conn.source === "local-cache";
  let connText;
  if (isLive) {
    connText = "🟢 Live — Google Sheets";
  } else if (isCache) {
    connText = `🟡 Cached${conn.cacheAge != null ? ` (${conn.cacheAge} min ago)` : ""}${conn.fallbackReason ? " — " + conn.fallbackReason : ""}`;
  } else {
    connText = `🔵 Offline — bundled data`;
  }
  els.connectionHint.textContent = connText;
  els.connectionHint.classList.toggle("ready", isLive);
  els.connectionHint.classList.toggle("warn", !isLive);

  const available = count > 0;
  els.datasetHint.textContent = available
    ? "Question bank available for this class and subject."
    : "No questions added yet for this class and subject.";
  els.datasetHint.classList.toggle("ready", available);
  els.datasetHint.classList.toggle("warn", !available);
  els.addChapter.disabled = !available;
  els.generate.disabled = !available;
}

// ─────────── DOCX GENERATION ─────────────────────────────────────
// Ported verbatim from server.js — pure JS, no Node APIs

function safeName(val) {
  return String(val || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function xmlEscape(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseTextToRuns(text) {
  const regex = /(\*\*.*?\*\*|\*.*?\*|[\n])/g;
  const parts = text.split(regex);
  const runs = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push({ text: part.slice(1, -1), italic: true });
    } else if (part === '\n') {
      runs.push({ break: true });
    } else {
      runs.push({ text: part });
    }
  }
  return runs;
}

function renderMarkdownToHtml(text) {
  // First escape HTML entities, apply Markdown, then render any math
  const escaped = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return renderMath(escaped);
}

// ─────────── MATH (KaTeX) ────────────────────────────────────────

// Returns true if text contains LaTeX delimiters: \( ... \) or \[ ... \]
function hasMath(text) {
  const s = String(text || "");
  return s.includes("\\(") || s.includes("\\[");
}

// Render inline \( ... \) and display \[ ... \] math using KaTeX.
// Falls back to plain text if KaTeX is not loaded (Science questions unaffected).
function renderMath(text) {
  if (typeof katex === "undefined") return text;
  return String(text || "")
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
      try { return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false }); }
      catch (e) { return _; }
    })
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
      try { return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }); }
      catch (e) { return _; }
    });
}

// ─────────── DIAGRAM / ASSET RENDERING ──────────────────────────

const PLACEMENT_ORDER = [
  "Before Question", "Before Options", "After Options",
  "After Question", "Before Solution", "After Solution"
];

// Build a normalised asset descriptor from a question's inline columns.
// Returns an empty array if the question has no asset, or 1-element array if it does.
// Each question carries at most one asset (the five optional columns are per-row).
function assetsFromQuestion(q) {
  const fmt  = String(q.assetFormat  || "").trim();
  const data = String(q.assetData    || "").trim();
  if (!fmt || !data) return []; // No asset — Science rows, blank Maths rows, etc.
  const placement = PLACEMENT_ORDER.includes(q.assetPlacement)
    ? q.assetPlacement
    : "Before Question";
  return [{
    assetId:   `${q.id}-asset`,
    questionId: q.id,
    format:    fmt,
    assetData: data,
    width:     Number(q.assetWidth)  || 300,
    height:    Number(q.assetHeight) || 300,
    placement
  }];
}

// Render a coordinate-plane spec-json to an SVG string.
function renderCoordinatePlane(spec, svgWidth, svgHeight) {
  const xMin = Number(spec.xMin ?? -5);  const xMax = Number(spec.xMax ?? 5);
  const yMin = Number(spec.yMin ?? -5);  const yMax = Number(spec.yMax ?? 5);
  const pad  = 30; // px padding around the axes area
  const drawW = svgWidth  - pad * 2;
  const drawH = svgHeight - pad * 2;
  const scaleX = drawW / (xMax - xMin);
  const scaleY = drawH / (yMax - yMin);
  // Map math coords → SVG pixels
  const px = (x) => pad + (x - xMin) * scaleX;
  const py = (y) => pad + (yMax - y) * scaleY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="font-family:sans-serif;font-size:11px;">`;

  // Grid lines
  if (spec.grid !== false) {
    svg += `<g stroke="#e0e0e0" stroke-width="0.5">`;
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      svg += `<line x1="${px(x)}" y1="${pad}" x2="${px(x)}" y2="${pad + drawH}"/>`;
    }
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
      svg += `<line x1="${pad}" y1="${py(y)}" x2="${pad + drawW}" y2="${py(y)}"/>`;
    }
    svg += `</g>`;
  }

  // Axes
  if (spec.axes !== false) {
    const ax = px(0); const ay = py(0);
    // X axis
    svg += `<line x1="${pad}" y1="${ay}" x2="${pad + drawW}" y2="${ay}" stroke="#333" stroke-width="1.5" marker-end="url(#arr)"/>`;
    // Y axis
    svg += `<line x1="${ax}" y1="${pad + drawH}" x2="${ax}" y2="${pad}" stroke="#333" stroke-width="1.5" marker-end="url(#arr)"/>`;
    // Arrow marker def
    svg += `<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#333"/></marker></defs>`;
    // X tick labels (skip 0)
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      if (x === 0) continue;
      svg += `<line x1="${px(x)}" y1="${ay - 3}" x2="${px(x)}" y2="${ay + 3}" stroke="#333" stroke-width="1"/>`;
      svg += `<text x="${px(x)}" y="${ay + 14}" text-anchor="middle" fill="#555">${x}</text>`;
    }
    // Y tick labels (skip 0)
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
      if (y === 0) continue;
      svg += `<line x1="${ax - 3}" y1="${py(y)}" x2="${ax + 3}" y2="${py(y)}" stroke="#333" stroke-width="1"/>`;
      svg += `<text x="${ax - 8}" y="${py(y) + 4}" text-anchor="end" fill="#555">${y}</text>`;
    }
    // Origin label
    svg += `<text x="${ax - 8}" y="${ay + 14}" text-anchor="end" fill="#555">0</text>`;
    // Axis labels
    svg += `<text x="${pad + drawW + 6}" y="${ay + 4}" fill="#333" font-weight="bold">x</text>`;
    svg += `<text x="${ax + 4}" y="${pad - 6}" fill="#333" font-weight="bold">y</text>`;
  }

  // Build a label→coord map for segments
  const pointMap = {};
  (spec.points || []).forEach((pt) => { if (pt.label) pointMap[pt.label] = pt; });

  // Segments
  (spec.segments || []).forEach((seg) => {
    const a = pointMap[seg.from]; const b = pointMap[seg.to];
    if (!a || !b) return;
    svg += `<line x1="${px(a.x)}" y1="${py(a.y)}" x2="${px(b.x)}" y2="${py(b.y)}" stroke="#2563eb" stroke-width="1.5"/>`;
  });

  // Points
  (spec.points || []).forEach((pt) => {
    svg += `<circle cx="${px(pt.x)}" cy="${py(pt.y)}" r="4" fill="#2563eb"/>`;
    if (pt.label) {
      svg += `<text x="${px(pt.x) + 6}" y="${py(pt.y) - 6}" fill="#1e40af" font-weight="bold">${pt.label}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

// Low-level: try to render an asset and return {svg, error}.
// error is null on success, a message string on failure.
// This separation lets preview show warnings while DOCX silently skips broken assets.
function assetToSvgResult(asset) {
  const fmt  = asset.format;
  const data = asset.assetData;
  try {
    if (fmt === "svg") {
      // Inline SVG: sanitise by refusing to execute scripts.
      // Simple approach: strip <script> tags before rendering.
      const safe = data.replace(/<script[\s\S]*?<\/script>/gi, "");
      return { svg: safe.trim(), error: null };
    }
    if (fmt === "spec-json") {
      const spec = JSON.parse(data); // throws on invalid JSON
      if (spec.type === "coordinate-plane") {
        return { svg: renderCoordinatePlane(spec, asset.width || 300, asset.height || 300), error: null };
      }
      return { svg: "", error: `Unknown spec type: "${spec.type}"` };
    }
    if (!fmt) return { svg: "", error: null }; // blank format — silently ignore
    return { svg: "", error: `Unknown asset format: "${fmt}"` };
  } catch (e) {
    return { svg: "", error: e.message };
  }
}

// Returns a raw SVG string (empty on error) — used by the DOCX pipeline.
function assetToSvgString(asset) {
  return assetToSvgResult(asset).svg;
}

// Returns an HTML string for the preview panel.
// Shows a visible inline warning for broken/unknown assets instead of silent failure.
function assetToHtml(asset) {
  const { svg, error } = assetToSvgResult(asset);
  if (error) {
    console.warn("Asset render error:", error, asset.assetId);
    return `<div class="question-asset-error" data-placement="${asset.placement}" style="
        margin:8px 0;padding:6px 10px;border:1.5px dashed #f87171;border-radius:6px;
        font-size:12px;color:#dc2626;font-family:sans-serif;background:#fff5f5;">
      ⚠️ Diagram error: ${asset.format} — ${error}
    </div>`;
  }
  if (!svg) return "";
  return `<div class="question-asset" data-placement="${asset.placement}" style="margin:8px 0;text-align:center;">${svg}</div>`;
}

function paragraph(content, opts = {}) {
  const size = opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : "";
  const jc = opts.align ? `<w:pPr><w:jc w:val="${opts.align}"/></w:pPr>` : "";
  
  let runsXml = "";
  if (Array.isArray(content)) {
    content.forEach((run) => {
      if (run.break) {
        runsXml += `<w:r><w:br/></w:r>`;
      } else {
        const bold = (run.bold || opts.bold) ? "<w:b/>" : "";
        const italic = (run.italic || opts.italic) ? "<w:i/>" : "";
        runsXml += `<w:r><w:rPr>${bold}${italic}${size}</w:rPr><w:t xml:space="preserve">${xmlEscape(run.text)}</w:t></w:r>`;
      }
    });
  } else {
    return paragraph(parseTextToRuns(String(content)), opts);
  }
  
  return `<w:p>${jc}${runsXml}</w:p>`;
}

function pageBreak() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }

function makeDrawingXml(relId) {
  return `<w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="2857500" cy="2142900"/>
      <wp:docPr id="1" name="Question Diagram" descr="Diagram"/>
      <wp:cNvGraphicFramePr>
        <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
      </wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr>
              <pic:cNvPr id="1" name="image.png"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="${relId}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="2857500" cy="2142900"/>
              </a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>`;
}

// Render an image as a self-contained <w:p> block with correct EMU dimensions.
// 1 pixel @ 96 dpi = 9525 EMU. We clamp to max usable page width (16 cm ≈ 9144000 EMU).
function drawingParagraph(relId, widthPx, heightPx) {
  const EMU_PER_PX = 9525;
  const MAX_W_EMU  = 9144000; // ~16 cm for A4 with standard margins
  const wEmu = Math.min((widthPx  || 300) * EMU_PER_PX, MAX_W_EMU);
  const hEmu = Math.round(wEmu * ((heightPx || 300) / (widthPx || 300)));
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${wEmu}" cy="${hEmu}"/>
      <wp:docPr id="1" name="Diagram" descr="Diagram"/>
      <wp:cNvGraphicFramePr>
        <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
      </wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr>
              <pic:cNvPr id="1" name="image.png"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="${relId}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${wEmu}" cy="${hEmu}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r></w:p>`;
}

function makeDocumentXml(payload) {
  const test = payload.test;
  const questions = payload.questions;
  const created = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const chapterLine = test.chapterPlan.map((c) => `${c.chapterName} (${c.percentage}%)`).join(", ");
  const testLabel = test.isDemo ? "Demo Microtest" : "Microtest";
  let body = "";
  body += paragraph("Scholars Academic Home, Haldwani", { bold: true, size: 32, align: "center" });
  body += paragraph(`Class ${test.classLevel} ${test.subject} ${testLabel} ${test.microtestNumber}`, { bold: true, size: 28, align: "center" });
  body += paragraph(`Date: ${created}    Time: ${test.durationMinutes} minutes    Maximum Marks: ${test.totalMarks}`, { align: "center" });
  body += paragraph(`Chapters: ${chapterLine}`);
  body += paragraph("Student Name: ____________________________    Roll No.: ____________");
  body += paragraph("");

  let currentSection = "";
  questions.forEach((q, i) => {
    const section = `${q.questionType} Questions`;
    if (section !== currentSection) { currentSection = section; body += paragraph(section, { bold: true, size: 24 }); }

    // Asset helper for this question
    const assetDrawing = (placement) => (q.assetDocxEntries || [])
      .filter(e => e.placement === placement)
      .map(e => drawingParagraph(e.relId, e.width, e.height))
      .join("");

    // Before-question assets
    body += assetDrawing("Before Question");

    // Question text: use PNG if it contains math, else plain text
    if (q.questionPngRelId) {
      body += drawingParagraph(q.questionPngRelId, 480, 50);
    } else {
      body += paragraph(`${i + 1}. [${q.marks} mark${q.marks === 1 ? "" : "s"}] ${q.question}`);
    }
    // Legacy Image URL diagram
    if (q.imgRelId) body += drawingParagraph(q.imgRelId, 300, 225);

    // Before-options assets
    body += assetDrawing("Before Options");

    if (q.questionType === "MCQ" && q.options) {
      body += paragraph(`   A. ${q.options.A}`);
      body += paragraph(`   B. ${q.options.B}`);
      body += paragraph(`   C. ${q.options.C}`);
      body += paragraph(`   D. ${q.options.D}`);
    }

    // After-options / after-question assets
    body += assetDrawing("After Options");
    body += assetDrawing("After Question");
    body += paragraph("");
  });

  body += pageBreak();
  body += paragraph("Teacher Copy: Answer Key", { bold: true, size: 30, align: "center" });
  body += paragraph(`Microtest ID: ${test.microtestId}`);
  body += paragraph("");
  questions.forEach((q, i) => {
    const assetDrawing = (placement) => (q.assetDocxEntries || [])
      .filter(e => e.placement === placement)
      .map(e => drawingParagraph(e.relId, e.width, e.height))
      .join("");

    if (q.answerPngRelId) {
      body += drawingParagraph(q.answerPngRelId, 480, 50);
    } else {
      body += paragraph(`${i + 1}. ${q.answer}`, { bold: true });
    }
    if (q.imgRelId) body += drawingParagraph(q.imgRelId, 300, 225);
    body += assetDrawing("Before Solution");
    if (q.explanation) body += paragraph(`Explanation: ${q.explanation}`);
    body += assetDrawing("After Solution");
    body += paragraph(`Tags: ${q.chapterName}; ${q.topic}; ${q.difficulty}; ${q.questionType}; ${q.questionStyle || "Direct Recall"}; ${q.marks} mark(s)`);
    if (q.sourceType || q.pyqYear) {
      body += paragraph(`Source: ${q.sourceType || "Original"}${q.pyqYear ? `; PYQ ${q.pyqYear} ${q.pyqBoardExam || ""} ${q.pyqPaperSet || ""}` : ""}`);
    }
    body += paragraph("");
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// ─────────── SVG → PNG HELPERS (for DOCX export) ────────────────

// Convert an SVG string to a PNG Blob via an offscreen <canvas>.
function svgToPngBlob(svgString, width, height) {
  return new Promise((resolve) => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = width  || img.naturalWidth  || 300;
        canvas.height = height || img.naturalHeight || 300;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => {
          if (b) {
            console.log(`[svgToPngBlob] Successfully converted SVG to PNG blob (${b.size} bytes).`);
          } else {
            console.warn("[svgToPngBlob] canvas.toBlob returned null.");
          }
          resolve(b);
        }, "image/png");
      } catch (err) {
        console.error("[svgToPngBlob] canvas draw error:", err);
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = (e) => {
      console.error("[svgToPngBlob] Image loading failed. SVG string was:", svgString);
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

let katexCssText = "";
async function loadKatexCss() {
  try {
    const res = await fetch("katex.min.css");
    if (res.ok) {
      const raw = await res.text();
      // Strip out all @font-face rules to prevent browser from tainting the canvas when exporting SVGs.
      katexCssText = raw.replace(/@font-face\s*\{[\s\S]*?\}/g, "");
    }
  } catch (e) {
    console.warn("Failed to load KaTeX CSS for SVG rendering:", e);
  }
}

// Render a math-bearing text field to a PNG Blob via KaTeX SVG → canvas.
// Returns null if the field has no math or KaTeX is unavailable.
async function mathFieldToPngBlob(text) {
  if (!hasMath(text) || typeof katex === "undefined") return null;
  // Build a temporary div to let KaTeX lay out the full text, then capture its SVG.
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;left:-9999px;top:-9999px;font-size:14px;line-height:1.5;background:#fff;padding:4px 8px;max-width:600px";
  div.innerHTML = renderMath(renderMarkdownToHtml(text));
  document.body.appendChild(div);
  // Brief yield for layout
  await new Promise(r => setTimeout(r, 0));
  // Measure the rendered block
  const rect = div.getBoundingClientRect();
  const w = Math.ceil(rect.width)  || 400;
  const h = Math.ceil(rect.height) || 40;

  // Make style safe for static display inside SVG
  div.style.position = "static";
  div.style.left = "auto";
  div.style.top = "auto";

  const serializer = new XMLSerializer();
  const xhtmlStr = serializer.serializeToString(div);

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <style type="text/css"><![CDATA[
        ${katexCssText}
      ]]></style>
    </defs>
    <foreignObject width="${w}" height="${h}">
      ${xhtmlStr}
    </foreignObject>
  </svg>`;

  document.body.removeChild(div);
  return svgToPngBlob(svgStr, w * 2, h * 2); // 2× for retina clarity
}

async function buildDocxBlob(payload) {
  console.log("[buildDocxBlob] Starting Word document generation with payload:", payload);
  const zip = new JSZip(); // eslint-disable-line no-undef
  const questions = payload.questions || [];

  const imgMap = new Map();
  let imgIndex = 1;

  // Helper: add an entry to imgMap and return its relId
  async function addToImgMap(key, blob, ext) {
    if (!blob) {
      console.warn(`[buildDocxBlob] addToImgMap skipped because blob is null for key: ${key}`);
      return null;
    }
    const relId   = `rIdImg${imgIndex}`;
    const filename = `media/image_${imgIndex}.${ext}`;
    imgMap.set(key, { relId, filename, data: blob, ext });
    console.log(`[buildDocxBlob] Added image to imgMap: key=${key}, relId=${relId}, filename=${filename}, size=${blob.size} bytes`);
    imgIndex++;
    return relId;
  }

  // 1. Fetch external Image URL diagrams (existing Science flow)
  for (const q of questions) {
    if (q.imageUrl && !imgMap.has(q.imageUrl)) {
      try {
        const res = await fetch(q.imageUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const blob = await res.blob();
          const ext  = blob.type === "image/jpeg" || blob.type === "image/jpg" ? "jpeg" : blob.type === "image/gif" ? "gif" : "png";
          await addToImgMap(q.imageUrl, blob, ext);
        }
      } catch (err) { console.warn(`Failed to fetch image ${q.imageUrl}:`, err); }
    }
    q.imgRelId = q.imageUrl && imgMap.has(q.imageUrl) ? imgMap.get(q.imageUrl).relId : null;
  }

  // 2. Render inline Question Assets (diagrams) to PNG
  for (const q of questions) {
    q.assetDocxEntries = [];
    for (const asset of assetsFromQuestion(q)) {   // ← reads q.assetFormat / q.assetData
      const svgStr = assetToSvgString(asset);
      if (!svgStr) continue;
      const key = `asset:${asset.assetId}`;
      if (!imgMap.has(key)) {
        const png = await svgToPngBlob(svgStr, asset.width || 300, asset.height || 300);
        await addToImgMap(key, png, "png");
      }
      const entry = imgMap.get(key);
      if (entry) q.assetDocxEntries.push({ relId: entry.relId, placement: asset.placement, width: asset.width || 300, height: asset.height || 300 });
    }
  }

  // 3. Render math-bearing text fields to PNG
  for (const q of questions) {
    q.questionPngRelId = null;
    q.answerPngRelId   = null;
    if (hasMath(q.question)) {
      const png = await mathFieldToPngBlob(q.question);
      q.questionPngRelId = await addToImgMap(`math-q:${q.id}`, png, "png");
    }
    if (hasMath(q.answer)) {
      const png = await mathFieldToPngBlob(q.answer);
      q.answerPngRelId = await addToImgMap(`math-a:${q.id}`, png, "png");
    }
  }

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const word = zip.folder("word");

  if (imgMap.size > 0) {
    const media = word.folder("media");
    for (const img of imgMap.values()) {
      media.file(img.filename.replace("media/", ""), img.data);
    }
  }

  let relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  for (const img of imgMap.values()) {
    relsXml += `<Relationship Id="${img.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${img.filename}"/>`;
  }
  relsXml += `</Relationships>`;
  word.folder("_rels").file("document.xml.rels", relsXml);

  word.file("styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>`);

  word.file("document.xml", makeDocumentXml(payload));

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

// ─────────── DATA LAYER ──────────────────────────────────────────
const BANK_CACHE_KEY = "question-bank";

async function fetchBankWithFallback() {
  const sheetsUrl = getSheetsUrl();

  // 1. Try Google Sheets directly
  if (sheetsUrl) {
    try {
      const url = new URL(sheetsUrl);
      url.searchParams.set("action", "getBank");
      const passcode = getSheetsPasscode();
      if (passcode) url.searchParams.set("passcode", passcode);
      url.searchParams.set("_ts", Date.now()); // bust cache
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const bank = await res.json();
        if (bank && Array.isArray(bank.questions)) {
          await dbPut("cache", BANK_CACHE_KEY, { bank, fetchedAt: Date.now() });
          return { ...bank, connection: { source: "google-sheets", ok: true } };
        }
      }
    } catch (e) {
      console.warn("Sheets fetch failed:", e.message);
    }
  }

  // 2. Try IndexedDB cache
  try {
    const cached = await dbGet("cache", BANK_CACHE_KEY);
    if (cached && cached.bank) {
      const ageMin = Math.round((Date.now() - (cached.fetchedAt || 0)) / 60000);
      const reason = !sheetsUrl ? "No Sheets URL — configure in Settings" : "Google Sheets unreachable";
      return { ...cached.bank, connection: { source: "local-cache", ok: true, fallbackReason: reason, cacheAge: ageMin } };
    }
  } catch (e) {
    console.warn("Cache read failed:", e.message);
  }

  // 3. Try bundled fallback-bank.json
  try {
    const res = await fetch("fallback-bank.json");
    if (res.ok) {
      const bank = await res.json();
      if (bank && Array.isArray(bank.questions)) {
        return { ...bank, connection: { source: "offline-fallback", ok: true } };
      }
    }
  } catch (e) {
    console.warn("Bundled fallback fetch failed:", e.message);
  }

  // No Sheets URL + no cached data + no fallback file
  const msg = !sheetsUrl
    ? "No Google Sheets URL configured. Open Settings (⚙) and paste your Apps Script URL."
    : "Google Sheets is unreachable and no cached data is available. Check your connection and refresh.";
  throw new Error(msg);
}

async function loadQuestionBank(options = {}) {
  const prevClass = state.bank ? currentClassLevel() : null;
  const prevSubject = state.bank ? currentSubject() : null;

  if (els.refreshBank) {
    els.refreshBank.disabled = true;
    els.refreshBank.textContent = "Refreshing…";
  }

  try {
    state.bank = await fetchBankWithFallback();
  } catch (e) {
    console.error("Failed to load any bank:", e);
    if (els.bankCount) els.bankCount.textContent = "Failed to load question bank";
    if (els.refreshBank) { els.refreshBank.disabled = false; els.refreshBank.textContent = "Refresh Bank"; }
    return;
  }

  renderProductSelectors();

  // Restore previous class/subject if valid
  if (prevClass && state.bank.product.classes.includes(prevClass)) {
    els.classSelect.value = prevClass;
    renderSubjectOptions(prevSubject);
    if (prevSubject && [...els.subjectSelect.options].some((o) => o.value === prevSubject)) {
      els.subjectSelect.value = prevSubject;
    }
  }

  if (options.keepPaper) {
    renderTypeFilters();
    const savedRows = [...document.querySelectorAll(".chapter-row")].map((row) => ({
      chapterNumber: Number(row.querySelector(".chapter-select").value) || null,
      percentage: Number(row.querySelector(".chapter-pct").value || 0)
    }));
    els.chapterRows.innerHTML = "";
    const chapters = chaptersForCurrentDataset();
    for (const saved of savedRows) {
      if (saved.chapterNumber && chapters.some((c) => c.chapterNumber === saved.chapterNumber)) {
        addChapterRow(saved.chapterNumber, saved.percentage);
      }
    }
    if (!savedRows.length && chapters.length) addChapterRow(chapters[0].chapterNumber, 100);
    applyTheme();
    updateDatasetStatus();
    renderPreview();
  } else {
    resetDatasetView();
  }

  if (els.refreshBank) {
    els.refreshBank.disabled = false;
    els.refreshBank.textContent = "Refresh Bank";
  }
}

async function recordInSheets(payload) {
  const sheetsUrl = getSheetsUrl();
  if (!sheetsUrl) return;
  try {
    await fetch(sheetsUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "recordPaper", passcode: getSheetsPasscode(), payload }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (e) {
    console.warn("Could not record in Sheets:", e.message);
  }
}

async function saveLogEntry(entry) {
  await dbPutKeyed("log", { ...entry, createdAt: entry.createdAt || new Date().toISOString() });
}

// ─────────── EXPORT ───────────────────────────────────────────────
async function exportDocx() {
  if (!state.selectedQuestions.length) return;
  els.exportDocx.disabled = true;
  els.exportDocx.textContent = "Building…";
  try {
    const payload = microtestPayload();
    const blob = await buildDocxBlob(payload);
    const fileName = safeName(payload.test.microtestId) + ".docx";

    // Trigger browser file-save dialog
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    // Show confirmation
    if (els.downloadLink) {
      els.downloadLink.hidden = false;
      els.downloadLink.textContent = `✓ Exported: ${fileName}`;
      els.downloadLink.removeAttribute("href");
    }

    // Persist log + sync to Sheets
    if (!payload.test.isDemo) {
      const logEntry = { ...payload.test, questionIds: payload.questions.map((q) => q.id), fileName };
      await saveLogEntry(logEntry);
      recordInSheets(payload); // fire-and-forget
    }

    await loadLog();
  } catch (err) {
    console.error("Export failed:", err);
    alert(`Export failed: ${err.message}`);
  }
  els.exportDocx.textContent = "Export Word File";
  els.exportDocx.disabled = state.selectedQuestions.length === 0;
}

// ─────────── LOG ─────────────────────────────────────────────────
async function loadLog() {
  const allLogs = await dbGetAll("log");
  const showDemos = els.showDemos.checked;
  const logs = showDemos ? allLogs : allLogs.filter((e) => !e.isDemo);

  if (!logs.length) {
    els.logList.className = "log-list empty";
    els.logList.textContent = showDemos ? "No exports yet." : "No real microtests exported yet.";
    return;
  }

  els.logList.className = "log-list";
  els.logList.innerHTML = [...logs].reverse().map((entry) => {
    const chapters = (entry.chapterPlan || []).map((c) => `Ch ${c.chapterNumber}: ${c.percentage}%`).join(", ");
    const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-IN") : "";
    const demoTag = entry.isDemo ? ' <span class="tag demo">Demo</span>' : "";
    return `<div class="log-entry">
      <div class="log-entry-main">
        <strong>${entry.microtestId}${demoTag}</strong>
        <span>Class ${entry.classLevel} ${entry.subject} · ${entry.totalMarks} marks · ${chapters} · ${(entry.questionIds || []).length} Q</span>
      </div>
      <span class="log-entry-date">${dateStr}</span>
    </div>`;
  }).join("");
}

// ─────────── SETTINGS MODAL ──────────────────────────────────────
function openSettings() {
  if (els.sheetsUrlInput) els.sheetsUrlInput.value = getSheetsUrl();
  if (els.sheetsPasscodeInput) els.sheetsPasscodeInput.value = getSheetsPasscode();
  if (els.settingsModal) {
    els.settingsModal.classList.add("open");
    els.settingsModal.removeAttribute("hidden");
  }
}

function closeSettings() {
  if (els.settingsModal) {
    els.settingsModal.classList.remove("open");
  }
}

// ─────────── FLAG FOR REVIEW MODAL ────────────────────────────────
function openFlagModal(id) {
  const q = state.selectedQuestions.find((item) => item.id === id);
  if (!q) return;
  state.questionToFlag = id;
  if (els.flagQuestionSnippet) {
    els.flagQuestionSnippet.textContent = `${q.id}: ${q.question}`;
  }
  if (els.flagNoteInput) {
    els.flagNoteInput.value = "";
  }
  if (els.flagModal) {
    els.flagModal.classList.add("open");
  }
}

function closeFlagModal() {
  if (els.flagModal) {
    els.flagModal.classList.remove("open");
  }
  state.questionToFlag = null;
}

async function confirmFlagQuestion() {
  const id = state.questionToFlag;
  if (!id) return;
  const note = els.flagNoteInput ? els.flagNoteInput.value : "";

  // 1. Close modal immediately
  closeFlagModal();

  // 2. Remove question locally from selectedQuestions and loaded bank questions
  state.selectedQuestions = state.selectedQuestions.filter((q) => q.id !== id);
  state.lockedIds.delete(id);

  if (state.bank && Array.isArray(state.bank.questions)) {
    state.bank.questions = state.bank.questions.filter((q) => q.id !== id);
  }

  // Trigger UI transition/update
  transitionState(() => renderPreview());

  // 3. Post the flag to Google Sheets
  const sheetsUrl = getSheetsUrl();
  if (!sheetsUrl) {
    console.warn("No Sheets URL configured. Flagged locally but not synced.");
    return;
  }

  try {
    const url = new URL(sheetsUrl);
    const passcode = getSheetsPasscode();
    const body = {
      action: "flagQuestion",
      passcode,
      payload: { questionId: id, note }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      console.log(`Successfully flagged question ${id} in Google Sheets.`);
    } else {
      console.warn(`Failed to flag question in Sheets. Status: ${res.status}`);
    }
  } catch (err) {
    console.warn(`Could not sync flag to Google Sheets:`, err.message);
  }
}

// ─────────── INIT ─────────────────────────────────────────────────
async function init() {
  // Auto-open settings if no Sheets URL is configured yet
  if (!getSheetsUrl()) openSettings();

  await Promise.all([loadQuestionBank(), loadLog(), loadKatexCss()]);

  // Drag and drop listeners
  if (els.questions) {
    els.questions.addEventListener('dragstart', handleDragStart);
    els.questions.addEventListener('dragover', handleDragOver);
    els.questions.addEventListener('dragend', handleDragEnd);
    els.questions.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (handle) {
        const card = handle.closest('.question');
        if (card) card.setAttribute('draggable', 'true');
      }
    });
    els.questions.addEventListener('mouseup', (e) => {
      const card = e.target.closest('.question');
      if (card) card.removeAttribute('draggable');
    });
  }

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed:", e));
  }

  // Core controls
  els.classSelect.addEventListener("change", () => { renderSubjectOptions(); resetDatasetView(); });
  els.subjectSelect.addEventListener("change", resetDatasetView);
  els.refreshBank.addEventListener("click", () => loadQuestionBank({ keepPaper: true }));
  els.addChapter.addEventListener("click", () => { addChapterRow(null, 0); distributeChaptersEqually(); });
  els.generate.addEventListener("click", generatePaper);
  els.clearLocks.addEventListener("click", () => { state.lockedIds.clear(); renderPreview(); });
  els.exportDocx.addEventListener("click", exportDocx);
  els.refreshLog.addEventListener("click", loadLog);
  els.showDemos.addEventListener("change", loadLog);
  els.demoMode.addEventListener("change", renderPreview);

  // Settings
  if (els.settingsBtn) els.settingsBtn.addEventListener("click", openSettings);
  if (els.saveSettingsBtn) {
    els.saveSettingsBtn.addEventListener("click", () => {
      setSheetsUrl(els.sheetsUrlInput.value);
      setSheetsPasscode(els.sheetsPasscodeInput.value);
      closeSettings();
      loadQuestionBank({ keepPaper: true });
    });
  }
  if (els.cancelSettingsBtn) els.cancelSettingsBtn.addEventListener("click", closeSettings);
  if (els.settingsModal) {
    els.settingsModal.addEventListener("click", (e) => { if (e.target === els.settingsModal) closeSettings(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSettings();
        closeFlagModal();
      }
    });
  }

  // Flag Modal listeners
  if (els.confirmFlagBtn) els.confirmFlagBtn.addEventListener("click", confirmFlagQuestion);
  if (els.cancelFlagBtn) els.cancelFlagBtn.addEventListener("click", closeFlagModal);
  if (els.cancelFlagBtnSecondary) els.cancelFlagBtnSecondary.addEventListener("click", closeFlagModal);
  if (els.flagModal) {
    els.flagModal.addEventListener("click", (e) => { if (e.target === els.flagModal) closeFlagModal(); });
  }

  // Topic Modal listeners
  if (els.closeTopicModalBtn) els.closeTopicModalBtn.addEventListener("click", closeTopicModal);
  if (els.topicSwapBtn) els.topicSwapBtn.addEventListener("click", executeTopicSwap);
  if (els.topicAddBtn) els.topicAddBtn.addEventListener("click", executeTopicAdd);
  if (els.topicModal) {
    els.topicModal.addEventListener("click", (e) => { if (e.target === els.topicModal) closeTopicModal(); });
  }

  // Question card actions (swap, lock, remove, topic) via delegation
  document.body.addEventListener("click", (e) => {
    const swap = e.target.closest("[data-swap]");
    const lock = e.target.closest("[data-lock]");
    const flag = e.target.closest("[data-flag]");
    const remove = e.target.closest("[data-remove]");
    const topic = e.target.closest("[data-topic-action]");
    if (swap) replaceQuestion(swap.dataset.swap);
    if (lock) toggleLock(lock.dataset.lock);
    if (flag) openFlagModal(flag.dataset.flag);
    if (remove) removeQuestion(remove.dataset.remove);
    if (topic) openTopicModal(topic.dataset.topicAction);
  });

  // Difficulty mix live validation
  document.body.addEventListener("input", (e) => {
    if (e.target.matches("#easyPct, #mediumPct, #hardPct")) validateMix();
  });

  // Auto-refresh on window focus + every 60 seconds
  window.addEventListener("focus", () => loadQuestionBank({ keepPaper: true }));
  setInterval(() => loadQuestionBank({ keepPaper: true }), 60_000);

  renderSummary();
}

init().catch((err) => {
  console.error("Init failed:", err);
  if (els.bankCount) els.bankCount.textContent = "Failed to start — check console";
});
