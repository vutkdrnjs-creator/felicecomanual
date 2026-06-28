const manualSeed = window.__FELICE_SEED__.manual;
const taskSeed = window.__FELICE_SEED__.tasks;
const checklistSeed = window.__FELICE_SEED__.checklists;

const keys = {
  tasks: "felice.manual.single.tasks",
  checks: "felice.manual.single.checklists",
  manual: "felice.manual.single.sections",
  backup: "felice.manual.single.lastBackupAt",
  sharedEndpoint: "felice.manual.shared.endpoint",
  sharedUpdatedAt: "felice.manual.shared.updatedAt",
};

const labels = { home: "홈", tasks: "업무", calendar: "캘린더", checklists: "체크리스트", manual: "매뉴얼", tools: "도구", data: "관리", search: "검색" };
const periods = { short: "단기 업무", mid_long: "중장기 업무", long: "장기 업무" };
const statuses = { todo: "시작 전", in_progress: "진행 중", done: "완료", hold: "보류" };
const priorities = { high: "높음", medium: "보통", low: "낮음" };
const statusIcon = { todo: "○", in_progress: "↻", done: "✓", hold: "!" };

const toolGuide = [
  ["Google Calendar", "미팅, 시식, 출장, 교육, 반복 일정과 변경 사항을 등록합니다.", ["제목·날짜·장소·담당자 입력", "변경 전 KakaoTalk 공유 내용 확인", "다음 연락일도 일정으로 등록"]],
  ["Google Sheets", "DB, 가망 고객, 미팅, 계약·현장, 결재 상태를 관리합니다.", ["통화 직후 상태와 다음 행동 입력", "색상 기준은 확인 필요 항목으로 분리", "민감 정보는 권한 있는 시트에서만 관리"]],
  ["Google Drive", "현장 사진, 도면, 견적, 교육 자료를 폴더별로 보관합니다.", ["현장별 폴더와 파일명 규칙 사용", "공유 권한 확인", "실제 비공개 링크는 HTML에 저장하지 않음"]],
  ["KakaoTalk", "업무방과 계약·현장 진행방에서 핵심 진행 상황을 공유합니다.", ["결과·다음 행동·담당자 중심", "아침·저녁 보고 활용", "현장 사진과 결재 요청 공유"]],
];

let state = { view: location.hash.replace("#", "") || "home", period: "short", q: "", status: "all", sort: "priority", hideDone: false, calendarMonth: "" };
let tasks = load(keys.tasks, taskSeed);
let checks = load(keys.checks, checklistSeed);
let sections = load(keys.manual, manualSeed.sections);
let sharedEndpoint = localStorage.getItem(keys.sharedEndpoint) || defaultSharedEndpoint();
let sharedSaveTimer = 0;
let applyingRemote = false;

document.getElementById("headerDate").textContent = manualSeed.meta.lastUpdated;
document.getElementById("sideDate").textContent = "최종 수정일 " + manualSeed.meta.lastUpdated;

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function defaultSharedEndpoint() {
  return /^https?:$/.test(location.protocol) ? "/api/state" : "";
}

function persist() {
  localStorage.setItem(keys.tasks, JSON.stringify(tasks));
  localStorage.setItem(keys.checks, JSON.stringify(checks));
  localStorage.setItem(keys.manual, JSON.stringify(sections));
  if (!applyingRemote) scheduleSharedSave();
}

function persistLocalOnly() {
  localStorage.setItem(keys.tasks, JSON.stringify(tasks));
  localStorage.setItem(keys.checks, JSON.stringify(checks));
  localStorage.setItem(keys.manual, JSON.stringify(sections));
}

function snapshot() {
  return {
    app: "FELICE COMPANY 운영 매뉴얼",
    revision: Date.now(),
    updatedAt: new Date().toISOString(),
    tasks,
    checklists: checks,
    manualSections: sections,
  };
}

function normalizeSharedPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  if (!Array.isArray(data.tasks) || !Array.isArray(data.checklists) || !Array.isArray(data.manualSections)) return null;
  return data;
}

