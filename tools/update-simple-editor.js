#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");

async function main() {
  const ROOT = __dirname;
  const REFERENCES = path.join(ROOT, "..", "references");
  const DATA = path.join(REFERENCES, "editorial-policy");
  const UI = path.join(ROOT, "..", "figma-plugins", "simple-editor", "ui.html");
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
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Нет файла сводных правил references/editorial-policy/${rulesFile}`);
  }

  const used = new Set([...sources.map((item) => item.file), rulesFile]);
  const orphans = fs.readdirSync(DATA).filter((name) => name.endsWith(".md") && !used.has(name));
  if (orphans.length) {
    throw new Error(`Не используются в references/editorial-policy/: ${orphans.join(", ")}`);
  }

  const bundled = {};
  for (const item of sources) {
    bundled[item.url] = fs.readFileSync(path.join(DATA, item.file), "utf8");
  }

  const meta = sources.map((item) => ({
    title: item.title,
    url: item.url,
    editorFocus: Boolean(item.editorFocus),
  }));

  // Инструкции берём напрямую из скиллов; ссылки раскрываем в промпте из общей базы.
  const skills = {};
  for (const name of ["only-editor", "full-analysis-text"]) {
    const skillPath = path.join(ROOT, "..", ".agents", "skills", name, "SKILL.md");
    const raw = fs.readFileSync(skillPath, "utf8");
    const instructions = raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
    if (!instructions) {
      throw new Error(`Пустой скилл: ${name}`);
    }
    const references = [];
    const seen = new Set();
    for (const match of instructions.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
      const link = match[1];
      if (seen.has(link)) {
        continue;
      }
      seen.add(link);
      const resolved = path.resolve(path.dirname(skillPath), link);
      const source = sources.find((item) => path.join(DATA, item.file) === resolved);
      if (!source && resolved !== rulesPath) {
        throw new Error(`Источник скилла ${name} отсутствует в references/sources.json: ${link}`);
      }
      references.push({ path: link, url: source ? source.url : null });
    }
    skills[name] = { instructions, references };
  }

  // JSON помещается в HTML script: буквальный </script> в правиле не должен закрывать тег.
  const inlineJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
  const payload = [
    "const BUNDLED_SOURCES = " + inlineJson(meta) + ";",
    "const BUNDLED_SOURCE_TEXTS = " + inlineJson(bundled) + ";",
    "const BUNDLED_SKILLS = " + inlineJson(skills) + ";",
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

  verifyPlugin(next);

  if (process.argv.includes("--check")) {
    if (html !== next) {
      throw new Error("База знаний устарела. Запустите npm run build:simple-editor.");
    }
  } else if (html !== next) {
    fs.writeFileSync(UI, next);
  }
  console.log(
    process.argv.includes("--check")
      ? "Figma-плагин актуален, проверки прошли."
      : "Figma-плагин собран, проверки прошли. Перезапустите плагин в Figma."
  );
}

function verifyPlugin(html) {
  const pluginDirectory = path.join(root, "figma-plugins", "simple-editor");
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginDirectory, "manifest.json"), "utf8"));
  assert.equal(manifest.main, "code.js", "Неверная точка входа Figma-плагина");
  assert.equal(manifest.ui, "ui.html", "Неверный путь к UI Figma-плагина");
  assert.ok(fs.existsSync(path.join(pluginDirectory, manifest.ui)));
  new vm.Script(fs.readFileSync(path.join(pluginDirectory, manifest.main), "utf8"));
  function check(label, run) {
    try {
      run();
    } catch (error) {
      throw new Error(`Проверка не пройдена: ${label}`, { cause: error });
    }
  }
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  for (const script of scripts) {
    new vm.Script(script);
  }
  const app = scripts.at(-1);

  function section(start, end) {
    const from = app.indexOf(start);
    const to = app.indexOf(end, from);
    assert.ok(from >= 0 && to > from);
    return app.slice(from, to);
  }

  function runtime() {
    const context = vm.createContext({
      state: { settings: { endpoint: "claude", apiUrl: "", model: "test", manualRulesText: "" } },
      neighbourContext: () => "",
      clipText: (text, limit) => text.slice(0, limit),
    });
    vm.runInContext(scripts[0], context);
    vm.runInContext("globalThis.skills = BUNDLED_SKILLS", context);
    vm.runInContext(
      section("function buildSystemBlocks(", "function neighbourContext(") +
        section("function cacheContext(", "function checkCacheKey("),
      context
    );
    return context;
  }

  check("bundle preserves both skill bodies and resolves all linked editorial files", () => {
    const context = runtime();
    for (const name of ["only-editor", "full-analysis-text"]) {
      const filename = path.join(root, ".agents/skills", name, "SKILL.md");
      const raw = fs.readFileSync(filename, "utf8");
      const expected = raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
      assert.equal(context.skills[name].instructions, expected);
      const links = [...expected.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map(
        (match) => match[1]
      );
      assert.deepEqual(
        Array.from(context.skills[name].references, (ref) => ref.path),
        [...new Set(links)]
      );
      const prompt = context.buildSystemBlocks(
        name === "only-editor" ? "editor" : "full",
        "check"
      )[0].text;
      for (const link of links) {
        const source = fs.readFileSync(path.resolve(path.dirname(filename), link), "utf8");
        assert.ok(prompt.includes(source), `Missing complete source: ${link}`);
      }
    }
  });

  check("variant generation and checks receive the selected skill and JSON adapter", () => {
    const context = runtime();
    for (const [scope, task, name] of [
      [undefined, undefined, "only-editor"],
      ["editor", "check", "only-editor"],
      ["full", "check", "full-analysis-text"],
    ]) {
      const prompt = context.buildSystemBlocks(scope, task)[0].text;
      assert.ok(prompt.includes(context.skills[name].instructions));
      const other = name === "only-editor" ? "full-analysis-text" : "only-editor";
      assert.ok(!prompt.includes(context.skills[other].instructions));
      assert.ok(prompt.includes("верни только JSON"));
      assert.ok(!prompt.includes("ТОЛЬКО пунктуацию"));
    }
    assert.equal(
      (app.match(/callModel\(buildSystemBlocks\(\), user, VARIANTS_SCHEMA\)/g) || []).length,
      2
    );
    assert.ok(app.includes('buildSystemBlocks(scope, "check"), user, CHECK_SCHEMA'));
    assert.ok(app.includes('buildSystemBlocks(scope, "check"), user, FRAME_SCHEMA'));
  });

  check("changing skill instructions invalidates cached model results", () => {
    const context = runtime();
    const before = context.cacheContext();
    context.skills["only-editor"].instructions += "\nНовое правило.";
    assert.notEqual(context.cacheContext(), before);
  });
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause) {
    console.error(error.cause.message);
  }
  process.exitCode = 1;
});
