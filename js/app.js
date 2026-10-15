var CONFIG = {
  // Куда отправлять заявку POST JSON {name, contact, source}.
  // Пусто — файл просто скачивается. Пример: адрес Google Apps Script или своего бота.
  leadEndpoint: "",
  telegram: "https://t.me/AI_Start_Course",
  instagram: "https://instagram.com/AI_Start_Course",
  tiktok: "https://www.tiktok.com/@AI_Start_Course"
};

var STORAGE_FAV = "aistart-risuy-favs";
var STORAGE_LEAD = "aistart-risuy-lead";

var state = {
  query: "",
  cat: "all",
  favOnly: false,
  favs: loadFavs(),
  tab: "one",
  cmdId: 1,
  topic: "",
  combo: [1, 2, 6],
  comboTopic: "Нейросети",
  ratio: "16:9",
  flags: { bigText: true, noErrors: true, examples: false },
  flagsTouched: false,
  quizIndex: 0,
  quizScore: 0,
  quizLocked: false,
  quizPicked: null,
  quizDone: false,
  quizMissed: []
};

function loadFavs() {
  try {
    var raw = JSON.parse(localStorage.getItem(STORAGE_FAV) || "[]");
    return raw.filter(function (id) { return !!findCommand(id); });
  } catch (e) {
    return [];
  }
}

function saveFavs() {
  try { localStorage.setItem(STORAGE_FAV, JSON.stringify(state.favs)); } catch (e) {}
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/ё/g, "е").trim();
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function catById(id) {
  return CATEGORIES.filter(function (c) { return c.id === id; })[0];
}

function toast(message) {
  var node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { node.classList.remove("show"); }, 1800);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  var area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  var ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  document.body.removeChild(area);
  return ok;
}

function currentFlags() {
  return {
    bigText: document.getElementById("flag-text").checked,
    noErrors: document.getElementById("flag-errors").checked,
    examples: document.getElementById("flag-examples").checked
  };
}

function activeTopic(cmd) {
  var typed = document.getElementById("studio-topic").value.trim();
  return typed || cmd.example;
}

function init() {
  applyLinks();
  renderChips();
  renderCatalog();
  renderStudioSelects();
  renderComboList();
  applyCommandDefaults(findCommand(state.cmdId), true);
  updatePreview();
  renderQuiz();
  restoreLead();
  bind();
  syncHeader();
  var hash = location.hash.replace("#", "");
  if (hash.indexOf("cmd-") === 0) {
    openInStudio(Number(hash.slice(4)), false);
  }
}

function applyLinks() {
  document.querySelectorAll("[data-link]").forEach(function (link) {
    var key = link.getAttribute("data-link");
    if (CONFIG[key]) link.href = CONFIG[key];
  });
}

function syncHeader() {
  var header = document.querySelector(".top");
  if (!header) return;
  document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
}

function renderChips() {
  var html = '<button class="chip" type="button" data-cat="all" aria-pressed="true">Все 50</button>';
  html += '<button class="chip" type="button" data-cat="fav" aria-pressed="false">Избранное <span id="fav-count">0</span></button>';
  CATEGORIES.forEach(function (cat) {
    html += '<button class="chip" type="button" data-cat="' + cat.id + '" aria-pressed="false">' + esc(cat.chip) + "</button>";
  });
  document.getElementById("chips").innerHTML = html;
  updateFavCount();
}

function renderCatalog() {
  var html = "";
  CATEGORIES.forEach(function (cat) {
    var items = COMMANDS.filter(function (c) { return c.cat === cat.id; });
    html += '<section class="group" id="cat-' + cat.id + '" data-group="' + cat.id + '">';
    html += '<header class="group-head"><h3><span>' + cat.num + "</span>" + esc(cat.title) + "</h3>";
    html += '<p>' + esc(cat.lead) + "</p></header>";
    html += '<div class="grid">';
    items.forEach(function (cmd) { html += cardHtml(cmd); });
    html += "</div></section>";
  });
  document.getElementById("catalog-root").innerHTML = html;
}

