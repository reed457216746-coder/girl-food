const STORAGE_KEY = "girlFood.records.v1";
const SETTINGS_KEY = "girlFood.settings.v1";

const homeMealCost = 28;
let records = loadRecords();
let selectedPeriod = "week";

const els = {
  todayText: document.querySelector("#todayText"),
  weekCount: document.querySelector("#weekCount"),
  weekSpend: document.querySelector("#weekSpend"),
  monthSpend: document.querySelector("#monthSpend"),
  heavyRatio: document.querySelector("#heavyRatio"),
  takeoutCount: document.querySelector("#takeoutCount"),
  maxMeal: document.querySelector("#maxMeal"),
  savePercent: document.querySelector("#savePercent"),
  saveAmount: document.querySelector("#saveAmount"),
  mealForm: document.querySelector("#mealForm"),
  formTitle: document.querySelector("#formTitle"),
  editingId: document.querySelector("#editingId"),
  mealDate: document.querySelector("#mealDate"),
  mealCost: document.querySelector("#mealCost"),
  mealType: document.querySelector("#mealType"),
  mealPlace: document.querySelector("#mealPlace"),
  mealSpicy: document.querySelector("#mealSpicy"),
  mealFlavor: document.querySelector("#mealFlavor"),
  mealNote: document.querySelector("#mealNote"),
  mealList: document.querySelector("#mealList"),
  tagCloud: document.querySelector("#tagCloud"),
  periodCost: document.querySelector("#periodCost"),
  periodHeavy: document.querySelector("#periodHeavy"),
  periodSave: document.querySelector("#periodSave"),
  costBar: document.querySelector("#costBar"),
  heavyBar: document.querySelector("#heavyBar"),
  homeBar: document.querySelector("#homeBar"),
  backupStatus: document.querySelector("#backupStatus"),
  toast: document.querySelector("#toast"),
};

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ updatedAt: new Date().toISOString() }));
}

