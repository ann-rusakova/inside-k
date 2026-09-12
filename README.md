# Inside K

Скиллы для Claude Code (и Codex/Cursor через `AGENTS.md`), которые ведут UX-исследования и
редактуру текстов Контура по единым правилам отдела — гайд интервью, JTBD-артефакты, разметка
анализа, опросы и правки интерфейсного текста по редполитике. Подключаются одной командой, без
ручной настройки: скиллы уже лежат там, где их ждёт Claude Code.

- **Готово из коробки.** `.claude/skills` — симлинк на `.agents/skills`, agent видит все скиллы
  сразу после `git clone`, без установки и конфигурации.
- **Один источник правды.** Правила редполитики Контура (типографика, спорные слова, числа,
  названия) лежат один раз в [`references/redpolitika/`](references/redpolitika) — их читают и
  скиллы, и Figma-плагин, дублей нет.
- **6 скиллов**, каждый — одна задача с явными триггер-фразами и границами «когда НЕ применять»,
  чтобы agent не путал соседние сценарии.
- **Один плагин**, [`plugins/simple-editor`](plugins/simple-editor) — та же редполитика прямо в
  Figma, без переключения в чат.

```
you: "Оцени вот этот текст экрана по редполитике"
→ Claude сам подхватывает full-analysis-text: индекс качества 0–10 + список замечаний с цитатами
```

## Скиллы

| Скилл | Для чего |
|---|---|
| [`design-guide`](.agents/skills/design-guide) | Гайд для UX-интервью (Крюгер, Квале) |
| [`jtbd`](.agents/skills/jtbd) | Job Statement, Job Story, Forces of Progress, Job Map из транскриптов |
| [`qualitative-analysis-rules`](.agents/skills/qualitative-analysis-rules) | Стандарт сведения анализа интервью/ЮТ в таблицу «вопрос × респондент» |
| [`survey`](.agents/skills/survey) | Проектирование количественного опроса → `.docx` |
| [`only-editor`](.agents/skills/only-editor) | Точечная правка одного фрагмента интерфейсного текста |
| [`full-analysis-text`](.agents/skills/full-analysis-text) | Полный аудит текста с индексом качества 0–10 |

Технические правила для агента — в [AGENTS.md](AGENTS.md), принципы работы отдела — в
[SOUL.md](SOUL.md).

## Начало работы

```bash
git clone <url> inside-k
cd inside-k
claude   # или откройте папку в Cursor/Codex — оба читают AGENTS.md
```

Симлинк `.claude/skills -> ../.agents/skills` уже в репозитории — ничего собирать не нужно,
скиллы доступны сразу. Проверить, что он на месте:

```bash
ls -la .claude/skills   # -> ../.agents/skills
```

Новый скилл добавляется как обычная папка `.agents/skills/<name>/SKILL.md` — она сразу видна и
по пути `.claude/skills/<name>`, это одна и та же папка на диске (см. правила в
[AGENTS.md](AGENTS.md#скиллы)).

## Плагин

[`plugins/simple-editor`](plugins/simple-editor) — «Просто редактор», Figma-плагин для
UX-редактуры текста прямо в макете: полный анализ текста (индекс качества 0–10) и точечный
редактор одного фрагмента (переформулировать/сократить/четче/дружелюбнее), по тем же правилам,
что и скиллы `full-analysis-text`/`only-editor`.

- **Установка (локально):** Figma Desktop → `Plugins` → `Development` →
  `Import plugin from manifest...` → выбрать `plugins/simple-editor/manifest.json`.
- **База знаний** — симлинк на [`references/redpolitika/`](references/redpolitika), вшивается в
  `ui.html` командой `npm run build:simple-editor` (из корня) — запускать после правки файлов
  в `references/redpolitika/`.
- **Провайдеры:** Claude API (нужен ключ `sk-ant-...` с console.anthropic.com, не подписка
  Claude Pro/Max), OpenAI API, либо `Mock` — работа без ключа на локальных эвристиках.
- **Публикация в Figma Community:** `Plugins` → `Development` → плагин → `Publish new release`,
  форма публикации подтягивает `name`/`main`/`ui` из `manifest.json`; модерация обычно 1–5 дней.
- Ключи API хранятся только в `figma.clientStorage` пользователя, никогда не в репозитории.