function cardHtml(cmd) {
  var loved = state.favs.indexOf(cmd.id) !== -1;
  return '' +
    '<article class="card" id="cmd-' + cmd.id + '" data-id="' + cmd.id + '" data-cat="' + cmd.cat + '" data-search="' + esc(norm(cmd.cmd + " " + cmd.title + " " + cmd.desc + " " + cmd.example + " " + cmd.keys)) + '">' +
      '<div class="card-top"><span class="num">' + String(cmd.id).padStart(2, "0") + "</span>" +
      '<button class="star" type="button" data-fav="' + cmd.id + '" aria-pressed="' + loved + '" aria-label="В избранное: ' + esc(cmd.title) + '">' + starSvg() + "</button></div>" +
      '<h4>' + esc(cmd.title) + "</h4>" +
      '<p>' + esc(cmd.desc) + "</p>" +
      '<button class="cmd-line" type="button" data-copy-short="' + cmd.id + '"><span>' + esc(shortCommand(cmd)) + '</span><em>копировать</em></button>' +
      '<div class="card-actions">' +
        '<button class="btn btn-ghost" type="button" data-copy-full="' + cmd.id + '">Полный промпт</button>' +
        '<button class="btn btn-link" type="button" data-open="' + cmd.id + '">В конструктор</button>' +
      "</div></article>";
}

function starSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.4 5.4 5.9.6-4.4 3.9 1.3 5.8L12 16.8 6.8 19.9l1.3-5.8L3.7 9.2l5.9-.6L12 3.2z"/></svg>';
}

