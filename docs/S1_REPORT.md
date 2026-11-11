# S1 — итоговая локальная проверка, действие 6

> **Актуальная приёмка, 11.11.2026:** заказчик принял все пункты плана и текущий финальный продукт в опубликованном виде. Более ранние статусы ожидания приёмки ниже — исторические записи на момент соответствующих действий. Это решение не означает, что ранее не выполненные проверки были запущены, и не утверждает автоматически отдельные открытые решения или нереализованные первоначальные варианты. [Текущий статус](STATUS.md).


06.11.2026. `implemented: true`, `tests_verified: local_pass`, `awaiting_manual_acceptance: false`, `manual_acceptance: accepted`. После проверок действия 6 пользователь явно принял весь S1 на текущей стадии и отдельно поручил Git-отправку и передачу S2. [Запись приёмки и исторический чеклист](S1_ACCEPTANCE.md). Результаты автоматических проверок ниже относятся к действию 6; при закрытии runtime/tests не менялись, повторный запуск этих тестов не требовался.

## Что сделано в действии 6

Игровое поведение не менялось. Добавлен tests/unit/s1Acceptance.test.ts, расширены tests/unit/gestureHandoff.test.ts и tests/smoke/movement.spec.ts. Актуализированы рабочие документы, записана приёмка действия 5; устаревшие текущие статусы ранних действий приведены к фактам, история поставок сохранена в отчётах и STATUS.

- QA-01: 40 агентов занимают полилинию из четырёх сегментов / трёх изломов. На каждом tick сохраняются ID, HP, живые, членство, RNG и ограничение перемещения; после достижения всех слотов ещё 600 ticks нет движения. Старый snapshot остаётся неизменным.
- QA-07: 30 пакетов по пять корректных/пустых/вырожденных/NaN/вне мира приказов сохраняют последнюю валидную цель. Проверены остановка, повторный выбор и чистый Restart с pending-приказом. Ещё шесть тестов проверяют Esc/blur/visibility/pointercancel/lostcapture, поздний lostcapture и чужой pointer ID, сохранение прежнего приказа и следующий рабочий жест.
- Browser QA-01 усилен до трёх изломов; подтверждены движение после release, 40/1, resize в пути, maxSlotError=0, нулевая скорость и одинаковый canvas после покоя, Restart восстанавливает исходный canvas.

## Покрытие требований S1

| Требование / QA | Доказательства | Статус |
|---|---|---|
| World pointer, CSS offset/scale, resize, DPR 1/2 | unit/viewport.test.ts, smoke/selection.spec.ts | tests_verified |
| Выбор маркера и локальных промежутков; статичная подсветка | unit/selection.test.ts, smoke/selection.spec.ts | tests_verified; действие 5 принято |
| Полилиния: пустая, короткая, прямая, излом, дубли, лимиты | unit/polyline.test.ts, formation.test.ts; smoke/drawing.spec.ts | tests_verified |
| Равные слоты по длине и стабильный Agent ID → индекс | unit/formation.test.ts, movement.test.ts | tests_verified |
| QA-01: 40 агентов, одна группа, плавность/устойчивость | unit/s1Acceptance.test.ts, movement.test.ts; smoke/movement.spec.ts | local tests_verified; S1 accepted |
| QA-07: быстрые смены/развороты, pending кадры, coalesced-путь, отмены/resize/Restart | unit/gestureHandoff.test.ts, inputCommands.test.ts, s1Acceptance.test.ts; smoke/gestureHandoff.spec.ts, inputRecovery.spec.ts, drawing.spec.ts | local tests_verified; S1 accepted |
| Временное натяжение без split | unit/tension.test.ts, smoke/tension.spec.ts, inputRecovery.spec.ts | tests_verified; действие 5 принято |
| Регрессия S0: seed/fixed step/инварианты/frozen snapshot/Restart, canvas/HUD/assets | unit/foundation.test.ts, viewport.test.ts; smoke/foundation.spec.ts | local tests_verified |

Имена в таблице относятся к каталогам tests/unit и tests/smoke. QA-07 здесь проверен в объёме S1; расширение split/merge остаётся будущим. QA-08/09/12 не объявляются полностью закрытыми без будущих этапов.

## Команды и фактический результат

Node 24.22.2 / npm 11.19.1, установленный Google Chrome/WebGL. PATH: `/private/tmp/node-v24.22.2-darwin-arm64/bin:$PATH`. Зависимости не устанавливались: существующие package/lockfile/node_modules сохранены. Установка для этого тестового действия не требовалась.

