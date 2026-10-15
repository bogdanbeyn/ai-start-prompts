function buildPrompt(cmd, topic, ratio, flags) {
  var lines = [];
  lines.push(cmd.cmd + " " + topic);
  lines.push("");
  lines.push(cmd.intro);
  lines.push("");
  lines.push("Требования:");
  lines.push("");
  lines.push("• Формат изображения: " + ratio + ".");
  cmd.look.forEach(function (line) {
    lines.push("• " + line);
  });
  if (flags.bigText && !hasLook(cmd, "крупн")) {
    lines.push("• Текст должен быть крупным и читаемым.");
  }
  if (flags.examples && !hasLook(cmd, "определен")) {
    lines.push("• Включи определения, примеры и основные выводы.");
  }
  if (flags.noErrors && !hasLook(cmd, "орфограф")) {
    lines.push("• Не допускай фактических и орфографических ошибок.");
  }
  return lines.join("\n");
}

function buildCombo(list, topic, ratio, flags) {
  if (!list.length) return "";
  var lines = [];
  lines.push(list.map(function (c) { return c.cmd; }).join(" + ") + " " + topic);
  lines.push("");
  lines.push("Создай один цельный визуальный материал на русском языке. Совмести форматы в одной работе, а не отдельными картинками.");
  lines.push("");
  list.forEach(function (c, i) {
    lines.push((i + 1) + ". " + c.cmd + " — " + c.title + ". " + c.desc);
  });
  lines.push("");
  lines.push("Тема: " + topic + ".");
  lines.push("");
  lines.push("Требования:");
  lines.push("");
  lines.push("• Формат изображения: " + ratio + ".");
  if (flags.bigText) lines.push("• Текст должен быть крупным и читаемым.");
  if (flags.examples) lines.push("• Включи определения, примеры и основные выводы.");
  if (flags.noErrors) lines.push("• Не допускай фактических и орфографических ошибок.");
  lines.push("• Каждый выбранный режим должен быть заметен, и вместе они читаются как один учебный материал.");
  return lines.join("\n");
}

function shortCommand(cmd, topic) {
  return cmd.cmd + " " + (topic || cmd.example);
}

function buildPack(name, contact) {
  var lines = [];
  lines.push("РИСУЙ КОМАНДОЙ");
  lines.push("50 визуальных команд для ChatGPT");
  lines.push("AI-Старт · @AI_Start_Course");
  lines.push("");
  if (name) lines.push("Для: " + name);
  if (contact) lines.push("Контакт: " + contact);
  lines.push("");
  lines.push("ВАЖНЫЙ МОМЕНТ");
  lines.push("Команды вроде /handwritten — это условные названия визуальных режимов, а не универсальные встроенные функции ChatGPT. Чтобы получить предсказуемый результат, добавьте к команде описание желаемого оформления. Ниже у каждой команды есть короткий пример и полный промпт.");
  lines.push("");
  CATEGORIES.forEach(function (cat) {
    var items = COMMANDS.filter(function (c) { return c.cat === cat.id; });
    lines.push("------------------------------------------------------------");
    lines.push(cat.num + ". " + cat.title.toUpperCase());
    lines.push(cat.lead);
    lines.push("");
    items.forEach(function (cmd) {
      var flags = { bigText: !!cmd.text, noErrors: true, examples: !!cmd.text };
      lines.push(cmd.id + ". " + cmd.cmd + " — " + cmd.title);
      lines.push(cmd.desc);
      lines.push("");
      lines.push("Пример:");
      lines.push(shortCommand(cmd));
      lines.push("");
      lines.push("Полный промпт:");
      lines.push(buildPrompt(cmd, cmd.example, "16:9", flags));
      lines.push("");
    });
  });
  lines.push("------------------------------------------------------------");
  lines.push("КАК ПОЛУЧАТЬ БОЛЕЕ ТОЧНЫЙ РЕЗУЛЬТАТ");
  lines.push("");
  lines.push("Короткая команда задаёт направление. Если добавить к ней параметры, результат становится точнее.");
  lines.push("Вместо «/handwritten Нейросети» используйте расширенный вариант:");
  lines.push("");
  lines.push(buildPrompt(COMMANDS[0], "Нейросети", "16:9", { bigText: true, noErrors: true, examples: true }));
  lines.push("");
  lines.push("КОМБИНАЦИИ");
  lines.push("Команды можно соединять. Например: /handwritten + /mindmap + /infographic.");
  lines.push("Так получается учебный конспект, в котором одновременно есть интеллект-карта, иллюстрации и пояснения.");
  lines.push("Комбинации нескольких форматов дают более интересный материал, чем обычная генерация картинки по одной теме.");
  lines.push("");
  lines.push(buildCombo([COMMANDS[0], COMMANDS[1], COMMANDS[5]], "Нейросети", "16:9", { bigText: true, noErrors: true, examples: true }));
  lines.push("");
  lines.push("AI-Старт · Instagram, Telegram, TikTok: @AI_Start_Course");
  return lines.join("\n");
}

function hasLook(cmd, needle) {
  return cmd.look.some(function (line) {
    return line.toLowerCase().indexOf(needle) !== -1;
  });
}

function findCommand(id) {
  return COMMANDS.filter(function (c) { return c.id === id; })[0];
}