function updateFavCount() {
  var node = document.getElementById("fav-count");
  if (node) node.textContent = String(state.favs.length);
  document.querySelectorAll("[data-fav]").forEach(function (btn) {
    var id = Number(btn.getAttribute("data-fav"));
    var on = state.favs.indexOf(id) !== -1;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function renderStudioSelects() {
  var catSelect = document.getElementById("studio-cat");
  catSelect.innerHTML = CATEGORIES.map(function (cat) {
    return '<option value="' + cat.id + '">' + cat.num + "  " + esc(cat.title) + "</option>";
  }).join("");
  fillCommandSelect();
}

function fillCommandSelect() {
  var cat = document.getElementById("studio-cat").value || "study";
  var select = document.getElementById("studio-cmd");
  var items = COMMANDS.filter(function (c) { return c.cat === cat; });
  select.innerHTML = items.map(function (cmd) {
    return '<option value="' + cmd.id + '">' + esc(cmd.cmd + "  " + cmd.title) + "</option>";
  }).join("");
  if (!items.some(function (c) { return c.id === state.cmdId; })) {
    state.cmdId = items[0].id;
  }
  select.value = String(state.cmdId);
}

function renderComboList() {
  var html = "";
  CATEGORIES.forEach(function (cat) {
    html += '<p class="combo-label">' + esc(cat.chip) + "</p>";
    COMMANDS.filter(function (c) { return c.cat === cat.id; }).forEach(function (cmd) {
      var on = state.combo.indexOf(cmd.id) !== -1;
      html += '<button type="button" class="combo-item" data-combo="' + cmd.id + '" aria-pressed="' + on + '"><b>' + esc(cmd.cmd) + "</b> " + esc(cmd.title) + "</button>";
    });
  });
  document.getElementById("combo-list").innerHTML = html;
}

function applyCommandDefaults(cmd, force) {
  if (state.flagsTouched && !force) return;
  document.getElementById("flag-text").checked = !!cmd.text;
  document.getElementById("flag-examples").checked = !!cmd.text;
  document.getElementById("flag-errors").checked = true;
  var topic = document.getElementById("studio-topic");
  topic.placeholder = "Например: " + cmd.example;
}

function updatePreview() {
  var cmd = findCommand(state.cmdId);
  var flags = currentFlags();
  var topic = activeTopic(cmd);
  var text = state.tab === "combo"
    ? comboText()
    : buildPrompt(cmd, topic, state.ratio, flags);
  document.getElementById("live-preview").textContent = text || "Выберите хотя бы одну команду.";
  var label = document.getElementById("preview-kicker");
  if (state.tab === "combo") {
    var picked = state.combo.map(findCommand).filter(Boolean);
    label.textContent = picked.length ? picked.map(function (c) { return c.cmd; }).join(" + ") : "Комбинация";
  } else {
    label.textContent = "Готовый промпт";
  }
  document.getElementById("copy-live").disabled = !text;
}

function comboText() {
  var list = state.combo.map(findCommand).filter(Boolean);
  var topic = document.getElementById("combo-topic").value.trim() || "Нейросети";
  return buildCombo(list, topic, state.ratio, currentFlags());
}

function setTab(tab) {
  state.tab = tab;
  document.getElementById("panel-one").hidden = tab !== "one";
  document.getElementById("panel-combo").hidden = tab !== "combo";
  document.getElementById("tab-one").setAttribute("aria-selected", tab === "one" ? "true" : "false");
  document.getElementById("tab-combo").setAttribute("aria-selected", tab === "combo" ? "true" : "false");
  updatePreview();
}

function openInStudio(id, scroll) {
  var cmd = findCommand(id);
  if (!cmd) return;
  state.cmdId = cmd.id;
  state.flagsTouched = false;
  document.getElementById("studio-cat").value = cmd.cat;
  fillCommandSelect();
  document.getElementById("studio-cmd").value = String(cmd.id);
  document.getElementById("studio-topic").value = "";
  applyCommandDefaults(cmd, true);
  setTab("one");
  updatePreview();
  if (scroll !== false) {
    document.getElementById("studio").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function filterCatalog() {
  var q = norm(state.query);
  var shown = 0;
  document.querySelectorAll(".group").forEach(function (group) {
    var visible = 0;
    group.querySelectorAll(".card").forEach(function (card) {
      var catOk = state.cat === "all" || card.getAttribute("data-cat") === state.cat;
      var favOk = !state.favOnly || state.favs.indexOf(Number(card.getAttribute("data-id"))) !== -1;
      var textOk = !q || card.getAttribute("data-search").indexOf(q) !== -1;
      var ok = catOk && favOk && textOk;
      card.hidden = !ok;
      if (ok) visible += 1;
    });
    group.hidden = visible === 0;
    shown += visible;
  });
  var meta = document.getElementById("result-meta");
  meta.textContent = shown ? "Показано " + shown + " из 50" : "Ничего не нашлось";
  document.getElementById("empty").hidden = shown !== 0;
}

function setCategory(cat) {
  state.favOnly = cat === "fav";
  state.cat = cat === "fav" ? "all" : cat;
  document.querySelectorAll("#chips .chip").forEach(function (chip) {
    chip.setAttribute("aria-pressed", chip.getAttribute("data-cat") === cat ? "true" : "false");
  });
  filterCatalog();
}

function renderQuiz() {
  var root = document.getElementById("quiz-root");
  if (state.quizDone) {
    root.innerHTML = quizResultHtml();
    return;
  }
  var item = QUIZ[state.quizIndex];
  var html = '<div class="quiz-top"><span>Вопрос ' + (state.quizIndex + 1) + " / " + QUIZ.length + '</span><b>Счёт ' + state.quizScore + "</b></div>";
  html += '<div class="bar"><i style="width:' + Math.round((state.quizIndex / QUIZ.length) * 100) + '%"></i></div>';
  html += "<h3>" + esc(item.q) + "</h3>";
  html += '<div class="options" role="group" aria-label="Варианты команд">';
  item.options.forEach(function (id, index) {
    var cmd = findCommand(id);
    html += '<button type="button" class="opt" data-pick="' + id + '"><em>' + (index + 1) + '</em><span><b>' + esc(cmd.cmd) + "</b> " + esc(cmd.title) + "</span></button>";
  });
  html += "</div>";
  html += '<p class="why" id="quiz-why" hidden></p>';
  html += '<button class="btn btn-primary" type="button" id="quiz-next" hidden>Дальше</button>';
  root.innerHTML = html;
}

function quizResultHtml() {
  var total = QUIZ.length;
  var title = "База уже есть. Откройте режимы, которые не узнались с первого раза.";
  if (state.quizScore === total) title = "Вы уже думаете режимами, а не просьбой «нарисуй».";
  else if (state.quizScore < 5) title = "Команды новые — для этого и нужна шпаргалка. Не обязательно держать все 50 в голове.";
  var html = '<p class="score"><b>' + state.quizScore + "</b><span>из " + total + "</span></p>";
  html += "<h3>" + esc(title) + "</h3>";
  if (state.quizMissed.length) {
    html += "<ul class=\"missed\">";
    state.quizMissed.forEach(function (row) {
      html += "<li><button type=\"button\" data-open=\"" + row.id + "\">" + esc(row.cmd) + "</button> " + esc(row.title) + "</li>";
    });
    html += "</ul>";
  }
  html += '<div class="card-actions"><button class="btn btn-primary" type="button" id="quiz-restart">Пройти ещё раз</button><a class="btn btn-ghost" href="#catalog">К командам</a></div>';
  return html;
}

function pickQuiz(id) {
  if (state.quizLocked || state.quizDone) return;
  var item = QUIZ[state.quizIndex];
  state.quizLocked = true;
  state.quizPicked = id;
  if (id === item.correct) state.quizScore += 1;
  else state.quizMissed.push(findCommand(item.correct));
  document.querySelectorAll(".opt").forEach(function (btn) {
    var bid = Number(btn.getAttribute("data-pick"));
    btn.disabled = true;
    if (bid === item.correct) btn.classList.add("correct");
    else if (bid === id) btn.classList.add("wrong");
  });
  var why = document.getElementById("quiz-why");
  why.hidden = false;
  why.textContent = (id === item.correct ? "Верно. " : "Мимо. ") + item.why;
  var next = document.getElementById("quiz-next");
  next.hidden = false;
  next.textContent = state.quizIndex === QUIZ.length - 1 ? "Показать результат" : "Дальше";
  next.focus();
}

function nextQuiz() {
  if (state.quizIndex === QUIZ.length - 1) {
    state.quizDone = true;
  } else {
    state.quizIndex += 1;
    state.quizLocked = false;
    state.quizPicked = null;
  }
  renderQuiz();
}

function restartQuiz() {
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizLocked = false;
  state.quizPicked = null;
  state.quizDone = false;
  state.quizMissed = [];
  renderQuiz();
}

function validName(value) {
  return value.trim().length >= 2;
}

function validContact(value) {
  var s = value.trim();
  if (/^@[a-zA-Z0-9_]{3,}$/.test(s)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return true;
  if (/^\+?[\d\s()-]{10,}$/.test(s)) return true;
  if (/t\.me\//i.test(s)) return true;
  return false;
}

function downloadPack(name, contact) {
  var text = buildPack(name, contact);
  var blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "Рисуй-командой-50-команд-ChatGPT.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  return text;
}

function showLeadSuccess(name, text) {
  document.getElementById("lead-form").hidden = true;
  var box = document.getElementById("lead-success");
  box.hidden = false;
  document.getElementById("lead-hello").textContent = name + ", шпаргалка собрана.";
  document.getElementById("lead-text").textContent = text;
}

function restoreLead() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_LEAD) || "null");
    if (!saved || !saved.name) return;
    document.getElementById("lead-name").value = saved.name;
    document.getElementById("lead-contact").value = saved.contact || "";
  } catch (e) {}
}

function bind() {
  document.getElementById("chips").addEventListener("click", function (event) {
    var chip = event.target.closest("[data-cat]");
    if (!chip) return;
    setCategory(chip.getAttribute("data-cat"));
  });

  document.getElementById("search").addEventListener("input", function (event) {
    state.query = event.target.value;
    filterCatalog();
  });

  document.getElementById("catalog-root").addEventListener("click", onCatalogClick);
  document.getElementById("quiz-root").addEventListener("click", onQuizClick);

  document.getElementById("tab-one").addEventListener("click", function () { setTab("one"); });
  document.getElementById("tab-combo").addEventListener("click", function () { setTab("combo"); });

  document.getElementById("studio-cat").addEventListener("change", function () {
    var items = COMMANDS.filter(function (c) { return c.cat === document.getElementById("studio-cat").value; });
    state.cmdId = items[0].id;
    state.flagsTouched = false;
    fillCommandSelect();
    applyCommandDefaults(items[0], true);
    updatePreview();
  });

  document.getElementById("studio-cmd").addEventListener("change", function (event) {
    state.cmdId = Number(event.target.value);
    state.flagsTouched = false;
    applyCommandDefaults(findCommand(state.cmdId), true);
    updatePreview();
  });

  ["studio-topic", "combo-topic"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", updatePreview);
  });

  document.querySelectorAll("[data-ratio]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.ratio = btn.getAttribute("data-ratio");
      document.querySelectorAll("[data-ratio]").forEach(function (other) {
        other.setAttribute("aria-pressed", other === btn ? "true" : "false");
      });
      updatePreview();
    });
  });

  ["flag-text", "flag-errors", "flag-examples"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", function () {
      state.flagsTouched = true;
      updatePreview();
    });
  });

  document.getElementById("combo-list").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-combo]");
    if (!btn) return;
    var id = Number(btn.getAttribute("data-combo"));
    var index = state.combo.indexOf(id);
    if (index !== -1) state.combo.splice(index, 1);
    else if (state.combo.length >= 3) {
      toast("В комбинации уже три режима");
      return;
    } else state.combo.push(id);
    btn.setAttribute("aria-pressed", state.combo.indexOf(id) !== -1 ? "true" : "false");
    updatePreview();
  });

  document.getElementById("combo-preset").addEventListener("click", function () {
    state.combo = [1, 2, 6];
    document.getElementById("combo-topic").value = "Нейросети";
    renderComboList();
    setTab("combo");
    updatePreview();
    document.getElementById("studio").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("copy-live").addEventListener("click", function () {
    var text = document.getElementById("live-preview").textContent;
    copyText(text).then(function (ok) { toast(ok ? "Промпт скопирован" : "Не удалось скопировать"); });
  });

  document.getElementById("copy-sample").addEventListener("click", function () {
    copyText(document.getElementById("sample-hand").textContent.trim()).then(function (ok) {
      toast(ok ? "Пример скопирован" : "Не удалось скопировать");
    });
  });

  document.getElementById("copy-visible").addEventListener("click", function () {
    var lines = [];
    document.querySelectorAll(".card:not([hidden])").forEach(function (card) {
      var cmd = findCommand(Number(card.getAttribute("data-id")));
      lines.push(cmd.id + ". " + shortCommand(cmd) + " — " + cmd.title);
    });
    if (!lines.length) {
      toast("Сначала найдите хотя бы одну команду");
      return;
    }
    copyText(lines.join("\n")).then(function (ok) {
      toast(ok ? "Список скопирован" : "Не удалось скопировать");
    });
  });

  document.getElementById("random-cmd").addEventListener("click", function () {
    var pool = Array.prototype.filter.call(document.querySelectorAll(".card"), function (card) { return !card.hidden; });
    if (!pool.length) return;
    var card = pool[Math.floor(Math.random() * pool.length)];
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
  });

  document.getElementById("reset-filters").addEventListener("click", function () {
    state.query = "";
    document.getElementById("search").value = "";
    setCategory("all");
    document.getElementById("search").focus();
  });

  document.getElementById("lead-form").addEventListener("submit", onLead);

  document.getElementById("lead-again").addEventListener("click", function () {
    var name = document.getElementById("lead-name").value.trim();
    var contact = document.getElementById("lead-contact").value.trim();
    var text = downloadPack(name, contact);
    document.getElementById("lead-text").textContent = text;
    toast("Файл скачан ещё раз");
  });

  document.getElementById("copy-pack").addEventListener("click", function () {
    copyText(document.getElementById("lead-text").textContent).then(function (ok) {
      toast(ok ? "Шпаргалка скопирована" : "Не удалось скопировать");
    });
  });

  document.addEventListener("keydown", function (event) {
    var tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (event.target && event.target.isContentEditable)) return;
    if (event.key === "/") {
      event.preventDefault();
      document.getElementById("search").focus();
    }
    if (!state.quizDone && !state.quizLocked && ["1", "2", "3", "4"].indexOf(event.key) !== -1) {
      var item = QUIZ[state.quizIndex];
      if (!item) return;
      var option = item.options[Number(event.key) - 1];
      if (option) pickQuiz(option);
    }
  });

  window.addEventListener("resize", syncHeader);
}

