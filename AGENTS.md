# Inside K

Репозиторий отдела UX-исследований и редактуры Контура. Здесь лежат скиллы для Claude Code, Codex и
Cursor и Figma-плагин «Просто редактор». Отдельного приложения нет.

## Структура

- `.agents/skills/` — исходники скиллов. `.claude/skills` и `.cursor/skills` — симлинки на
  `../.agents/skills`. Правь только `.agents/`.
- `references/editorial-policy/` — правила редполитики Контура по типографике, словам, числам и названиям.
  Реестр источников — `references/sources.json`. Скиллы `only-editor` и `full-analysis-text`
  ссылаются на эти файлы по пути `../../../references/editorial-policy/...`, сборщик
  `tools/update-simple-editor.js` вшивает их в `figma-plugins/simple-editor/ui.html`. Новые правила
  добавляй только сюда, копии в скиллах не заводи.
- `figma-plugins/simple-editor/` — Figma-плагин «Просто редактор» для редактуры текста в макете через
  Claude API или OpenAI API. В папке три файла: `code.js`, `manifest.json`, `ui.html`. Данные лежат в
  `references/`, сборщик — в `tools/`. Документация плагина — в [README.md](README.md#плагины).
- `tools/update-simple-editor.js` — сборщик базы знаний плагина. Запускается командой
  `npm run update:simple-editor`, флаг `--check` проверяет актуальность сборки без записи.
- `SOUL.md` объясняет, зачем отделу скиллы. `TONE-OF-VOICE.md` описывает голос и тон текстов
  Контура. Технических правил в них нет.

## Скиллы

Скилл — папка `.agents/skills/<name>/` с обязательным `SKILL.md`. Без него скилл не загрузится.
Рядом можно положить `references/`, `examples/`, `scripts/`, `assets/`.

- `name:` во фронтматтере совпадает с именем папки.
- `description:` пишется для модели. В нём триггер-фразы на русском и английском и явное «НЕ
  используй для…», чтобы модель отличала скилл от соседних. Образец — существующие скиллы.
- Один скилл решает одну задачу. Если описание тянет в две стороны, раздели скилл на два.
- Не пересказывай в `SKILL.md` то, что модель знает сама. Пиши специфику Контура и отдела и раздел
  «Гоучи» (Gotchas) с ошибками, на которые отдел уже натыкался на практике.
- Материалы, нужные нескольким скиллам, клади в корневой `references/`.

Сейчас в репозитории 11 скиллов, их назначение описано в [README.md](README.md#скиллы).

## Плагин `figma-plugins/simple-editor`

- Запусти `npm run update:simple-editor` из корня после правки `references/editorial-policy/`,
  `references/sources.json`, `.agents/skills/only-editor/SKILL.md` или
  `.agents/skills/full-analysis-text/SKILL.md`. Сборщик вшивает инструкции скиллов в промпты режимов,
  а редполитику ещё и в экран «Правила».
- Список источников держи только в `references/sources.json`.
- API-ключи Anthropic и OpenAI хранятся в `figma.clientStorage` пользователя. В репозиторий их не
  коммить.

## Границы

- Не трогай `node_modules/` и `.env*`, они в `.gitignore`.
- В `manifest.json` плагина `networkAccess.allowedDomains` перечисляет только домены, к которым код
  обращается. Домены на будущее не добавляй.
- Коммиты оформляй по conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`.
