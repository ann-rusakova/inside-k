# Security Policy

Политика безопасности inside-k — репозитория скиллов для Claude Code, Codex и Cursor и Figma-плагина
отдела UX-исследований и редактуры Контура. Сервера, базы данных и аутентификации пользователей
нет. Код плагина выполняется внутри Figma, текст анализирует API, который выбрал пользователь. В
браузерном предпросмотре вместо API работают локальные эвристики.

## Supported versions

Поддерживается только ветка `main`.

| Version             | Supported |
| ------------------- | --------- |
| `main`              | yes       |
| старые ветки и теги | no        |

## Reporting a vulnerability

Не публикуйте в issues реальные API-ключи, содержимое `.env` и фрагменты редполитики с внутренними
данными Контура. Напишите ответственному за репозиторий во внутренний канал отдела: Slack или тикет.
Укажите:

- что нашли и как это воспроизвести;
- компонент: `figma-plugins/simple-editor/`, `tools/`, `.agents/skills/`, `.claude/settings.json`
  или `.claude/hooks/`;
- к чему это может привести, например к утечке ключа или произвольному сетевому запросу из плагина.

Если скомпрометирован реальный ключ Anthropic или OpenAI, сообщите сразу и отзовите ключ на
[console.anthropic.com](https://console.anthropic.com) или
[platform.openai.com](https://platform.openai.com), не дожидаясь разбора.

## Scope

### In scope

- Figma-плагин `figma-plugins/simple-editor/` (`code.js`, `ui.html`, `manifest.json`). Это
  единственный компонент, который отправляет сетевые запросы и хранит данные пользователя.
- Сборщик `tools/update-simple-editor.js`. Он читает локальные файлы репозитория и в сеть не ходит.
- Скиллы в `.agents/skills/`: инструкции для агента, исполняемого кода в них нет.
- Симлинки `.claude/skills` и `.cursor/skills` на исходники скиллов.
- `.claude/settings.json`: подключение хука и список разрешённых команд.
- `.claude/hooks/remind-content-build.js`: напоминание о сборке базы знаний.

### Out of scope

- Figma, Anthropic API и OpenAI API. Об уязвимостях в них сообщайте вендору.
- `guides.kontur.ru` и `in.kontur.ru`. С них взяты тексты редполитики, но этот репозиторий их не
  контролирует. Плагин к ним не обращается и работает с копией в `references/editorial-policy/`.

## Handling secrets

- Не коммитьте API-ключи Anthropic и OpenAI, `.env` и выгрузки личных настроек плагина. `.gitignore`
  исключает `.env*`, но ключ, вставленный прямо в код или markdown, он не остановит.
- Плагин хранит ключ в `figma.clientStorage` пользователя, подробнее — в
  [README.md](README.md#плагины). При запросе ключ и текст уходят выбранному провайдеру или серверу,
  указанному в поле «Свой». В браузерном предпросмотре введённый ключ хранится в памяти вкладки и в
  `localStorage` не попадает.
- Плагин обращается только к доменам из `networkAccess.allowedDomains` в
  `figma-plugins/simple-editor/manifest.json`. Правило пополнения списка — в
  [AGENTS.md](AGENTS.md#границы). Сейчас в нём:
  - `api.anthropic.com` и `api.openai.com` — провайдеры анализа;
  - `claude-n-codex.com:8443` — пользовательский сервер с OpenAI-совместимым протоколом. Код не
    проверяет, кому принадлежит этот сервер и можно ли ему доверять;
  - `s.kontur.ru` — шрифт Lab Grotesque.

  В PR, который меняет этот список, проверьте, что `code.js` или `ui.html` обращается к каждому
  домену.

- Ключ, попавший в git-историю или в чат с агентом, считайте скомпрометированным и отзовите.
  Переписанная история коммитов утечку не отменяет.

## Secure defaults

- В Figma по умолчанию выбран Anthropic, для анализа нужен API-ключ. Вне Figma предпросмотр работает
  с mock-анализом, при этом шрифты могут загружаться с `s.kontur.ru`.
- Сборка `npm run build:simple-editor` не отправляет сетевых запросов: база знаний читается из
  `.agents/skills/` и `references/` на диске.
- Хук `.claude/hooks/remind-content-build.js` из `.claude/settings.json` печатает напоминание о
  сборке. Как любой command hook, он запускает команду оболочки, и список разрешённых команд Bash
  его не ограничивает.

## Dependency updates

Версия Prettier в `devDependencies` закреплена точно, дерево зависимостей фиксирует
`package-lock.json`. Устанавливайте зависимости через `npm ci`, известные уязвимости проверяйте
через `npm audit`. После обновления Prettier запустите `npm run format` и
`npm run build:simple-editor`.

Плагин не использует npm-пакеты во время работы: `code.js` и `ui.html` выполняются в песочнице Figma
без Node.js.
