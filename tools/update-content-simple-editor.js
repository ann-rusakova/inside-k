#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

async function main() {
  const ROOT = __dirname;
  const REFERENCES = path.join(ROOT, "..", "references");
  const DATA = path.join(REFERENCES, "editorial-policy");
  const UI = path.join(ROOT, "..", "plugins", "simple-editor", "ui.html");
  const REGISTRY = path.join(REFERENCES, "sources.json");

  // Единственный список источников — references/sources.json.
  // Отсюда собираются и тексты для промпта, и список ссылок в интерфейсе плагина.
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const sources = registry.sources;
  const rulesFile = registry.rulesFile;
  const validFile = (file) =>
    typeof file === "string" && path.basename(file) === file && file.endsWith(".md");
  if (!Array.isArray(sources) || !sources.length || !validFile(rulesFile)) {
    throw new Error("Некорректный реестр references/sources.json");
  }
  const urls = new Set();
  const files = new Set();
  for (const item of sources) {
    if (
      !item ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      !validFile(item.file) ||
      typeof item.url !== "string" ||
      !URL.canParse(item.url) ||
      new URL(item.url).protocol !== "https:" ||
      (item.editorFocus !== undefined && typeof item.editorFocus !== "boolean") ||
      urls.has(item.url) ||
      files.has(item.file)
    ) {
      throw new Error("Некорректный или повторяющийся источник в references/sources.json");
    }
    urls.add(item.url);
    files.add(item.file);
  }

  const missing = sources.filter((item) => !fs.existsSync(path.join(DATA, item.file)));
  if (missing.length) {
    throw new Error(
      `Нет файлов в references/editorial-policy/: ${missing.map((item) => item.file).join(", ")}`
    );
  }

  const rulesPath = path.join(DATA, rulesFile);
  if (!fs.existsSync(rulesPath))
    throw new Error(`Нет файла сводных правил references/editorial-policy/${rulesFile}`);

  const used = new Set([...sources.map((item) => item.file), rulesFile]);
  const orphans = fs.readdirSync(DATA).filter((name) => name.endsWith(".md") && !used.has(name));
  if (orphans.length)
    throw new Error(`Не используются в references/editorial-policy/: ${orphans.join(", ")}`);

  const bundled = {};
  for (const item of sources)
    bundled[item.url] = fs.readFileSync(path.join(DATA, item.file), "utf8");

  const meta = sources.map((item) => ({
    title: item.title,
    url: item.url,
    editorFocus: Boolean(item.editorFocus),
  }));

  // JSON помещается в HTML script: буквальный </script> в правиле не должен закрывать тег.
  const inlineJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
  const payload = [
    "const BUNDLED_SOURCES = " + inlineJson(meta) + ";",
    "const BUNDLED_SOURCE_TEXTS = " + inlineJson(bundled) + ";",
    "const BUNDLED_RULES = " + inlineJson(fs.readFileSync(rulesPath, "utf8")) + ";",
  ].join("\n");

  const html = fs.readFileSync(UI, "utf8");
  const start = "<!-- BUNDLED:START -->";
  const end = "<!-- BUNDLED:END -->";
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (
    from === -1 ||
    to === -1 ||
    to < from ||
    html.indexOf(start, from + 1) !== -1 ||
    html.indexOf(end, to + 1) !== -1
  ) {
    throw new Error("В ui.html нет маркеров <!-- BUNDLED:START --> / <!-- BUNDLED:END -->");
  }

  const generated =
    html.slice(0, from + start.length) +
    "\n<script>\n" +
    payload +
    "\n</script>\n" +
    html.slice(to);

  const options = await prettier.resolveConfig(UI);
  const next = await prettier.format(generated, { ...options, filepath: UI });

  if (process.argv.includes("--check")) {
    if (html !== next)
      throw new Error("База знаний устарела. Запустите npm run build:simple-editor.");
  } else if (html !== next) fs.writeFileSync(UI, next);
  console.log(
    "bundled:",
    sources.length,
    "sources,",
    meta.filter((item) => item.editorFocus).length,
    "focus,",
    Buffer.byteLength(payload, "utf8"),
    "bytes"
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
