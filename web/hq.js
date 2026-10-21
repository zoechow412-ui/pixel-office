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
  // Business offices are real Pixel Office offices, each with its own board,
  // conversation history and employee memory. Never simulate project progress.
  var projectIcons = {
    "hang-fai":"🏢", "bhu-housing":"🏗️", "construction":"🔧",
    "derfoe":"🧱", "driver-app":"🚗", "tailoring":"👔",
    "marketing-studio":"🎬",
    "unibright-ops":"📊", "bhu-plan-ai":"📐", "wp-waterproof":"💧", "firestop-ssn391":"🔥", "adhesives-b2b":"🧴", "estate-agency":"🗺️", "community-housing":"🤝", "social-publishing":"📣", "supcon-adhesive":"🏭", "unibright-web":"🌐", "the-point":"🍽️", "fnb-proposal":"🥢", "daan-daan-catering":"🥣", "newgen-ivf":"🧬", "newgensup":"💊", "dod-biotech":"🧾", "ocean-infinity":"🎪", "plumbing-drawings":"🚰", "electrical-fire-plans":"⚡", "rust-products":"🛠️", "b2b-sales-leads":"📈", "derfoe-brand-site":"🌐", "building-supply":"🏭", "ai-office-platform":"🤖", "private-book-art":"📖"
  };
  var departmentMap = {
    manager:["Executive & Growth","#dcb777"], sales:["Executive & Growth","#dcb777"],
    marketing:["Executive & Growth","#dcb777"], video:["Executive & Growth","#dcb777"],
    "project-manager":["Engineering","#68b1e0"], architectural:["Engineering","#68b1e0"],
    plumbing:["Engineering","#68b1e0"], "electrical-fire":["Engineering","#68b1e0"],
    researcher:["Compliance & Finance","#b09de4"], documentation:["Compliance & Finance","#b09de4"],
    estimating:["Compliance & Finance","#b09de4"], finance:["Compliance & Finance","#b09de4"],
    procurement:["Digital & Supply","#79d5bc"], developer:["Digital & Supply","#79d5bc"]
  };
  var deptOrder = ["Executive & Growth","Engineering","Compliance & Finance","Digital & Supply"];
  var lastProjectKey = null;
  function renderProjects() {
    var host = el("hqProjects");
    if (!host || typeof state === "undefined" || !(state.offices instanceof Map)) return;
    var offices = Array.from(state.offices.values()).filter(function (x) { return x && x.info; });
    var key = JSON.stringify([state.office, offices.map(function (x) { return [x.info.id,x.info.name]; })]);
    if (key === lastProjectKey) return;
    lastProjectKey = key;
    host.replaceChildren();
    if (!offices.length) { host.appendChild(make("small","hq-project-loading","等待專案連線…")); return; }
    var groups = [
      ["🏢 總部", ["hang-fai"]],
      ["🏗️ 恒輝建築／簡樸房", ["bhu-housing","construction","unibright-ops","bhu-plan-ai","estate-agency","community-housing","social-publishing","unibright-web"]],
      ["🧱 建材／膠業／貿易", ["derfoe","wp-waterproof","firestop-ssn391","adhesives-b2b","supcon-adhesive"]],
      ["💻 科技／餐飲／其他業務", ["driver-app","tailoring","marketing-studio","the-point","fnb-proposal","daan-daan-catering"]],
      ["🗃️ 較早期專案（現況待核實）", ["newgen-ivf","newgensup","dod-biotech","ocean-infinity"]]
    ];
    var officesById = new Map(offices.map(function (o) { return [o.info.id,o]; }));
    var rendered = new Set();
    function appendProject(item,target) {
      var id = item.info.id;
      rendered.add(id);
      var btn = make("button","hq-project-choice" + (state.office === id ? " selected" : ""));
      btn.type = "button"; btn.title = item.info.name;
      if (state.office === id) btn.setAttribute("aria-current","page");
      btn.appendChild(make("span","hq-project-emoji",projectIcons[id] || "📁"));
      btn.appendChild(make("span","",item.info.name.replace(/^[^A-Za-z\u4E00-\u9FFF]+/u,"")));
      btn.addEventListener("click",function () {
        if (typeof showOffice !== "function") return;
        showOffice(id);
        window.history.replaceState(null, "", "/?office=" + encodeURIComponent(id));
        lastProjectKey = null; lastTeamKey = null; lastTaskKey = null;
        renderProjects(); update();
      });
      target.appendChild(btn);
    }
    groups.forEach(function (def,i) {
      var list=def[1].map(function(id){return officesById.get(id);}).filter(Boolean);
      if (!list.length) return;
      var detail=make("details","hq-project-group");
      detail.open = list.some(function(x){return x.info.id===state.office;}) || i===0 || i===1;
      var title=make("summary","hq-project-group-title");
      title.appendChild(make("span","",def[0]));
      title.appendChild(make("small","",String(list.length)));
      detail.appendChild(title);
      var body=make("div","hq-project-group-list");
      list.forEach(function(item){appendProject(item,body);});
      detail.appendChild(body); host.appendChild(detail);
    });
    var uncategorized=offices.filter(function(x){return !rendered.has(x.info.id);});
    if (uncategorized.length) {
      var other=make("details","hq-project-group");
      other.open=uncategorized.some(function(x){return x.info.id===state.office;});
      other.appendChild(make("summary","hq-project-group-title","📁 其他專案 · "+uncategorized.length));
      var list=make("div","hq-project-group-list");
      uncategorized.forEach(function(item){appendProject(item,list);});
      other.appendChild(list);host.appendChild(other);
    }
  }
  function zoomOffice(delta, reset) {
    if (typeof office === "undefined" || !office || typeof office.fit !== "function") return;
    office.zoomFactor = reset ? 1 : Math.min(2.2, Math.max(.75,(office.zoomFactor||1) + delta));
    office.fit();
  }
  [["hqZoomOut",-.15],["hqZoomReset",0],["hqZoomIn",.15]].forEach(function (row) {
    var b=el(row[0]); if (b) b.addEventListener("click",function () {zoomOffice(row[1],row[1]===0);});
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
  var lastTeamKey = null, lastTaskKey = null;
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
    renderProjects();
    var indicator=el("hqFloorIndicator") || document.querySelector(".hq-floor-indicator");
    if(indicator) indicator.textContent=list.length+" STAFF · "+(current && current.info ? current.info.name : "HQ");
    var team = el("hqTeam");
    var teamKey = JSON.stringify([typeof state !== "undefined" ? state.office : "",
      list.map(function (x) { return [x.id, x.name, x.role, x.status]; })]);
    if (team && teamKey !== lastTeamKey) {
      lastTeamKey = teamKey;
      if (!list.length) blank(team, "呢個專案暫時冇 AI 員工。");
      else {
        team.replaceChildren();
        deptOrder.forEach(function (dept) {
          var group = list.filter(function (e) { return departmentMap[e.id] && departmentMap[e.id][0] === dept; });
          if(!group.length) return;
          var header=make("div","hq-dept-head");
          header.style.setProperty("--department",departmentMap[group[0].id][1]);
          header.appendChild(make("span","",dept));
          header.appendChild(make("small","",group.length+"人"));
          team.appendChild(header);
          group.forEach(function (e) {
            var card=personCard(e);
            card.style.setProperty("--department",departmentMap[e.id][1]);
            team.appendChild(card);
          });
        });
        list.filter(function (e) {return !departmentMap[e.id];}).forEach(function (e) {team.appendChild(personCard(e));});
      }
    }
    var taskList = el("hqTasks");
    if (taskList) {
      var order = { blocked: 0, review: 1, doing: 2, todo: 3, done: 4 };
      var active = tasks.filter(function (x) { return x.status !== "done"; })
        .slice().sort(function (a,b) { return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (b.updated || 0) - (a.updated || 0); })
        .slice(0,5);
      var taskKey = JSON.stringify(active.map(function (x) {
        var owner = employees.get(x.owner);
        return [x.id, x.title, x.status, x.owner, owner && owner.name];
      }));
      if (taskKey !== lastTaskKey) {
        lastTaskKey = taskKey;
        if (!active.length) blank(taskList, "目前冇待辦任務。喺任務板建立工作，先會開始執行。");
        else {
          taskList.replaceChildren();
          active.forEach(function (x) { taskList.appendChild(taskCard(x, employees)); });
        }
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
