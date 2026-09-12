#!/usr/bin/env node
"use strict";
// PostToolUse: читает JSON из stdin, не запускает команды из входных данных.
const fs = require("node:fs");
try {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  const file = input.tool_input?.file_path;
  if (
    typeof file === "string" &&
    /(?:^|\/)references\/(?:editorial-policy\/|sources\.json$)/.test(file)
  ) {
    console.log(
      JSON.stringify({
        systemMessage:
          "references/ изменена — запустите npm run build:simple-editor из корня, иначе плагин не увидит правки.",
      })
    );
  }
} catch (_) {
  // Ошибка входа хука не должна блокировать редактирование.
}