| Команда | Результат |
|---|---|
| `npm run test` | exit 0, 80 tests / 10 files, 351 мс |
| `npm run build` | exit 0; включает strict typecheck app и отдельный core без DOM/Node; Vite 96 мс |
| `npm run lint` | exit 0, zero warnings |
| `npm run format:check` | exit 0; Markdown исключён из автоформатирования по правилам репозитория |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:smoke` | exit 0, 15 passed, 33.6 с, local production dist |
| `git diff 29946cdefb1208c93b61303ed2fcd8dc984cbee1 -- tests/unit/foundation.test.ts tests/unit/viewport.test.ts tests/smoke/foundation.spec.ts` | exit 0; foundation unit без изменений; исходные viewport cases сохранены, добавлены S1 cases; в S0 smoke изменён только доступный canvas label |

В действии 6 все перечисленные автоматические проверки прошли с первого запуска. Предыдущие найденные сбои/исправления тестов и продукта сохранены в [отчёте действия 5](S1_ACTION_5_FIX_REPORT.md), их результаты не выданы за текущие новые запуски. Первые 23 unit/integration S0 входят в общий набор и сохранены, как и исходный S0 browser сценарий. Smoke контролируют JS/console ошибки, S0 также request/HTTP failures. CLI warning NO_COLOR/FORCE_COLOR не является ошибкой приложения.

Снимки локального QA-01 просмотрены агентом: [движение](verification/s1-final-2026-11-06/moving.png), [устойчивая форма](verification/s1-final-2026-11-06/settled.png). Картинка не доказывает отсутствие мигания: для этого сохранён отдельный покадровый Chrome smoke быстрых замен в обычном и замедленном времени rAF. Это тестовая инструментация, а не FPS benchmark.

`python3 /private/tmp/splat-input-doccheck.py` (стандартная библиотека, временный скрипт вне репозитория), exit 0: 154 локальные файловые цели ссылок. Документальная проверка (также в STATUS): исходные 53 задачи PLAN, гейты/артефакты и D-register сохранены; MASTER_SPEC/AGENTS/package/lockfile/vercel.json/S0-артефакты неизменны; 10 строк handoff; ссылки существуют; ничего staged. `git diff --check` — exit 0.

## Итоговое поведение и границы

Input → Commands → deterministic Simulation → frozen Snapshot → Renderer/HUD сохранён. Pending preview мостит release → fixed tick; положение агентов меняет только simulation. Обычный B-static рендер меняет координаты, не форму/rotation/scale. Esc отменяет только черновик; пустой дальний клик останавливает и очищает; Restart чистый.

Ограничения текущего прототипа: стабильное назначение по ID может давать пересечения путей; мягкое разведение допускает временные наложения и плотные формы. Агенты идут прямо к слотам, не вдоль всей линии. Натяжение относится к расстояниям между целевыми слотами и временно сообщает о растяжении, без auto-split. D-06 Open, D-07—D-10 Proposed не изменены автоматически принятием промежуточных результатов.

Firefox, WebGPU, количественный FPS/расширенный нагрузочный benchmark и внешний S1 smoke не запускались. Это не заявленные результаты действия 6; внешняя публикация запрещена пользователем, Preview S0 защищён SSO. S2–S7, финальные спрайты S6 и полный игровой цикл не реализованы.

## Git и демонстрация — история поставки действия 6 и последующее закрытие

Проверен feature/s1-formations, HEAD/upstream `f64af0adf12f87f295122066ecc283c363c219b7`; main/origin/main остаются `8519f198f501e9fba3bfd32693f0306f0043ccd5`. Принятый исходник S0 — `29946cdefb1208c93b61303ed2fcd8dc984cbee1`. Gameplay S1 остаётся незакоммиченным локальным деревом; принятого commit действия 5 или всего S1 нет. Прежние изменения и доказательства сохранены. В действии 6 новых commit/push/merge/deploy или внешних изменений не было.

Локальное демо: http://127.0.0.1:4173/. Итоговая приёмка S1 получена 06.11.2026. Пользователь отдельным поручением разрешил отправку S1 в feature/s1-formations и подготовку промпта для нового чата. Ниже/выше сведения об отсутствии commit/push относятся к поставке действия 6 до этого поручения. Публикация сайта и merge не разрешены; S2 здесь не реализуется. Принятый исходник: `8330ed31ba94b8899889aea58b7c5cdbe420e290`.
