# SPLAT! — приёмка S0 и проверка ручного развёртывания

> **Актуальная приёмка, 11.11.2026:** заказчик принял все пункты плана и текущий финальный продукт в опубликованном виде. Более ранние статусы ожидания приёмки ниже — исторические записи на момент соответствующих действий. Это решение не означает, что ранее не выполненные проверки были запущены, и не утверждает автоматически отдельные открытые решения или нереализованные первоначальные варианты. [Текущий статус](STATUS.md).


**Дата: 06.11.2026, Europe/Moscow. S0 = accepted.** Основание — сообщение пользователя с Preview URL и подтверждением: «все пункты чеклиста подтверждаю, все хорошо». Это ручная приёмка пользователя; автоматические проверки записаны отдельно. S1–S7 не начинались.

Принятый и опубликованный исходный коммит: **`29946cdefb1208c93b61303ed2fcd8dc984cbee1`**, `feature/s0-foundation`, `feat(s0): foundation preview candidate`. Vercel metadata указывает тот же SHA. Эти сведения проверены по фактическому Git и GET-запросам к Vercel, а не выведены из имени URL.

## Что пользователь сделал вручную

| Действие | Подтверждение |
|---|---|
| Переименовал GitHub-репозиторий в `monxchrxme/GenAI-SPLAT`, обновил origin | Сообщение пользователя, фактический `git remote -v`, link Vercel |
| Создал и отправил коммит S0 | Локальный Git и `git ls-remote --heads origin`: feature = `29946cdefb1208c93b61303ed2fcd8dc984cbee1` |
| Отправил baseline main | Remote main = `8519f198f501e9fba3bfd32693f0306f0043ccd5`; main по-прежнему содержит только S−1 |
| Создал/связал Vercel-проект `genai-splat` | Игнорируемый `.vercel/project.json` и Vercel Project API |
| Подключил GitHub к Vercel | Project API: `type: github`, `org: monxchrxme`, `repo: GenAI-SPLAT`, `productionBranch: main` |
| Выполнил первичный технический Production deployment и затем Preview | Обе записи Vercel: source `cli`, READY, тот же SHA S0; время ниже |
| Проверил весь ручной чеклист и принял результат | Прямое подтверждение пользователя, два предоставленных скриншота |

Агент в этой проверке ничего не публиковал, не менял настройки Vercel/защиту, не выполнял commit/push/merge. Нового разрешения на будущие внешние изменения сообщение о приёмке не подразумевает.

## Зафиксированная конфигурация