async function loadSharedData(showAlert = false) {
  if (!sharedEndpoint) {
    if (showAlert) alert("먼저 Google Apps Script 웹앱 URL을 입력해 주세요.");
    return;
  }
  try {
    const response = await fetch(`${sharedEndpoint}${sharedEndpoint.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
    const payload = await response.json();
    const data = normalizeSharedPayload(payload);
    if (!data) {
      if (showAlert) alert("공유 저장소에 아직 데이터가 없습니다. 먼저 현재 상태를 올려 주세요.");
      return;
    }
    applyingRemote = true;
    tasks = data.tasks;
    checks = data.checklists;
    sections = data.manualSections;
    persistLocalOnly();
    applyingRemote = false;
    localStorage.setItem(keys.sharedUpdatedAt, data.updatedAt || new Date().toISOString());
    render();
    if (showAlert) alert("공유 데이터를 불러왔습니다.");
  } catch (error) {
    applyingRemote = false;
    if (showAlert) alert("공유 데이터를 불러오지 못했습니다. Apps Script URL과 배포 권한을 확인해 주세요.");
  }
}

function scheduleSharedSave() {
  if (!sharedEndpoint) return;
  clearTimeout(sharedSaveTimer);
  sharedSaveTimer = window.setTimeout(saveSharedData, 700);
}

async function saveSharedData() {
  if (!sharedEndpoint) return;
  try {
    await fetch(sharedEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify(snapshot()),
    });
    localStorage.setItem(keys.sharedUpdatedAt, new Date().toISOString());
  } catch (error) {
    console.warn("Shared save failed", error);
  }
}

function saveSharedEndpoint() {
  sharedEndpoint = value("sharedEndpoint").trim();
  if (sharedEndpoint) {
    localStorage.setItem(keys.sharedEndpoint, sharedEndpoint);
    loadSharedData(true);
  } else {
    localStorage.removeItem(keys.sharedEndpoint);
    alert("공유 저장 URL을 비웠습니다. 이 브라우저의 localStorage 모드로 동작합니다.");
  }
  render();
}

function pushCurrentDataToShared() {
  if (!sharedEndpoint) {
    alert("먼저 Google Apps Script 웹앱 URL을 입력해 주세요.");
    return;
  }
  saveSharedData().then(() => alert("현재 데이터를 공유 저장소로 보냈습니다."));
}

function formatLocalIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIso() {
  return formatLocalIso(new Date());
}

function addDaysIso(baseIso, days) {
  const base = baseIso ? new Date(`${baseIso}T00:00:00`) : new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return formatLocalIso(base);
}

function daysBetween(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function validateTaskDeadline(period, startDate, dueDate) {
  if (!startDate || !dueDate) {
    alert("모든 업무는 시작일과 마감일을 반드시 지정해야 합니다.");
    return false;
  }
  const diff = daysBetween(startDate, dueDate);
  if (diff < 0) {
    alert("마감일은 시작일보다 빠를 수 없습니다.");
    return false;
  }
  if (period === "short" && (diff < 7 || diff > 15)) {
    alert("단기 업무 마감일은 시작일 기준 최소 7일, 최대 15일 안으로 설정해 주세요.");
    return false;
  }
  return true;
}

function defaultDueDate(period, startDate = todayIso()) {
  if (period === "short") return addDaysIso(startDate, 7);
  if (period === "mid_long") return addDaysIso(startDate, 30);
  return addDaysIso(startDate, 90);
}
function todayText() {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date());
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (match) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[match]);
}

function icon(name) {
  const svg = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    checklists: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
    data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.22.36.56.7.95.83.33.12.68.17 1.05.17H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
    short: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    mid_long: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    long: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22V4"/><path d="M5 4h12l-2 5 2 5H5"/></svg>',
    tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>',
  };
  return svg[name] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg>';
}

function syncSearchInputs() {
  ["desktopQ", "mobileQ"].forEach((id) => {
    const element = document.getElementById(id);
    if (element && element.value !== state.q) element.value = state.q;
  });
}

function go(view) {
  state.view = view;
  location.hash = view;
  closeMore();
  render();
}

window.onhashchange = () => {
  state.view = location.hash.replace("#", "") || "home";
  render();
};

function renderNav() {
  const sideItems = [["home", "홈"], ["short", "단기 업무"], ["mid_long", "중장기 업무"], ["long", "장기 업무"], ["calendar", "캘린더"], ["checklists", "체크리스트"], ["manual", "업무 매뉴얼"], ["tools", "외부 도구"], ["data", "백업·복원"]];
  document.getElementById("sideNav").innerHTML = sideItems.map(([key, label]) => {
    const active = key === state.view || (key === state.period && state.view === "tasks");
    const action = ["short", "mid_long", "long"].includes(key) ? `state.period='${key}';go('tasks')` : `go('${key}')`;
    return `<button class="${active ? "active" : ""}" onclick="${action}">${icon(key)} <span>${label}</span></button>`;
  }).join("");
  document.getElementById("bottomNav").innerHTML = [["home", "홈"], ["tasks", "업무"], ["calendar", "캘린더"], ["checklists", "체크"], ["data", "관리"]]
    .map(([key, label]) => `<button class="${state.view === key ? "active" : ""}" onclick="go('${key}')" aria-label="${label}">${icon(key)}<span>${label}</span></button>`)
    .join("");
}

function render() {
  renderNav();
  syncSearchInputs();
  const views = { home: homeView, tasks: tasksView, calendar: calendarView, checklists: checksView, manual: manualView, tools: toolsView, data: dataView, search: searchView };
  document.getElementById("app").innerHTML = (views[state.view] || homeView)();
}


function printCurrent(label = labels[state.view] || "현재 화면") {
  document.body.dataset.printTitle = `FELICE COMPANY 운영 매뉴얼 · ${label}`;
  window.print();
}
function toggleSearch() {
  document.getElementById("searchPanel").classList.toggle("open");
  setTimeout(() => document.getElementById("mobileQ")?.focus(), 30);
}

function toggleMore() {
  document.getElementById("moreMenu").classList.toggle("open");
}

function closeMore() {
  document.getElementById("moreMenu")?.classList.remove("open");
}

function pct(items) {
  return items.length ? Math.round((items.filter((item) => item.checked).length / items.length) * 100) : 0;
}

function empty(text) {
  return `<div class="empty">${esc(text)}</div>`;
}

function homeView() {
  const undone = tasks.filter((task) => task.status !== "done").length;
  const todayTasks = tasks.slice().sort((a, b) => Number(a.status === "done") - Number(b.status === "done")).slice(0, 6);
  return `<section class="hero-card">
    <p class="eyebrow">${todayText()}</p>
    <h1>오늘도 업무를 확인해 주세요</h1>
    <p>운영 기준, 체크리스트, 보고 흐름을 한 화면에서 빠르게 확인합니다.</p>
    <div class="stat-grid"><div class="stat"><b>${undone}</b><span>미완료 업무</span></div><div class="stat"><b>${checks.length}</b><span>체크리스트</span></div><div class="stat"><b>${sections.length}</b><span>업무 매뉴얼</span></div></div>
  </section>
  <section class="section"><div class="section-head"><h2>바로가기</h2></div><div class="quick-grid">${quickTile("short", "단기 업무")}${quickTile("mid_long", "중장기")}${quickTile("long", "장기 업무")}${quickTile("calendar", "캘린더")}${quickTile("checklists", "체크리스트")}${quickTile("data", "백업·복원")}</div></section>
  <div class="dashboard-grid"><section class="section"><div class="section-head"><h2>오늘 확인</h2><button onclick="state.period='short';go('tasks')">업무 전체</button></div><div class="today-list">${todayTasks.map(todayCard).join("") || empty("확인할 업무가 없습니다.")}</div></section><section class="section"><div class="section-head"><h2>최근 체크리스트</h2><button onclick="go('checklists')">체크리스트 전체</button></div><div class="card-list">${checks.slice(0, 3).map(compactCheckCard).join("")}</div></section></div>`;
}

function quickTile(key, label) {
  const action = ["short", "mid_long", "long"].includes(key) ? `state.period='${key}';go('tasks')` : `go('${key}')`;
  return `<button class="quick-tile" onclick="${action}">${icon(key)}<span>${label}</span></button>`;
}

function todayCard(task) {
  return `<article class="today-card ${task.status === "done" ? "done-card" : ""}" onclick="state.period='${task.period}';go('tasks')">
    <div class="status-dot">${statusIcon[task.status]}</div><div><span class="badge ${task.status}">${statuses[task.status]}</span><h3>${esc(task.title)}</h3><p>${esc(task.category || "업무")} · ${esc(task.description || "설명 없음")}</p></div><button aria-label="업무 보기">보기</button>
  </article>`;
}

function tasksView() {
  const order = { high: 0, medium: 1, low: 2 };
  const list = tasks
    .filter((task) => task.period === state.period)
    .filter((task) => state.status === "all" || task.status === state.status)
    .filter((task) => JSON.stringify(task).toLowerCase().includes(state.q.toLowerCase()))
    .sort((a, b) => state.sort === "priority" ? order[a.priority] - order[b.priority] : (a[state.sort] || "9999").localeCompare(b[state.sort] || "9999"));
  return `<section class="section"><div class="section-head"><div><h2>${periods[state.period]}</h2><p class="section-sub">업무를 추가·수정·삭제하고 상태를 관리합니다.</p></div><div class="actions"><button onclick="printCurrent(periods[state.period])">PDF 출력</button><button class="primary-btn" onclick="openTaskEditor('${state.period}')">업무 추가</button></div></div>
    <div class="toolbar"><div class="tab-row">${Object.entries(periods).map(([key, label]) => `<button class="${state.period === key ? "active" : ""}" onclick="state.period='${key}';render()">${label}</button>`).join("")}</div><select onchange="state.status=this.value;render()"><option value="all">전체 상태</option>${Object.entries(statuses).map(([key, label]) => `<option value="${key}" ${state.status === key ? "selected" : ""}>${label}</option>`).join("")}</select><select onchange="state.sort=this.value;render()"><option value="priority" ${state.sort === "priority" ? "selected" : ""}>우선순위순</option><option value="dueDate" ${state.sort === "dueDate" ? "selected" : ""}>마감일순</option><option value="updatedAt" ${state.sort === "updatedAt" ? "selected" : ""}>수정일순</option></select></div>
    <div class="card-list two-col-desktop">${list.map(taskCard).join("") || empty("표시할 업무가 없습니다.")}</div></section>`;
}

function taskCard(task) {
  return `<article class="task-card ${task.status === "done" ? "done-card" : ""}"><div class="card-top"><div class="title-wrap"><span class="badge ${task.status}">${statusIcon[task.status]} ${statuses[task.status]}</span><h3>${esc(task.title)}</h3></div><span class="badge ${task.priority === "high" ? "warning" : ""}">우선 ${priorities[task.priority]}</span></div>
    <p>${esc(task.description)}</p><div class="meta-row"><span>${esc(task.category || "분류 없음")}</span><span>담당 ${esc(task.assignee || "미지정")}</span><span>마감 ${esc(task.dueDate || "미지정")}</span></div><div class="chip-row">${(task.tools || []).map((tool) => `<span>${esc(tool)}</span>`).join("")}</div>
    <details><summary>상세 내용</summary><p>${esc(task.notes || "메모 없음")}</p><p class="muted">시작일 ${esc(task.startDate || "미지정")} · 최종 수정일 ${esc(task.updatedAt || "")}</p>${(task.links || []).map((link) => `<a href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)}</a>`).join("")}</details>
    <div class="actions"><button onclick="toggleTaskDone('${task.id}')">${task.status === "done" ? "완료 취소" : "완료 처리"}</button><button onclick="openTaskEditor('${task.period}','${task.id}')">수정</button><button class="danger-btn" onclick="deleteTask('${task.id}')">삭제</button><button onclick="copyTaskReport('${task.id}')">카톡 문구</button></div></article>`;
}

function calendarView() {
  const month = state.calendarMonth || todayIso().slice(0, 7);
  state.calendarMonth = month;
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDate = new Date(year, monthNumber - 1, 1);
  const gridStart = new Date(firstDate);
  gridStart.setDate(firstDate.getDate() - firstDate.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const scheduled = tasks.filter((task) => task.startDate && task.dueDate);
  const missing = tasks.filter((task) => !task.startDate || !task.dueDate);
  const title = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(firstDate);

  return `<section class="section"><div class="section-head"><div><h2>캘린더</h2><p class="section-sub">업무 기간을 월간 달력 형태로 확인합니다. 날짜 칸의 업무를 누르면 해당 업무 탭으로 이동합니다.</p></div><div class="actions"><button onclick="moveCalendarMonth(-1)">이전 달</button><button onclick="state.calendarMonth=todayIso().slice(0,7);render()">이번 달</button><button onclick="moveCalendarMonth(1)">다음 달</button><button onclick="printCurrent('캘린더')">PDF 출력</button></div></div>
    <div class="calendar-title"><strong>${title}</strong><span>${scheduled.length}개 일정</span></div>
    <div class="calendar-month" role="grid" aria-label="${title} 업무 캘린더">
      ${["일", "월", "화", "수", "목", "금", "토"].map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
      ${days.map((date) => calendarDay(date, month, scheduled)).join("")}
    </div>
    <div class="calendar-legend"><span class="legend short">단기</span><span class="legend mid_long">중장기</span><span class="legend long">장기</span><span class="legend done">완료</span></div>
    ${missing.length ? `<article class="tool-card"><h3>기간 미지정 업무</h3><p class="muted">기존 데이터 중 날짜가 없는 업무입니다. 수정해서 시작일과 마감일을 지정해 주세요.</p><div class="card-list">${missing.map(calendarTask).join("")}</div></article>` : ""}
  </section>`;
}

function moveCalendarMonth(delta) {
  const baseMonth = state.calendarMonth || todayIso().slice(0, 7);
  const [year, monthNumber] = baseMonth.split("-").map(Number);
  const next = new Date(year, monthNumber - 1 + delta, 1);
  state.calendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  render();
}

function calendarDay(date, activeMonth, scheduled) {
  const iso = formatLocalIso(date);
  const inMonth = iso.slice(0, 7) === activeMonth;
  const today = iso === todayIso();
  const dayItems = scheduled.filter((task) => task.startDate <= iso && iso <= task.dueDate);
  const items = dayItems.slice(0, 4);
  const extra = dayItems.length - items.length;
  return `<div class="calendar-day ${inMonth ? "" : "muted-day"} ${today ? "today" : ""}" role="gridcell"><div class="calendar-date"><span>${date.getDate()}</span>${today ? `<b>오늘</b>` : ""}</div><div class="calendar-events">${items.map(calendarTask).join("")}${extra > 0 ? `<span class="calendar-more">+${extra}개 더</span>` : ""}</div></div>`;
}

function calendarTask(task) {
  const label = task.period === "short" ? "단" : task.period === "mid_long" ? "중" : "장";
  return `<button class="calendar-task ${task.period} ${task.status === "done" ? "done" : ""}" onclick="state.period='${task.period}';go('tasks')"><span>${label}</span>${esc(task.title)}</button>`;
}

function checksView() {
  return `<section class="section"><div class="section-head"><div><h2>체크리스트</h2><p class="section-sub">체크 상태는 localStorage에 저장되어 새로고침 후에도 유지됩니다.</p></div><div class="actions"><button onclick="printCurrent('체크리스트')">PDF 출력</button><button class="primary-btn" onclick="openChecklistEditor()">체크리스트 추가</button></div></div>
    <label class="muted"><input type="checkbox" ${state.hideDone ? "checked" : ""} onchange="state.hideDone=this.checked;render()"> 완료 항목 숨기기</label><div class="card-list two-col-desktop">${checks.map(checkCard).join("")}</div></section>`;
}

function compactCheckCard(checklist) {
  return `<article class="check-card"><div class="card-top"><h3>${esc(checklist.title)}</h3><span class="badge confirmed">${pct(checklist.items)}%</span></div><p class="muted">${esc(checklist.description)}</p><p class="muted">마감일 ${esc(checklist.dueDate || "미지정")}</p><div class="progress"><span style="width:${pct(checklist.items)}%"></span></div><button onclick="go('checklists')">열기</button></article>`;
}

function checkCard(checklist) {
  const visible = checklist.items.filter((item) => !state.hideDone || !item.checked);
  return `<article class="check-card"><div class="card-top"><div class="title-wrap"><h3>${esc(checklist.title)}</h3><p class="muted">${esc(checklist.description)}</p></div><span class="badge confirmed">${pct(checklist.items)}%</span></div><div class="progress"><span style="width:${pct(checklist.items)}%"></span></div>
    <ul class="check-items">${visible.map((item) => `<li class="${item.checked ? "checked" : ""}"><label><input type="checkbox" ${item.checked ? "checked" : ""} onchange="toggleChecklistItem('${checklist.id}','${item.id}')"><span>${item.checked ? "✓ " : ""}${esc(item.text)}</span></label><span><button onclick="openItemEditor('${checklist.id}','${item.id}')">수정</button> <button class="danger-btn" onclick="deleteChecklistItem('${checklist.id}','${item.id}')">삭제</button></span></li>`).join("")}</ul>
    <div class="actions"><button onclick="openItemEditor('${checklist.id}')">항목 추가</button><button onclick="setAllItems('${checklist.id}',true)">전체 체크</button><button onclick="setAllItems('${checklist.id}',false)">전체 해제</button><button onclick="openChecklistEditor('${checklist.id}')">수정</button><button class="danger-btn" onclick="deleteChecklist('${checklist.id}')">삭제</button></div></article>`;
}

function manualView() {
  return `<section class="section"><div class="section-head"><div><h2>업무 매뉴얼</h2><p class="section-sub">확정·초안·확인 필요 상태를 구분해 표시합니다.</p></div><button onclick="printCurrent('업무 매뉴얼')">PDF 출력</button></div><div class="card-list">${sections.map(manualCard).join("")}</div></section>`;
}

function manualCard(section) {
  return `<details class="manual-card" open><summary><span><b>${esc(section.title)}</b><br><small class="muted">${esc(section.category)} · 최종 수정일 ${esc(section.updatedAt)}</small></span><span class="badge ${section.sourceStatus}">${section.sourceStatus === "confirmed" ? "확정" : section.sourceStatus === "draft" ? "초안" : "확인 필요"}</span></summary><div class="manual-body"><p>${esc(section.summary)}</p>${block("업무 목적", [section.purpose])}${block("언제 사용하는가", [section.trigger])}${block("사용 도구", section.tools)}${block("진행 순서", section.steps, true)}${block("기록 위치", section.recordLocation)}${block("보고 방법", section.reporting)}${block("완료 기준", section.completionCriteria)}${block("주의사항", section.cautions)}</div></details>`;
}

function block(title, items, ordered = false) {
  return `<h4>${title}</h4><${ordered ? "ol" : "ul"}>${(items || []).map((item) => `<li>${esc(item)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`;
}

function toolsView() {
  return `<section class="section"><h2>외부 도구 활용</h2><div class="card-list two-col-desktop">${toolGuide.map((tool) => `<article class="tool-card"><div class="card-top"><h3>${tool[0]}</h3>${icon("tools")}</div><p>${tool[1]}</p><ul>${tool[2].map((point) => `<li>${point}</li>`).join("")}</ul><button onclick="copyText('[${tool[0]} 확인]\\n- ${tool[2].join("\\n- ")}')">공유 문구 복사</button></article>`).join("")}</div></section>`;
}

function dataView() {
  return `<section class="section"><div class="section-head"><div><h2>관리</h2><p class="section-sub">검색, 백업·복원, PDF 인쇄 기능입니다.</p></div><button onclick="go('search')">검색 열기</button></div><div class="card-list two-col-desktop"><article class="tool-card"><h3>Google 공유 저장</h3><p>Vercel 배포 시 /api/state가 Google Sheets에 수정·삭제·완료·체크 상태를 저장합니다. 파일로 직접 열 때만 별도 URL 입력이 필요합니다.</p><input id="sharedEndpoint" placeholder="/api/state 또는 공유 API URL" value="${esc(sharedEndpoint)}"><div class="actions"><button class="primary-btn" onclick="saveSharedEndpoint()">공유 연결</button><button onclick="loadSharedData(true)">공유 데이터 불러오기</button><button onclick="pushCurrentDataToShared()">현재 상태 올리기</button></div><p class="muted">마지막 공유 저장: ${localStorage.getItem(keys.sharedUpdatedAt) || "기록 없음"}</p></article>
    <article class="tool-card"><h3>JSON 내보내기</h3><p>현재 업무, 체크리스트, 매뉴얼 상태를 파일로 저장합니다.</p><button class="primary-btn" onclick="exportData()">JSON 내보내기</button><p class="muted">최근 백업일: ${localStorage.getItem(keys.backup) || "기록 없음"}</p></article>
    <article class="tool-card"><h3>JSON 불러오기</h3><textarea id="importText" placeholder="백업 JSON 내용을 붙여넣기"></textarea><button onclick="importData()">JSON 불러오기</button></article>
    <article class="tool-card"><h3>초기 데이터 복원</h3><p>수정 가능한 seed 예시 데이터로 되돌립니다.</p><button class="danger-btn" onclick="resetData()">초기 데이터 복원</button></article>
    <article class="tool-card"><h3>탭별 PDF 인쇄</h3><p>현재 선택 화면을 휴대폰에서도 읽기 좋은 문서형 PDF로 출력합니다.</p><div class="actions"><button onclick="state.period='short';go('tasks');setTimeout(()=>printCurrent('단기 업무'),50)">단기</button><button onclick="state.period='mid_long';go('tasks');setTimeout(()=>printCurrent('중장기 업무'),50)">중장기</button><button onclick="state.period='long';go('tasks');setTimeout(()=>printCurrent('장기 업무'),50)">장기</button><button onclick="go('checklists');setTimeout(()=>printCurrent('체크리스트'),50)">체크</button><button onclick="go('manual');setTimeout(()=>printCurrent('업무 매뉴얼'),50)">매뉴얼</button><button onclick="go('calendar');setTimeout(()=>printCurrent('캘린더'),50)">캘린더</button></div></article>
  </div></section>`;
}

function searchView() {
  const q = state.q.toLowerCase();
  const rows = q ? [
    ...tasks.filter((item) => JSON.stringify(item).toLowerCase().includes(q)).map((item) => ({ type: "업무", title: item.title, meta: `${periods[item.period]} · ${item.category || "분류 없음"}`, action: `state.period='${item.period}';go('tasks')` })),
    ...checks.filter((item) => JSON.stringify(item).toLowerCase().includes(q)).map((item) => ({ type: "체크리스트", title: item.title, meta: `${item.category} · ${pct(item.items)}% 완료`, action: "go('checklists')" })),
    ...sections.filter((item) => JSON.stringify(item).toLowerCase().includes(q)).map((item) => ({ type: "매뉴얼", title: item.title, meta: item.summary, action: "go('manual')" })),
  ] : [];
  return `<section class="section"><div class="section-head"><h2>검색</h2><button onclick="toggleSearch()">검색창</button></div><p class="section-sub">업무명, 메모, 체크리스트 항목, 매뉴얼 본문을 함께 검색합니다.</p><div class="card-list">${rows.map((row) => `<article class="result-card"><strong>${row.type}</strong><h3>${esc(row.title)}</h3><p class="muted">${esc(row.meta)}</p><button onclick="${row.action}">이동</button></article>`).join("") || empty("검색어를 입력해 주세요.")}</div></section>`;
}

function openTaskEditor(period, taskId) {
  const task = taskId ? tasks.find((item) => item.id === taskId) : { id: uid("task"), period, title: "", description: "", category: "", status: "todo", priority: "medium", assignee: "", startDate: todayIso(), dueDate: defaultDueDate(period), tools: [], links: [], notes: "", checklistIds: [], source: "사용자 추가", editable: true, createdAt: todayIso(), updatedAt: todayIso() };
  showModal(`<h2>업무 편집</h2><input id="taskTitle" required placeholder="업무명" value="${esc(task.title)}"><textarea id="taskDesc" placeholder="상세 설명">${esc(task.description)}</textarea><div class="form-grid"><select id="taskPeriod">${Object.entries(periods).map(([key, label]) => `<option value="${key}" ${task.period === key ? "selected" : ""}>${label}</option>`).join("")}</select><select id="taskStatus">${Object.entries(statuses).map(([key, label]) => `<option value="${key}" ${task.status === key ? "selected" : ""}>${label}</option>`).join("")}</select><select id="taskPriority">${Object.entries(priorities).map(([key, label]) => `<option value="${key}" ${task.priority === key ? "selected" : ""}>${label}</option>`).join("")}</select><input id="taskCategory" placeholder="카테고리" value="${esc(task.category)}"><input id="taskAssignee" placeholder="담당자" value="${esc(task.assignee)}"><input id="taskStart" type="date" value="${esc(task.startDate)}"><input id="taskDue" type="date" value="${esc(task.dueDate)}"><input id="taskTools" placeholder="도구, 쉼표 구분" value="${esc((task.tools || []).join(", "))}"></div><p class="form-hint">모든 업무는 시작일과 마감일이 필수입니다. 단기 업무는 시작일 기준 7일~15일 안으로 설정합니다.</p><textarea id="taskNotes" placeholder="메모">${esc(task.notes)}</textarea><div class="modal-actions"><button class="primary-btn" onclick="saveTask('${task.id}')">저장</button><button onclick="closeModal()">취소</button></div>`);
}

function saveTask(id) {
  const old = tasks.find((item) => item.id === id) || {};
  const title = value("taskTitle").trim();
  if (!title) { alert("업무명을 입력해 주세요."); return; }
  const period = value("taskPeriod");
  const startDate = value("taskStart");
  const dueDate = value("taskDue");
  if (!validateTaskDeadline(period, startDate, dueDate)) return;
  const item = { ...old, id, period, title, description: value("taskDesc"), category: value("taskCategory"), status: value("taskStatus"), priority: value("taskPriority"), assignee: value("taskAssignee"), startDate, dueDate, tools: value("taskTools").split(",").map((tool) => tool.trim()).filter(Boolean), links: old.links || [], notes: value("taskNotes"), checklistIds: old.checklistIds || [], source: old.source || "사용자 추가", editable: true, createdAt: old.createdAt || todayIso(), updatedAt: todayIso() };
  tasks = tasks.some((task) => task.id === id) ? tasks.map((task) => task.id === id ? item : task) : [item, ...tasks];
  state.period = item.period;
  persist();
  closeModal();
  render();
}

function toggleTaskDone(id) {
  tasks = tasks.map((task) => task.id === id ? { ...task, status: task.status === "done" ? "todo" : "done", updatedAt: todayIso() } : task);
  persist();
  render();
}

function deleteTask(id) {
  if (confirm("이 업무를 삭제할까요?")) {
    tasks = tasks.filter((task) => task.id !== id);
    persist();
    render();
  }
}

function copyTaskReport(id) {
  const task = tasks.find((item) => item.id === id);
  copyText(`[업무보고] ${task.title}\n상태: ${statuses[task.status]}\n다음 행동: ${task.notes || "확인 필요"}`);
}

function openChecklistEditor(id) {
  const checklist = id ? checks.find((item) => item.id === id) : { id: uid("checklist"), title: "", description: "", category: "", items: [], dueDate: "", editable: true, source: "사용자 추가", createdAt: todayIso(), updatedAt: todayIso() };
  showModal(`<h2>체크리스트 편집</h2><input id="checkTitle" required placeholder="체크리스트명" value="${esc(checklist.title)}"><input id="checkCategory" placeholder="카테고리" value="${esc(checklist.category)}"><input id="checkDue" type="date" value="${esc(checklist.dueDate || "")}"><textarea id="checkDesc" placeholder="설명">${esc(checklist.description)}</textarea><div class="modal-actions"><button class="primary-btn" onclick="saveChecklist('${checklist.id}')">저장</button><button onclick="closeModal()">취소</button></div>`);
}

function saveChecklist(id) {
  const old = checks.find((item) => item.id === id) || {};
  const title = value("checkTitle").trim();
  if (!title) { alert("체크리스트명을 입력해 주세요."); return; }
  const item = { ...old, id, title, category: value("checkCategory"), description: value("checkDesc"), dueDate: value("checkDue"), items: old.items || [], editable: true, source: old.source || "사용자 추가", createdAt: old.createdAt || todayIso(), updatedAt: todayIso() };
  checks = checks.some((checklist) => checklist.id === id) ? checks.map((checklist) => checklist.id === id ? item : checklist) : [item, ...checks];
  persist();
  closeModal();
  render();
}

function openItemEditor(checkId, itemId) {
  const checklist = checks.find((item) => item.id === checkId);
  const item = itemId ? checklist.items.find((target) => target.id === itemId) : { id: uid("item"), text: "", checked: false, status: "todo", notes: "", order: checklist.items.length + 1 };
  showModal(`<h2>체크 항목 ${itemId ? "수정" : "추가"}</h2><input id="itemText" required placeholder="항목 내용" value="${esc(item.text)}"><textarea id="itemNotes" placeholder="메모">${esc(item.notes || "")}</textarea><div class="modal-actions"><button class="primary-btn" onclick="saveChecklistItem('${checkId}','${item.id}')">저장</button><button onclick="closeModal()">취소</button></div>`);
}

function saveChecklistItem(checkId, itemId) {
  const text = value("itemText").trim();
  if (!text) { alert("항목 내용을 입력해 주세요."); return; }
  checks = checks.map((checklist) => {
    if (checklist.id !== checkId) return checklist;
    const oldItem = checklist.items.find((item) => item.id === itemId);
    const next = { id: itemId, text, checked: oldItem ? oldItem.checked : false, status: oldItem?.status || "todo", notes: value("itemNotes"), order: oldItem ? oldItem.order : checklist.items.length + 1 };
    return { ...checklist, items: oldItem ? checklist.items.map((item) => item.id === itemId ? next : item) : [...checklist.items, next], updatedAt: todayIso() };
  });
  persist();
  closeModal();
  render();
}

function toggleChecklistItem(checkId, itemId) {
  checks = checks.map((checklist) => checklist.id === checkId ? { ...checklist, items: checklist.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item), updatedAt: todayIso() } : checklist);
  persist();
  render();
}

function deleteChecklistItem(checkId, itemId) {
  if (confirm("이 항목을 삭제할까요?")) {
    checks = checks.map((checklist) => checklist.id === checkId ? { ...checklist, items: checklist.items.filter((item) => item.id !== itemId), updatedAt: todayIso() } : checklist);
    persist();
    render();
  }
}

function setAllItems(checkId, checked) {
  checks = checks.map((checklist) => checklist.id === checkId ? { ...checklist, items: checklist.items.map((item) => ({ ...item, checked })), updatedAt: todayIso() } : checklist);
  persist();
  render();
}

function deleteChecklist(id) {
  if (confirm("이 체크리스트를 삭제할까요?")) {
    checks = checks.filter((checklist) => checklist.id !== id);
    persist();
    render();
  }
}

function exportData() {
  const data = { app: "FELICE COMPANY 운영 매뉴얼", exportedAt: new Date().toISOString(), tasks, checklists: checks, manualSections: sections, settings: {} };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `felice-manual-backup-${todayIso()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(keys.backup, new Date().toLocaleDateString("ko-KR"));
  render();
}

function importData() {
  try {
    const data = JSON.parse(value("importText"));
    if (data.app !== "FELICE COMPANY 운영 매뉴얼" || !Array.isArray(data.tasks) || !Array.isArray(data.checklists) || !Array.isArray(data.manualSections)) {
      alert("백업 형식이 맞지 않습니다.");
      return;
    }
    if (confirm("현재 데이터를 백업 파일 내용으로 바꿀까요?")) {
      tasks = data.tasks;
      checks = data.checklists;
      sections = data.manualSections;
      persist();
      render();
    }
  } catch {
    alert("잘못된 JSON입니다. 적용하지 않았습니다.");
  }
}

function resetData() {
  if (confirm("초기 예시 데이터로 복원할까요? 현재 수정 내용은 사라집니다.")) {
    tasks = taskSeed;
    checks = checklistSeed;
    sections = manualSeed.sections;
    persist();
    render();
  }
}

function copyText(text) {
  navigator.clipboard?.writeText(text).then(() => alert("복사했습니다.")).catch(() => alert("복사 권한이 없어 직접 선택해 복사해 주세요."));
}

function showModal(html) {
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="modalBackdrop" onclick="if(event.target.id==='modalBackdrop')closeModal()"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`);
  setTimeout(() => document.querySelector("#modalBackdrop input, #modalBackdrop textarea, #modalBackdrop select")?.focus(), 20);
}

function closeModal() {
  document.getElementById("modalBackdrop")?.remove();
}

function value(id) {
  return document.getElementById(id)?.value || "";
}

function initSharedMode() {
  if (!sharedEndpoint) return;
  loadSharedData(false);
  window.setInterval(() => loadSharedData(false), 20000);
}

render();
initSharedMode();