function onCatalogClick(event) {
  var fav = event.target.closest("[data-fav]");
  if (fav) {
    var id = Number(fav.getAttribute("data-fav"));
    var index = state.favs.indexOf(id);
    if (index === -1) state.favs.push(id);
    else state.favs.splice(index, 1);
    saveFavs();
    updateFavCount();
    if (state.favOnly) filterCatalog();
    return;
  }
  var shortBtn = event.target.closest("[data-copy-short]");
  if (shortBtn) {
    var cmd = findCommand(Number(shortBtn.getAttribute("data-copy-short")));
    copyText(shortCommand(cmd)).then(function (ok) { toast(ok ? "Команда скопирована" : "Не удалось скопировать"); });
    return;
  }
  var fullBtn = event.target.closest("[data-copy-full]");
  if (fullBtn) {
    var full = findCommand(Number(fullBtn.getAttribute("data-copy-full")));
    var prompt = buildPrompt(full, full.example, "16:9", { bigText: !!full.text, noErrors: true, examples: !!full.text });
    copyText(prompt).then(function (ok) { toast(ok ? "Полный промпт скопирован" : "Не удалось скопировать"); });
    return;
  }
  var open = event.target.closest("[data-open]");
  if (open) openInStudio(Number(open.getAttribute("data-open")));
}