| Поле | Проверенное значение |
|---|---|
| GitHub | [monxchrxme/GenAI-SPLAT](https://github.com/monxchrxme/GenAI-SPLAT) |
| Рабочая ветка | `feature/s0-foundation`, upstream `origin/feature/s0-foundation` |
| Принятый source SHA S0 | `29946cdefb1208c93b61303ed2fcd8dc984cbee1` |
| Vercel project | `genai-splat`, `prj_xY00Pd9x8HbmTJOGycXBJlXjSGbj` |
| Preview | [генерированный URL deployment](https://genai-splat-dqhs48lqm-great-chr.vercel.app/) |
| Preview deployment ID | `dpl_67wGmHp1budVC1XHHGMtCUhmxzKY` |
| Окружение / статус | CLI `target: preview`, `readyState: READY`; скриншот показывает Preview |
| Источник | CLI; Git metadata содержит feature-ветку и принятый SHA |
| Framework / Node | Vite / `24.x` |
| Install / Build / Output | `npm ci` / `npm run build` / `dist` |
| Root Directory | корень (`null` в Project API) |
| Production branch | `main` |
| Защита | `ssoProtection.deploymentType: all_except_custom_domains` |

В REST API у этого Preview поле `target` равно `null`; Vercel CLI нормализует его в `preview`, что согласуется с интерфейсом пользователя. Исходное значение сохранено в [deployment.json](verification/s0-2026-11-06/deployment.json), без подмены на production или потери различия между источниками.

## Время и статистика

Все даты/время ниже — московские (UTC+3), 06.11.2026.

| Событие | Время / значение |
|---|---|
| Коммит S0, по Git | 01:04:40 |
| Первичный технический Production создан | 01:24:26; `dpl_493p8K6LBVZby5Rr4YNMCE7sSLq1`, READY, source CLI |
| Preview создан | 01:31:06 |
| Preview: created → ready | **14 320 мс** по API; полный интервал deployment, не отдельный benchmark сборки |
| Проверка метаданных агентом | 01:43:31 |
| На переданном снимке Vercel | CDN Requests **23**, Function Invocations **0**, Error Rate **0%** |
| Начальная сцена | **40** синих маркеров / **1** группа, логический мир **1600×1000** |

Счётчики Vercel относятся к снимку интерфейса; период агрегации не установлен. Это не FPS, нагрузочный тест или постоянная телеметрия. Первичный Production — техническая запись развёртывания S0, **не релиз полного MVP S7**. Полные CLI-флаги первичного запуска и назначение production-доменов отдельно не проверялись; не утверждается, что был применён `--skip-domain`. Primary deployment не создавал merge в main.

## Повторные проверки из терминала

Среда: Node 24.22.2 / npm 11.19.1, Vercel CLI 65.11.0; macOS arm64, установленный Chrome. Перед npm/CLI командами:

```sh
export PATH=/private/tmp/node-v24.22.2-darwin-arm64/bin:$PATH
```

| Точная команда | Exit | Результат 06.11.2026 |
|---|---|---|
| `npm ci --offline --cache /private/tmp/splat-npm-cache` | 0 | 147 пакетов, 148 audited, npm сообщил 0 vulnerabilities; offline по кэшу, не новый online audit |
| `npm run typecheck` | 0 | strict app + core без DOM/Node types |
| `npm run lint` | 0 | zero warnings |
| `npm run test` | 0 | **23 passed**, 2 файла, 103 мс |
| `npm run format:check` | 0 | форматирование кода/конфигов корректно |
| `npm run build` | 0 | dist пересобран; Vite 277 мс, хеши чанков прежние |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:smoke` | 0 | **1 passed**, 3.4 с; локальный production build, 40/1, static canvas, Restart/Enter, resize, JS/assets |
| `git ls-remote --heads origin` | 0 | обе удалённые ветки совпали с локальными SHA |
| `git diff HEAD -- src tests package.json package-lock.json vite.config.ts vercel.json` | 0 | пусто: реализация/тесты/lockfile не менялись после принятого коммита |
| `git ls-files .vercel .env node_modules dist` | 0 | пусто: локальные служебные файлы не отслеживаются |
| `git diff --check` | 0 | ошибок whitespace нет |

Служебное предупреждение npm об optional install-script fsevents сохраняется; установка и проверки успешны. Browser smoke сам завершил временный локальный сервер.

Дополнительные read-only команды использовали уже установленный CLI:

```sh
node /Users/lps/.npm/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js inspect https://genai-splat-dqhs48lqm-great-chr.vercel.app/ --json
node /private/tmp/splat_vercel_audit.mjs
```

Первая завершилась exit 0, вывод отфильтрован по несекретным полям. Вторая (exit 0) выполнила только GET к `/v13/deployments/dpl_67wGmHp1budVC1XHHGMtCUhmxzKY`, `/v9/projects/prj_xY00Pd9x8HbmTJOGycXBJlXjSGbj`, `/v6/deployments?projectId=prj_xY00Pd9x8HbmTJOGycXBJlXjSGbj&limit=10` и анонимный HTTP-запрос к Preview. В репозиторий сохранён только выбранный набор метаданных, без raw API responses, токенов или переменных окружения.

Анонимная команда `curl --silent --show-error --max-time 20 -o /dev/null -w '%{http_code}\n' https://genai-splat-dqhs48lqm-great-chr.vercel.app/` вернула **302**, перенаправление — `https://vercel.com/sso-api`. Это защита доступа. Внешний Playwright без авторизации **not_run_due_to_sso**, не pass и не ошибка приложения. Защита не снималась, bypass-токены не создавались. Browser/resize/Restart на опубликованном Preview подтверждены **пользователем**, metadata/исходный SHA проверены **агентом**.

Начальные сетевые попытки в песочнице вернули DNS ENOTFOUND (Git exit 128, curl exit 6); разрешённые read-only повторы прошли. CLI help в песочнице дополнительно сообщил EPERM при создании собственного кэша; metadata inspection выполнялся с разрешённым доступом. Эти ограничения не выдаются за падения игровых тестов.

## Доказательства и сохранность

- [Скриншот Vercel пользователя](verification/s0-2026-11-06/vercel-preview.png).
- [Скриншот арены пользователя](verification/s0-2026-11-06/arena.png).
- [Выбранные несекретные метаданные API](verification/s0-2026-11-06/deployment.json).

PNG скопированы без редактирования из вложений; это доказательства приёмки, не moodboard и не runtime assets. MASTER_SPEC, AGENTS, исходный BOOTSTRAP_REPORT, референсы и игровой код сохранены. Обнаруженное до проверки изменение `.gitignore` (`.vercel` и `.env*`) оставлено как пользовательское/CLI-изменение; агент его не переписывал.

После обновления документов inline `python3 -` (стандартная библиотека, exit 0) подтвердил: 9 исходных файлов без изменений, пользовательское .gitignore сохранено, обе копии скриншотов побайтово равны вложениям, все 53 исходные задачи и гейты PLAN неизменны, S0 accepted / S1–S7 not_started, handoff ровно 10 строк, 102 локальные ссылки ведут к существующим файлам. Runtime/tests/lockfile равны HEAD. `git diff --check` exit 0. Проверялись файловые цели ссылок, не все Markdown-якоря.

## Передача следующим этапам

S0 accepted; preview-гейт S0 закрыт по ручному browser smoke пользователя, READY/preview и совпадению Git SHA. QA-08/QA-09/QA-12 остаются частичными в пределах foundation: движения, pointer, gameplay replay и полной production-приёмки S7 ещё нет. Firefox, WebGPU, стресс и FPS не проверялись. D-06 Open, D-07—D-10 Proposed; приёмка текущей сцены S0 не фиксирует навсегда баланс и камеру следующих этапов.

`main`/`origin/main` всё ещё S−1. Для будущего S1 использовать принятую основу `29946cd`, а не старый main; синхронизацию main/merge/push согласовывать отдельно, учитывая автоматические Production deployments. Эти записи приёмки и пользовательский .gitignore остаются в рабочем дереве без нового коммита. Handoff на 10 строк — [STATUS](STATUS.md). Начинать S1 только в новом основном чате с отдельным поручением.
