#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UI = path.join(ROOT, "ui.html");
const REGISTRY = path.join(DATA, "sources.json");

// Единственный список источников — data/sources.json.
// Отсюда собираются и тексты для промпта, и список ссылок в интерфейсе плагина.
const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
const sources = registry.sources || [];
const rulesFile = registry.rulesFile || "svodnye-pravila-po-gruppam.md";

const missing = sources.filter((item) => !fs.existsSync(path.join(DATA, item.file)));
if (missing.length) {
  throw new Error(`Нет файлов в data/: ${missing.map((item) => item.file).join(", ")}`);
}

const rulesPath = path.join(DATA, rulesFile);
if (!fs.existsSync(rulesPath)) throw new Error(`Нет файла сводных правил data/${rulesFile}`);

const used = new Set([...sources.map((item) => item.file), rulesFile]);
const orphans = fs
  .readdirSync(DATA)
  .filter((name) => name.endsWith(".md") && !used.has(name));
if (orphans.length) console.warn("не используются в data/:", orphans.join(", "));

const bundled = {};
for (const item of sources) bundled[item.url] = fs.readFileSync(path.join(DATA, item.file), "utf8");

const meta = sources.map((item) => ({
  title: item.title,
  url: item.url,
  editorFocus: Boolean(item.editorFocus)
}));

const payload = [
  "const BUNDLED_SOURCES = " + JSON.stringify(meta) + ";",
  "const BUNDLED_SOURCE_TEXTS = " + JSON.stringify(bundled) + ";",
  "const BUNDLED_RULES = " + JSON.stringify(fs.readFileSync(rulesPath, "utf8")) + ";"
].join("\n");

const html = fs.readFileSync(UI, "utf8");
const start = "<!-- BUNDLED:START -->";
const end = "<!-- BUNDLED:END -->";
const from = html.indexOf(start);
const to = html.indexOf(end);
if (from === -1 || to === -1 || to < from) {
  throw new Error("В ui.html нет маркеров <!-- BUNDLED:START --> / <!-- BUNDLED:END -->");
}

const next =
  html.slice(0, from + start.length) +
  "\n<script>\n" +
  payload +
  "\n</script>\n" +
  html.slice(to);

fs.writeFileSync(UI, next);
console.log(
  "bundled:",
  sources.length,
  "sources,",
  meta.filter((item) => item.editorFocus).length,
  "focus,",
  Buffer.byteLength(payload, "utf8"),
  "bytes"
);
