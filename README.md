# Inside K

Скиллы для Claude Code, Codex и Cursor: гайды интервью, JTBD-артефакты, анализ качественных
данных, опросы и редактура текстов по правилам Контура. Исходники скиллов находятся в
`.agents/skills/`; общие инструкции по работе с репозиторием — в `AGENTS.md`.

- **Работа в репозитории.** Codex читает `.agents/skills/`, а `.claude/skills` и `.cursor/skills`
  ссылаются на тот же каталог. Для использования исходников сборка не требуется.
- **Общие исходники.** Редполитика хранится в [`references/editorial-policy/`](references/editorial-policy).
  Сборщик встраивает её в Figma-плагин и создаёт копию для распространяемого пакета Codex;
  вручную правятся только исходники.
- **6 скиллов**, каждый — одна задача с явными триггер-фразами и границами «когда НЕ применять»,
  чтобы agent не путал соседние сценарии.
- **Плагины Figma**, начиная с [`figma-plugins/k-editor`](figma-plugins/k-editor) — та же
  редполитика прямо в Figma, без переключения в чат.

```
you: "Оцени вот этот текст экрана по редполитике"
→ Claude сам подхватывает full-analysis-text: индекс качества 0–10 + список замечаний с цитатами
```

## Скиллы

| Скилл                                                                     | Для чего                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`design-guide`](.agents/skills/design-guide)                             | Гайд для UX-интервью (Крюгер, Квале)                                  |
| [`jtbd`](.agents/skills/jtbd)                                             | Job Statement, Job Story, Forces of Progress, Job Map из транскриптов |
| [`qualitative-analysis-rules`](.agents/skills/qualitative-analysis-rules) | Стандарт сведения анализа интервью/ЮТ в таблицу «вопрос × респондент» |
| [`survey`](.agents/skills/survey)                                         | Проектирование количественного опроса → `.docx`                       |
| [`only-editor`](.agents/skills/only-editor)                               | Точечная правка одного фрагмента интерфейсного текста                 |
| [`full-analysis-text`](.agents/skills/full-analysis-text)                 | Полный аудит текста с индексом качества 0–10                          |

Технические правила для агента — в [AGENTS.md](AGENTS.md), принципы работы отдела — в
[SOUL.md](SOUL.md).

## Начало работы

```bash
git clone https://github.com/ann-rusakova/inside-k.git
cd inside-k
claude   # или откройте папку в Cursor/Codex — оба читают AGENTS.md
```

Симлинки `.claude/skills` и `.cursor/skills` ведут в `../.agents/skills` — исходники общие,
ничего собирать для работы в репозитории не нужно. Проверить ссылки:

```bash
ls -la .claude/skills .cursor/skills   # обе ссылки -> ../.agents/skills
```