function yuan(value) {
  return `¥${Math.round(Number(value || 0)).toLocaleString("zh-CN")}`;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function localDateText(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function dateOnly(value) {
  const date = new Date(`${value}T12:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getRange(period) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  } else {
    start.setDate(1);
  }

  return { start, end };
}

function inRange(record, period) {
  const { start, end } = getRange(period);
  const date = dateOnly(record.date);
  return date >= start && date <= end;
}

function isHeavy(record) {
  return ["重口", "超重口"].includes(record.flavor) || ["重辣", "爆辣"].includes(record.spicy);
}

function byDateDesc(a, b) {
  return `${b.date}-${b.createdAt || ""}`.localeCompare(`${a.date}-${a.createdAt || ""}`);
}

function statsFor(period) {
  const items = records.filter((record) => inRange(record, period));
  const spend = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const heavy = items.filter(isHeavy).length;
  const takeout = items.filter((item) => item.mode === "外卖" || item.type === "外卖").length;
  const max = items.reduce((best, item) => Math.max(best, Number(item.cost || 0)), 0);
  const estimatedHome = items.length * homeMealCost;
  const save = Math.max(0, spend - estimatedHome);
  const average = items.length ? spend / items.length : 0;
  return {
    items,
    spend,
    heavy,
    heavyRatio: items.length ? Math.round((heavy / items.length) * 100) : 0,
    takeout,
    max,
    save,
    average,
  };
}

function countTypes(items) {
  return items.reduce((map, item) => {
    map[item.type] = (map[item.type] || 0) + 1;
    return map;
  }, {});
}

function renderSummary() {
  const week = statsFor("week");
  const month = statsFor("month");
  const saveRate = week.spend ? Math.min(100, Math.round((week.save / week.spend) * 100)) : 0;

  els.todayText.textContent = `${localDateText()} · 重庆`;
  els.weekCount.textContent = `${week.items.length} 顿`;
  els.weekSpend.textContent = yuan(week.spend);
  els.monthSpend.textContent = yuan(month.spend);
  els.heavyRatio.textContent = `${month.heavyRatio}%`;
  els.takeoutCount.textContent = month.takeout;
  els.maxMeal.textContent = yuan(month.max);
  els.savePercent.textContent = `${saveRate}%`;
  els.saveAmount.textContent = yuan(week.save);
  document.documentElement.style.setProperty("--save-deg", `${saveRate * 3.6}deg`);
}

function renderAnalysis() {
  const stats = statsFor(selectedPeriod);
  const baseline = selectedPeriod === "week" ? 700 : 2800;
  const saveGoal = selectedPeriod === "week" ? 260 : 1000;
  const costWidth = Math.min(100, Math.round((stats.spend / baseline) * 100));
  const homeWidth = Math.min(100, Math.round((stats.save / saveGoal) * 100));
  const types = Object.entries(countTypes(stats.items)).sort((a, b) => b[1] - a[1]);

  els.periodCost.textContent = yuan(stats.spend);
  els.periodHeavy.textContent = `${stats.heavyRatio}%`;
  els.periodSave.textContent = yuan(stats.save);
  els.costBar.style.width = `${costWidth}%`;
  els.heavyBar.style.width = `${stats.heavyRatio}%`;
  els.homeBar.style.width = `${homeWidth}%`;

  els.tagCloud.innerHTML = "";
  if (!types.length) {
    els.tagCloud.innerHTML = "<span>还没有记录</span><span>先记一顿</span>";
    return;
  }

  types.slice(0, 6).forEach(([type, count]) => {
    const tag = document.createElement("span");
    tag.textContent = `${type} ${count} 次`;
    els.tagCloud.appendChild(tag);
  });
}

function renderList() {
  const sorted = [...records].sort(byDateDesc);
  els.mealList.innerHTML = "";

  if (!sorted.length) {
    els.mealList.innerHTML = `
      <div class="empty-state">
        还没有外食记录。<br />
        下次火锅、串串或外卖后，花 20 秒记一下。
      </div>
    `;
    return;
  }

  sorted.slice(0, 20).forEach((record) => {
    const item = document.createElement("article");
    item.className = "meal-item";
    item.innerHTML = `
      <div class="meal-main">
        <strong>${escapeHtml(record.type)} · ${escapeHtml(record.spicy)}</strong>
        <p>${record.date} · ${escapeHtml(record.mode)} · ${escapeHtml(record.flavor)}${record.place ? ` · ${escapeHtml(record.place)}` : ""}</p>
        ${record.note ? `<p>${escapeHtml(record.note)}</p>` : ""}
      </div>
      <div class="meal-price">
        <strong>${yuan(record.cost)}</strong>
        <div class="meal-actions">
          <button type="button" data-action="edit" data-id="${record.id}">编辑</button>
          <button type="button" data-action="delete" data-id="${record.id}">删除</button>
        </div>
      </div>
    `;
    els.mealList.appendChild(item);
  });
}

function renderBackupStatus() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    els.backupStatus.textContent = "本地保存";
    return;
  }
  try {
    const { updatedAt } = JSON.parse(raw);
    els.backupStatus.textContent = updatedAt ? `已保存 ${new Date(updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "本地保存";
  } catch {
    els.backupStatus.textContent = "本地保存";
  }
}

function render() {
  renderSummary();
  renderAnalysis();
  renderList();
  renderBackupStatus();
}

function resetForm() {
  els.formTitle.textContent = "记一顿";
  els.editingId.value = "";
  els.mealDate.value = isoToday();
  els.mealCost.value = "";
  els.mealType.value = "火锅";
  els.mealPlace.value = "";
  els.mealSpicy.value = "中辣";
  els.mealFlavor.value = "重口";
  els.mealNote.value = "";
  document.querySelector("#dineIn").checked = true;
}

function formRecord() {
  return {
    id: els.editingId.value || crypto.randomUUID(),
    date: els.mealDate.value,
    cost: Number(els.mealCost.value || 0),
    type: els.mealType.value,
    place: els.mealPlace.value.trim(),
    spicy: els.mealSpicy.value,
    flavor: els.mealFlavor.value,
    mode: document.querySelector("input[name='mealMode']:checked").value,
    note: els.mealNote.value.trim(),
    createdAt: els.editingId.value ? records.find((item) => item.id === els.editingId.value)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function editRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  els.formTitle.textContent = "编辑这一顿";
  els.editingId.value = record.id;
  els.mealDate.value = record.date;
  els.mealCost.value = record.cost;
  els.mealType.value = record.type;
  els.mealPlace.value = record.place || "";
  els.mealSpicy.value = record.spicy;
  els.mealFlavor.value = record.flavor;
  els.mealNote.value = record.note || "";
  document.querySelector(`input[name='mealMode'][value='${record.mode}']`).checked = true;
  scrollToSection("recordSection");
}

function deleteRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  if (!confirm(`删除 ${record.date} 的「${record.type}」记录？`)) return;
  records = records.filter((item) => item.id !== id);
  saveRecords();
  render();
  showToast("已删除");
}

function exportJson() {
  const payload = {
    app: "girl-food",
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  };
  downloadFile(`girl-food-backup-${isoToday()}.json`, JSON.stringify(payload, null, 2), "application/json");
  showToast("备份已导出");
}

function exportCsv() {
  const header = ["日期", "类型", "金额", "地点", "辣度", "口味", "方式", "备注"];
  const rows = [...records].sort(byDateDesc).map((item) => [
    item.date,
    item.type,
    item.cost,
    item.place || "",
    item.spicy,
    item.flavor,
    item.mode,
    item.note || "",
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(`girl-food-${isoToday()}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  showToast("CSV 已导出");
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      const imported = Array.isArray(data) ? data : data.records;
      if (!Array.isArray(imported)) throw new Error("invalid");
      const normalized = imported.map(normalizeRecord).filter(Boolean);
      if (!normalized.length && imported.length) throw new Error("invalid");
      records = mergeRecords(records, normalized);
      saveRecords();
      render();
      showToast(`已导入 ${normalized.length} 条记录`);
    } catch {
      showToast("备份文件格式不对");
    }
  };
  reader.readAsText(file);
}

function normalizeRecord(item) {
  if (!item || !item.date || !item.type) return null;
  return {
    id: item.id || crypto.randomUUID(),
    date: item.date,
    cost: Number(item.cost || 0),
    type: String(item.type),
    place: item.place ? String(item.place) : "",
    spicy: item.spicy || "中辣",
    flavor: item.flavor || "重口",
    mode: item.mode || "堂食",
    note: item.note ? String(item.note) : "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function mergeRecords(current, imported) {
  const map = new Map(current.map((item) => [item.id, item]));
  imported.forEach((item) => map.set(item.id, item));
  return [...map.values()].sort(byDateDesc);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

document.querySelectorAll(".period-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedPeriod = button.dataset.period;
    document.querySelectorAll(".period-tabs button").forEach((item) => item.classList.toggle("active", item === button));
    renderAnalysis();
  });
});

els.mealForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const next = formRecord();
  if (!next.date || !next.type || Number.isNaN(next.cost)) {
    showToast("日期、类型和花费要填一下");
    return;
  }
  const index = records.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    records[index] = next;
  } else {
    records.unshift(next);
  }
  saveRecords();
  resetForm();
  render();
  showToast("已保存，数据在本机");
});

els.mealList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit") editRecord(button.dataset.id);
  if (button.dataset.action === "delete") deleteRecord(button.dataset.id);
});

document.querySelector("#resetFormButton").addEventListener("click", resetForm);
document.querySelector("#quickAddButton").addEventListener("click", () => scrollToSection("recordSection"));
document.querySelector("#navStats").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.querySelector("#navBackup").addEventListener("click", () => scrollToSection("backupSection"));
document.querySelector("#backupTopButton").addEventListener("click", () => scrollToSection("backupSection"));
document.querySelector("#exportJsonButton").addEventListener("click", exportJson);
document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
document.querySelector("#importJsonInput").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importJson(file);
  event.target.value = "";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

resetForm();
render();
