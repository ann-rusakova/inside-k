#!/usr/bin/env node
"use strict";
// PostToolUse: читает JSON из stdin, не запускает команды из входных данных.
const fs = require("node:fs");
const path = require("node:path");

try {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  const file = input.tool_input?.file_path;
  if (typeof file !== "string") {
    process.exit(0);
  }

  const projectRoot = path.resolve(__dirname, "../..");
  const relativePath = path
    .relative(projectRoot, path.resolve(projectRoot, file.replaceAll("\\", "/")))
    .split(path.sep)
    .join("/");
  const isSkill = /^(?:\.agents|\.claude|\.cursor)\/skills\//.test(relativePath);
  const isReference = relativePath.startsWith("references/");
  if (isSkill || isReference) {
    console.log(
      JSON.stringify({
        systemMessage:
          "Скилл или справочник изменён — запустите npm run build:k-editor из корня, чтобы обновить Figma-плагин.",
      })
    );
  }
} catch (_) {
  // Ошибка входа хука не должна блокировать редактирование.
}
