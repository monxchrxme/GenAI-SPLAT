# SPLAT! — поставка S0, 05.11.2026

**Обновление 06.11.2026: S0 принят пользователем, Preview опубликован им вручную и проверен.** Принятый source SHA `29946cdefb1208c93b61303ed2fcd8dc984cbee1`. Полная актуальная [запись приёмки, статистика и повторные проверки](S0_ACCEPTANCE.md). Ниже сохранён исторический отчёт исходной локальной поставки 05.11.2026; упоминания отсутствовавшего URL/коммита относятся к тому моменту. Ручной чеклист в конце обновлён по явному подтверждению пользователя. S1–S7 не начаты.

## Аудит и границы

До изменений каталог содержал принятые документы S−1, `.gitignore`, исходные и скопированные moodboard. Игрового кода, package.json, lockfile, node_modules и `.git` не было. `git status --short --branch` вернул exit 128 (`not a git repository`). AGENTS и все обязательные документы прочитаны, MASTER_SPEC полностью; исторические PRD.md/SPLAT_FINAL_TZ_v2.md не использовались.

Пользователь отдельно разрешил S0 и подключение существующего GitHub remote. Принятый S−1 сохранён локальным baseline-коммитом; S0 выполнен в feature-ветке. Дописывание ещё одного заголовка в существующий README не требовалось. Push/merge, Vercel и действия с внешними аккаунтами не выполнялись.

## Подзадачи

| Подзадача | Фактический результат |
|---|---|
| S0.1 | Vite 8.3.6 + TS strict 5.9.3 + PixiJS 8.22.0, точные версии, package-lock.json, все предусмотренные скрипты и smoke/format:check |
| S0.2 | Agent/Group/World/MatchState/LevelConfig, Mulberry32, fixed clock, сессионная очередь/журнал Restart, чистая Simulation → detached frozen Snapshot → Pixi/HTML HUD |
| S0.3 | Мир 1600×1000 [P], открытое поле сверху, 40 статичных синих маркеров в одной группе, равномерное вписывание камеры без изменения world-state |
| S0.4 | «Заново»: новая Simulation, начальные ID/координаты/RNG/tick, очищенные очередь/журнал/accumulator; повторные запросы безопасны |
| S0.5 | 23 unit/integration-теста, включая отрицательные проверки инвариантов, fixed steps при 30/60/144 FPS и resize; 1 production browser smoke |
| S0.6 | README/архитектура/план/решения/QA/status/changelog актуализированы, AGENTS сверён и сохранён, Git создан, разрешённый origin подключён, vercel.json и DEPLOYMENT готовы. **Vercel подключение/preview URL/browser check внешнего URL — not_run_not_authorized** |

Числа, палитра и камера остаются Proposed D-10. Маркеры — примитивы S0, не финальный арт S6. HUD содержит численность, группы и Restart; будущие кнопки/прогресс/Pause не добавлялись. Нет рисования, выделения, movement, split/merge, окраски, боя, врагов, runtime GenAI, backend/API/БД, React, жидкости или постоянных частиц. Фоновая сетка исключительно декоративная.

## Изменённые и добавленные файлы

