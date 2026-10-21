/* Hang Fai AI HQ — browser-only visual controls over the existing Pixel Office state.
   No simulated status, tasks or agent execution. */
(function () {
  "use strict";
  document.title = "恒輝 AI 總部 · AI Office";
  // Keep the primary buttons readable to local Hong Kong users.
  var primaryLabels = [["btnBoard", "任務板"], ["btnMeeting", "會議"]];
  primaryLabels.forEach(function (pair) {
    var target = document.getElementById(pair[0]);
    var label = target && target.querySelector("[data-i18n]");
    if (label) label.textContent = pair[1];
  });
  var hireLabel = document.getElementById("hireLink");
  if (hireLabel) hireLabel.textContent = "＋ 聘請 AI";
  var statusText = {
    idle: "待命", working: "工作中", waiting: "待批核",
    error: "發生錯誤", sick: "休息中", offline: "離線"
  };
  var taskText = {
    todo: "未開始", doing: "處理中", blocked: "受阻",
    review: "待審核", done: "已完成"
  };
  var targetIds = {
    tasks: "btnBoard", meeting: "btnMeeting", inbox: "btnInbox",
    activity: "btnActivity", settings: "btnSettings"
  };
  function el(id) { return document.getElementById(id); }
  function make(tag, className, contents) {
    var x = document.createElement(tag);
    if (className) x.className = className;
    if (contents !== undefined) x.textContent = String(contents);
    return x;
  }
  function set(id, value) {
    var x = el(id);
    if (x) x.textContent = String(value);
  }
  function action(which) {
    if (which === "hire") {
      var hire = el("hireLink");
      if (hire) window.location.assign(hire.href);
    } else if (which === "overview") {
      var stage = document.querySelector(".stage");
      if (stage) stage.scrollIntoView({block: "nearest", behavior: "smooth"});
    } else if (targetIds[which] && el(targetIds[which])) {
      el(targetIds[which]).click();
    }
    document.querySelectorAll("[data-hq-action]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.hqAction === which);
      if (btn.dataset.hqAction === which) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }
  document.querySelectorAll("[data-hq-action]").forEach(function (btn) {
    btn.addEventListener("click", function () { action(btn.dataset.hqAction); });
  });
  function blank(host, msg) {
    host.replaceChildren(make("div", "hq-empty", msg));
  }
  function personCard(emp) {
    var btn = make("button", "hq-person");
    btn.type = "button";
    btn.title = "開啟與 " + (emp.name || "員工") + " 嘅對話";
    var av = make("span", "hq-avatar", (emp.name || "AI").slice(0, 1));
    var details = make("span", "hq-person-details");
    details.appendChild(make("b", "", emp.name || "AI 員工"));
    details.appendChild(make("small", "", emp.role || "AI Agent"));
    var status = String(emp.status || "idle");
    var stateLabel = make("span", "hq-status " + (statusText[status] ? status : "idle"), statusText[status] || status);
    btn.appendChild(av);
    btn.appendChild(details);
    btn.appendChild(stateLabel);
    btn.addEventListener("click", function () {
      if (typeof openChat === "function") openChat(emp.id);
    });
    return btn;
  }
  function taskCard(task, employees) {
    var btn = make("button", "hq-task");
    btn.type = "button";
    btn.title = "喺任務板檢視";
    btn.appendChild(make("span", "hq-task-icon", task.status === "doing" ? "⚡" :
      task.status === "review" ? "🔎" : task.status === "blocked" ? "⚠" : "◌"));
    var details = make("span", "hq-task-details");
    details.appendChild(make("b", "", "#" + task.id + " · " + (task.title || "未命名任務")));
    var owner = employees.get(task.owner);
    details.appendChild(make("small", "", (owner ? owner.name : "未指派") + " · " + (taskText[task.status] || task.status)));
    btn.appendChild(details);
    btn.addEventListener("click", function () { action("tasks"); });
    return btn;
  }
  function update() {
    // Existing app state is the only source of truth; empty means disconnected or unconfigured.
    var current = (typeof cur === "function") ? cur() : null;
    var employees = current && current.employees instanceof Map ? current.employees : new Map();
    var list = Array.from(employees.values());
    var tasks = current && current.board && Array.isArray(current.board.tasks) ? current.board.tasks : [];
    var online = typeof state !== "undefined" && !!state.online;
    var working = list.filter(function (e) { return e.status === "working"; }).length;
    var attention = tasks.filter(function (x) { return x.status === "review" || x.status === "blocked"; }).length;
    var pending = list.filter(function (e) { return e.status === "waiting"; }).length;
    set("hqCountPeople", list.length);
    set("hqCountWorking", working);
    set("hqCountAction", attention + pending);
    set("hqCompanyName", current && current.info && current.info.name ? current.info.name : "恒輝 AI 總部");
    var connection = el("hqConnection");
    var live = el("hqLive");
    if (connection) {
      connection.classList.toggle("connected", online);
      var txt = connection.querySelector("span");
      if (txt) txt.textContent = online ? "系統已連線" : "等待系統連線";
    }
    if (live) {
      live.classList.toggle("connected", online);
      var liveTxt = live.querySelector("span");
      if (liveTxt) liveTxt.textContent = online ? "LIVE · 即時同步" : "尚未連線";
    }
    var team = el("hqTeam");
    if (team) {
      if (!list.length) blank(team, "未有 AI 員工。按「聘請員工」開始設定 Codex 或 Gemini。");
      else {
        team.replaceChildren();
        list.forEach(function (x) { team.appendChild(personCard(x)); });
      }
    }
    var taskList = el("hqTasks");
    if (taskList) {
      var order = { blocked: 0, review: 1, doing: 2, todo: 3, done: 4 };
      var active = tasks.filter(function (x) { return x.status !== "done"; })
        .slice().sort(function (a,b) { return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (b.updated || 0) - (a.updated || 0); })
        .slice(0,5);
      if (!active.length) blank(taskList, "目前冇待辦任務。喺任務板建立工作，先會開始執行。");
      else {
        taskList.replaceChildren();
        active.forEach(function (x) { taskList.appendChild(taskCard(x, employees)); });
      }
    }
    set("hqTaskCount", tasks.filter(function (x) { return x.status !== "done"; }).length + " 項");
  }
  if (typeof panelHooks !== "undefined") panelHooks.push(function (what, officeId) {
    if (!officeId || (typeof state !== "undefined" && officeId === state.office)) update();
  });
  update();
  // Connection transitions need not have a panel event; this is display-only refresh.
  window.setInterval(update, 10000);
  if (typeof office !== "undefined" && office && typeof office.fit === "function") {
    window.requestAnimationFrame(function () { office.fit(); });
  }
})();