function onQuizClick(event) {
  var pick = event.target.closest("[data-pick]");
  if (pick) {
    pickQuiz(Number(pick.getAttribute("data-pick")));
    return;
  }
  if (event.target.closest("#quiz-next")) nextQuiz();
  if (event.target.closest("#quiz-restart")) restartQuiz();
  var open = event.target.closest("[data-open]");
  if (open) openInStudio(Number(open.getAttribute("data-open")));
}

function onLead(event) {
  event.preventDefault();
  var name = document.getElementById("lead-name").value.trim();
  var contact = document.getElementById("lead-contact").value.trim();
  var nameErr = document.getElementById("err-name");
  var contactErr = document.getElementById("err-contact");
  var okName = validName(name);
  var okContact = validContact(contact);
  nameErr.hidden = okName;
  contactErr.hidden = okContact;
  if (!okName || !okContact) return;
  var text = downloadPack(name, contact);
  try {
    localStorage.setItem(STORAGE_LEAD, JSON.stringify({ name: name, contact: contact }));
  } catch (e) {}
  if (CONFIG.leadEndpoint) {
    fetch(CONFIG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, contact: contact, source: "risuy-komandoy" })
    }).catch(function () {});
  }
  showLeadSuccess(name, text);
  toast("Файл скачан");
}

document.addEventListener("DOMContentLoaded", init);