- Корень: `package.json`, `package-lock.json`, `.node-version`, `.npmrc`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.core.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vercel.json`.
- `src/core/`: `types.ts`, `config.ts`, `rng.ts`, `fixedStepClock.ts`.
- `src/simulation/`: `initialState.ts`, `invariants.ts`, `snapshot.ts`, `simulation.ts`.
- `src/app/session.ts`, `src/input/sessionInput.ts`, `src/ui/hud.ts`, `src/main.ts`, `src/style.css`.
- `src/rendering/`: `presentation.ts`, `viewport.ts`, `pixiRenderer.ts`.
- `tests/unit/foundation.test.ts`, `tests/unit/viewport.test.ts`, `tests/smoke/foundation.spec.ts`.
- Обновлены `README.md`, `docs/STATUS.md`, `PLAN.md`, `SPEC.md`, `ARCHITECTURE.md`, `DESIGN_GUIDE.md`, `QA.md`, `DECISIONS.md`, `CHANGELOG.md`; добавлены этот отчёт и `docs/DEPLOYMENT.md`.
- Локальные игнорируемые артефакты: `node_modules/`, `dist/`, `reports/s0-desktop.png`, Playwright results. Они не отправлены в Git.
- Сохранены без изменения AGENTS, MASTER_SPEC, BOOTSTRAP_REPORT, `.gitignore`, оба реестра референсов и четыре PNG (оригиналы + копии).

## Окружение и установка

macOS **26.6.2**, arm64; Google Chrome **156.0.8078.80**; Playwright **1.64.1**, проект `chromium`, channel `chrome`. Проверен WebGL. Firefox/WebGPU/FPS не проверялись.

В PATH изначально отсутствовали Node и npm (обе команды exit 127). Официальный Node **24.22.2 LTS / npm 11.19.1** загружен в `/private/tmp`; системная установка и правки shell-профиля не выполнялись. SHA-256 архива совпал с официальным SHASUMS256:

```text
aa9549349e47dffaa42dcf95d6e06ade8c4bdafc980979883b88767670df385a
```

Все npm-команды ниже выполнялись в каталоге проекта после:

```sh
export PATH=/private/tmp/node-v24.22.2-darwin-arm64/bin:$PATH
```

Для metadata/download npm использовался локальный кэш `/private/tmp/splat-npm-cache`; временный runtime/кэш могут быть очищены системой. Node 24.x требуется `.npmrc`/engines; после постоянной установки Node 24 LTS команды обычные.

## Точные команды и результаты

| Команда | Итоговый exit | Результат |
|---|---|---|
| `npm install --package-lock-only --cache /private/tmp/splat-npm-cache --fetch-retries=0 --fetch-timeout=30000` | 0 | Lockfile создан, затем обновлён после dev-override minimatch |
| `npm ci --cache /private/tmp/splat-npm-cache --fetch-retries=0 --fetch-timeout=30000` | 0 | Финальная чистая установка: 147 пакетов, 148 audited, 0 vulnerabilities |
| `npm run typecheck` | 0 | Строгая проверка приложения/тестов и отдельного core-project без DOM/Node types |
| `npm run lint` | 0 | ESLint, max-warnings 0; также запрещены Pixi/DOM/часы/Math.random в ядре |
| `npm run test` | 0 | 2 файла, **23 passed**, финальный запуск 95 мс |
| `npm run format` | 0 | Код и конфиги отформатированы; существующие Markdown/референсы исключены |
| `npm run format:check` | 0 | All matched files use Prettier code style |
| `npm run build` | 0 | Повторный typecheck + Vite, **dist** создан; Vite build 356 мс |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:smoke` | 0 | **1 passed**, 7.9 с включая запуск; проверял production dist |
| `npm run preview -- --port 4173 --strictPort` | running → stopped | Для демонстрации, локальный адрес `http://127.0.0.1:4173/`; сервер остановлен после проверки |
| `curl --fail --silent --show-error --max-time 5 -I http://127.0.0.1:4173/` | 0 | **HTTP 200 OK**, после разрешения localhost-доступа |
| `git diff --check` | 0 | Нет ошибок whitespace в отслеживаемых изменениях |

Документальная сверка inline-скриптом `python3 -` (только стандартная библиотека, exit 0): 10 сохранённых файлов побайтово совпали с baseline HEAD; MASTER_SPEC — 63 242 байта и неизменный SHA-256 `be6867832a99790b9f1d49acc517fa8d3027f03e165420584fea2bb9a589deb4`. Все 53 исходные задачи PLAN и исходные гейты/артефакты совпали с baseline; S1–S7 остаются not_started; 86 локальных ссылок ведут к существующим файлам. Это проверка документации, не игровой тест и не новая проверка всех якорей.