Новый скилл добавляется как обычная папка `.agents/skills/<name>/SKILL.md` — она сразу видна и
по путям `.claude/skills/<name>` и `.cursor/skills/<name>` — это одна и та же папка на диске (см. правила в
[AGENTS.md](AGENTS.md#скиллы)).

Cursor также поддерживает `.agents/skills/` напрямую: [документация Cursor](https://cursor.com/docs/skills).
Ссылка `.cursor/skills` даёт явную точку входа для Cursor; правьте оригиналы в `.agents/skills/`.

## Установка скиллов в другие проекты

Пакет Codex `inside-k` содержит все шесть скиллов, примеры и справочники. Он устанавливается
в Codex пользователя и доступен для работы в других проектах. Figma-плагин устанавливается отдельно.

Из локальной копии этого репозитория, в которой уже есть `.agents/plugins/marketplace.json`:

```bash
codex plugin marketplace add /полный/путь/к/inside-k
codex plugin add inside-k@personal
```

`personal` — имя каталога в `.agents/plugins/marketplace.json`, `inside-k` — имя пакета.
После установки начните новый чат Codex. В этом репозитории скиллы уже доступны из исходников,
поэтому установленный пакет может также отображаться в списке; в других проектах он даёт доступ
без копирования файлов в проект.

После коммита и отправки каталога и пакета в GitHub коллеги смогут установить их напрямую:

```bash
codex plugin marketplace add ann-rusakova/inside-k
codex plugin add inside-k@personal
```

Выберите один источник каталога: локальную папку или GitHub. При уже занятом имени `personal`
проверьте `codex plugin marketplace list` и не заменяйте чужой каталог без согласования.
Эти команды предназначены для Codex CLI; совместимость каталога с Claude Code и Cursor не заявлена.

### Обновление пакета

Для локального каталога: обновите клон через `git pull`, повторите
`codex plugin add inside-k@personal` и начните новый чат. Для каталога из GitHub сначала обновите
его командой `codex plugin marketplace upgrade personal`, затем переустановите пакет.

Для авторов: правьте `.agents/skills/` и `references/`, затем запускайте `npm run update:plugin`.
Сборщик одновременно обновляет Figma-плагин и `plugins/inside-k/`, проверяет скиллы и локальные
ссылки. Пути к общей редполитике адаптируются в пакете; исходные инструкции сохраняются.
Каталоги `plugins/inside-k/skills/` и `plugins/inside-k/references/` — результат сборки, вручную
их не редактируйте. Они хранятся в Git, чтобы коллегам не требовались Node.js и сборка.

Перед выпуском новой версии измените `version` в `plugins/inside-k/.codex-plugin/plugin.json`,
пересоберите пакет и закоммитьте исходники, результат сборки и каталог. Отправка в GitHub
выполняется отдельно. Скрипт сборки не публикует пакет и не переустанавливает его в Codex.

## Плагины

[`figma-plugins/k-editor`](figma-plugins/k-editor) — «К редактор» (K Editor), Figma-плагин для
UX-редактуры текста прямо в макете: полный анализ текста (индекс качества 0–10) и точечный
редактор одного фрагмента (переформулировать/сократить/четче/дружелюбнее), по тем же правилам,
что и скиллы `full-analysis-text`/`only-editor`.

- **Установка (локально):** Figma Desktop → `Plugins` → `Development` →
  `Import plugin from manifest...` → выбрать `figma-plugins/k-editor/manifest.json`.
  Если плагин был импортирован из прежней папки `plugins/`, импортируйте manifest по новому пути.
- **База знаний** — [`references/editorial-policy/`](references/editorial-policy) (реестр источников —
  [`references/sources.json`](references/sources.json)), вшивается в `ui.html` сборщиком
  `tools/update-k-editor.js` командой `npm run build:k-editor` (из корня) —
  запускать после правки файлов в `references/editorial-policy/`, `sources.json` или двух скиллов ниже.
- **Инструкции режимов** — напрямую из
  [only-editor/SKILL.md](.agents/skills/only-editor/SKILL.md) для редактора и вариантов правки,
  [full-analysis-text/SKILL.md](.agents/skills/full-analysis-text/SKILL.md) для полного анализа.
  Сборщик вшивает весь текст инструкций без YAML-метаданных и связывает Markdown-ссылки с
  общей базой знаний. В API отправляются выбранный скилл и полные тексты его источников.
  Плагин добавляет требования к JSON и выбранной операции; для фрейма инструкции применяются
  к каждому блоку в контексте экрана. Изменение скилла сбрасывает применимость старого кеша.
  После сборки перезапустите плагин в Figma; во время работы он не читает файлы репозитория.
- **Провайдеры:** Claude API (нужен ключ `sk-ant-...` с console.anthropic.com, не подписка
  Claude Pro/Max), OpenAI API или свой OpenAI-совместимый сервер. Его домен должен быть
  разрешён в `manifest.json`. Mock доступен в браузерном предпросмотре `ui.html` вне Figma.
- **Публикация в Figma Community:** `Plugins` → `Development` → плагин → `Publish new release`,
  форма публикации подтягивает `name`/`main`/`ui` из `manifest.json`; сроки модерации определяет Figma.
- Ключи API хранятся только в `figma.clientStorage` пользователя, никогда не в репозитории.
  При переименовании сохранены `id: kontur-editor` и ключи хранилища `kontur-editor-*`,
  чтобы плагин продолжал читать прежние настройки и сохранённые API-ключи.

## Сборка и форматирование

Нужен Node.js 22 или новее. Установите инструменты разработки командой `npm ci`.
Prettier — зависимость только для разработки; плагину npm-пакеты не нужны.

Обновить Figma-плагин и пакет скиллов одной командой из корня репозитория:

```bash
npm run update:plugin
```

Команда собирает скиллы и редполитику, проверяет манифест и синтаксис кода Figma-плагина,
подключение скиллов и ссылки в пакете Codex. При ошибке останавливается. После успешного завершения закройте и
заново запустите плагин в Figma. Для локального плагина, импортированного через manifest,
повторный импорт не требуется. Версию в Community нужно публиковать отдельно.

Отдельные команды:

```bash
npm run build:k-editor # альтернативное имя команды update:plugin
npm run format              # форматирование по .prettierrc
npm run format:check        # проверка форматирования без изменения файлов
```

Настройки Prettier — в `.prettierrc`, исключения — в `.prettierignore`.
Сборщик автоматически форматирует весь `figma-plugins/k-editor/ui.html` после встраивания
базы знаний. Файл также обрабатывается командой `npm run format`.
После изменения или форматирования любого скилла или справочника
запускайте `npm run update:plugin`.
Проверка актуальности сборки: `node tools/update-k-editor.js --check`.
Синтаксис кода и подключение скиллов проверяются этим же скриптом до записи результата.
