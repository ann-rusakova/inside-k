# Inside K

Репозиторий отдела UX-исследований и редактуры Контура: сборник скиллов для Claude/Codex/Cursor
и Figma-плагинов для UX-редактуры текстов, а не самостоятельное приложение.

## Структура

- `.agents/skills/` — источник правды для скиллов. `.claude/skills` — симлинк на неё
  (`.claude/skills -> ../.agents/skills`), редактируй только оригинал в `.agents/`.
- `references/editorial-policy/` — общие файлы редполитики Контура (типографика, спорные слова, числа,
  названия), реестр источников — `references/sources.json` (на уровень выше). Единственный
  источник: на них ссылаются скиллы `only-editor`/`full-analysis-text`
  (по пути `../../../references/editorial-policy/...`) и Figma-плагины через сборщик
  `tools/update-content-simple-editor.js`, который читает их напрямую и вшивает в
  `plugins/simple-editor/ui.html`. Не дублируй эти файлы — добавляй новые правила только сюда,
  `npm run build:simple-editor` (из корня) подхватит их автоматически.
- `plugins/simple-editor/` — Figma-плагин «Просто редактор» (UX-редактура текста в макете,
  Claude/OpenAI API). Содержит только `code.js`/`manifest.json`/`ui.html` — ни данных, ни сборки
  внутри папки нет, всё вынесено наружу (`references/`, `tools/`). Документация — в
  [README.md](README.md#плагины), отдельного README в папке плагина нет.
- `tools/update-content-simple-editor.js` — сборщик базы знаний плагина, запускается через
  `npm run build:simple-editor` из корня.
- `SOUL.md` — тон и принципы работы отдела, не дублирует технические правила отсюда.

## Скиллы

Одна папка `.agents/skills/<name>/` = один `SKILL.md` (обязателен, без него скилл не грузится) +
опционально `references/`, `examples/`, `scripts/`, `assets/`.

- `name:` во фронтматтере должен совпадать с именем папки.
- `description:` пишется **для модели**, не для человека: явные триггер-фразы (рус + англ) и
  явное «НЕ используй для…», отделяющее скилл от соседних (см. существующие скиллы как образец).
- Один скилл — одна задача/категория. Если описание тянет в две стороны — это два скилла.
- Не переписывай в SKILL.md то, что модель и так знает — только специфика Контура/отдела и
  секция «Гоучи» (Gotchas): реальные грабли из практики, самый ценный раздел скилла.
- Общие справочные материалы, нужные нескольким скиллам, — в `references/` в корне репозитория
  (см. `references/editorial-policy/` ниже), не копия внутри каждого скилла.

Действующие скиллы: `design-guide`, `jtbd`, `qualitative-analysis-rules`, `survey`,
`only-editor`, `full-analysis-text`.

## Плагины (`plugins/simple-editor`)

- Сборка базы знаний в UI: `npm run build:simple-editor` из корня — обязательно после правки файлов в
  `references/editorial-policy/`, иначе изменения не попадут ни в промпт, ни в экран «Правила».
- Единый реестр источников — `references/sources.json`, не дублируй список руками.
- Ключи API (Anthropic/OpenAI) — только в `figma.clientStorage` пользователя, никогда не
  коммитить в репозиторий.

## Границы

- Не трогать `node_modules/`, `.env*` — они в `.gitignore`.
- `manifest.json` плагина: `networkAccess.allowedDomains` должен перечислять все домены, куда
  реально ходит код — не добавляй домены «про запас».
- Коммиты — conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`).