API и совместимость сверены с первичными источниками: [Pixi Application](https://pixijs.com/8.x/guides/components/application), [Vite](https://vite.dev/guide/), [Playwright configuration](https://playwright.dev/docs/test-configuration), [поддерживаемые версии typescript-eslint](https://typescript-eslint.io/users/dependency-versions/). Метаданные точных версий получены из официального npm registry, а итоговая совместимость проверена локальными командами выше.

В `dist/index.html` 1.95 kB, CSS 1.68 kB, главный JS 255.90 kB (gzip 75.64 kB), остальные чанки Pixi до 112.97 kB. Это размеры сборки, не результаты сетевого benchmark/FPS.

Smoke проверил загрузку canvas и 40 созданных объектов рендера, HUD 40/1 и единственную кнопку; неизменность screenshot canvas при продвижении tick; три Restart и клавиатурный Enter; сброс tick и неизменность картинки; resize **1440×900 → 900×650 → 1920×1080 → 1440×900**, постоянный размер мира и отсутствие горизонтального overflow. Ошибки page/console/request и HTTP ≥400: **0**. Снимок `reports/s0-desktop.png` просмотрен агентом: видны пять рядов по восемь маркеров. Это локальная проверка, не пользовательская приёмка.

### Неуспешные попытки и устранение

- Первые curl/npm/git сетевые запросы в песочнице: ENOTFOUND / DNS, exit 6/1/128. Для npm с timeout 10000 мс не получилось получить lockfile/пакеты; разрешённые повторы с timeout 30000 завершились успешно. `git ls-remote` после разрешения exit 0. Песочница также запрещала `.git` и локальный listen (EPERM); разрешённые Git/preview/smoke повторы отработали.
- Первый `npm run typecheck`: exit 2, explicit `undefined` в optional `webServer` Playwright при exactOptionalPropertyTypes. Исправлено условным добавлением поля, итоговая проверка exit 0.
- Первый `npm run format`: exit 127 (`prettier: command not found`), он был запущен до завершения повторного npm ci. После установки повтор выполнен успешно.
- Первоначальные install/audit показали 10 moderate предупреждений из одной dev-зависимости minimatch. `npm audit --json --cache /private/tmp/splat-npm-cache --fetch-retries=0 --fetch-timeout=10000`: exit 1, детали GHSA-g3hv-75wg-m249. Добавлен точный override `minimatch: 11.0.1`, обновлён lockfile, повторён npm ci: **0 vulnerabilities**. Совместимость проверена lint проекта; пересмотреть override при обновлении upstream.
- Npm вывел предупреждение о необязательном native install-script `fsevents@2.3.3`; скрипт не разрешался. Все требуемые проверки завершились успешно. Сообщения Node о NO_COLOR/FORCE_COLOR относятся к CLI, не к JS console игры.

Недоступные проверки не засчитывались как pass. Установка Playwright-браузера не потребовалась: использован установленный Chrome. Проверки `npm run dev`/HMR отдельно не выполнялись; проверены production build и preview. `npm run format:check` намеренно не проверяет Markdown по Prettier; документация сверяется отдельно.

## Git

Выполнены с разрешением:

```sh
git init -b main
git add .gitignore AGENTS.md README.md docs visual_references
git commit -m "docs: preserve accepted S-1 baseline"
git switch -c feature/s0-foundation
git remote add origin https://github.com/monxchrxme/GenAI-SPLAT-.git
git ls-remote --heads origin
```

Все итоговые exit 0; ls-remote не вернул веток. Baseline main/HEAD: **8519f198f501e9fba3bfd32693f0306f0043ccd5**. Это принятая документация S−1, **не принятый коммит S0**. S0 остаётся в рабочем дереве; stable commit/merge до приёмки не выполнялись. Remote настроен, репозиторий не опубликован этим агентом. Последовательность будущего preview — [DEPLOYMENT](DEPLOYMENT.md).

## Ручной чеклист S0 — подтверждён пользователем 06.11.2026

1. [x] Увидеть поле без ошибки WebGL.
2. [x] Видны ровно 40 отдельных неподвижных синих маркеров, HUD показывает 40/1; нет логотипа, лиц, движения/брызг.
3. [x] Оценить простор поля и читаемость при изменении окна; нет растяжения или обрезания маркеров.
4. [x] Несколько нажатий «Заново»: те же позиции и численность, без накопления объектов; Tab и Enter/Space.
5. [x] Просмотреть текущие размеры/масштаб/палитру и ограничения; принять срез S0 без утверждения будущего баланса.
6. [x] Пользователь сам отправил ветки, подключил Vercel и проверил [фактический Preview](https://genai-splat-dqhs48lqm-great-chr.vercel.app/); гейт S0 закрыт.
7. [x] Пользователь сообщил: «все пункты чеклиста подтверждаю, все хорошо». Это основание приёмки, не автоматические тесты.

Отметки отражают прямое подтверждение пользователя, а не самостоятельную оценку агента. Повторные terminal checks и Vercel metadata — в S0_ACCEPTANCE; external e2e без SSO not_run.

Демо: локальный `reports/s0-desktop.png`; контрольный код, проверки и документация доступны в рабочем дереве. Сервер демонстрации остановлен при завершении, чтобы не оставлять фоновый процесс. Запуск для ручной проверки приведён выше и в README.

## Оставшиеся ограничения исходной поставки 05.11.2026 (история)

Vercel preview/URL отсутствуют, полный гейт S0 не закрыт. QA-08/QA-09 покрыты только основой S0, QA-12 — только локальная сборка/resize без pointer; остальные QA ожидают свои этапы. Нет Firefox/WebGPU/стресс/FPS-результатов и проверки B-static **в движении**, поскольку движения ещё нет. Числа D-10 остаются Proposed, D-06 Open, D-07—D-09 Proposed. MASTER_SPEC и референсы не менялись.

Приведённые выше отсутствие URL и ожидание приёмки описывают 05.11.2026. На 06.11.2026 Preview-гейт закрыт, S0 принят; актуальные ограничения и доказательства — [S0_ACCEPTANCE](S0_ACCEPTANCE.md), handoff на 10 строк — [STATUS](STATUS.md). **S1 не начинать без нового чата и отдельного поручения.**
