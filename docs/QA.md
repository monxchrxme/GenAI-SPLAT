# SPLAT! — проверки и ручная приёмка

**09.11.2026.** Первая поставка принята пользователем. Последний локальный набор: 90 unit/integration и 19 Chrome smoke, typecheck/lint/format:check/build прошли. Полные QA боя, карты, исходов и публикации остаются будущими. [Отчёт](DELIVERY1_REPORT.md).


**S1 принят пользователем 06.11.2026 на текущей стадии.** Приняты локальные построения/управление и результаты действия 6: 80 unit/integration, 15 Chrome smoke, typecheck/lint/format:check/build pass. Пользователь отдельно поручил сохранить и отправить весь S1 в feature/s1-formations, подготовить передачу новому чату S2. Merge/deploy и реализация S2 здесь не разрешены; запрет автодеплоя S1 сохраняется. [Приёмка](S1_ACCEPTANCE.md), [отчёт](S1_REPORT.md).




Источник: [MASTER_SPEC §6](MASTER_SPEC.md#6-регрессионный-набор-qa-все-тесты-сохранять), подробные задачи/гейты [PLAN](PLAN.md). S0 добавил локальные unit/integration и production browser smoke. QA-01 принят в объёме S1; QA-07 принят в объёме S1 с будущим расширением для split/merge. Остальные частичные и будущие QA не закрываются общей приёмкой S1. Документальные проверки Bootstrap — в [BOOTSTRAP_REPORT](BOOTSTRAP_REPORT.md); команды и ручной чеклист S0 — в [S0_REPORT](S0_REPORT.md).

## Интеграционная проверка второй поставки — 10.11.2026

На реальной конфигурации карты автоматически проверены два маршрута, бой, пополнение, смерть одновременно с split и во время merge, victory/defeat и повторение журналов команд. Полная победная партия также проверена через локальный Chrome; результат и границы — в [отчёте](DELIVERY2_INTEGRATION_REPORT.md). Сравнение охвата и концентрации относится к конкретным контролируемым сценариям; оно не заменяет ручной оценки баланса. FPS с полным боевым сценарием, Firefox, WebGPU, производительность и внешний deployment не проверялись. Ручные QA и QA-12 сохраняются.

## Регрессионный реестр

| ID | Ожидаемый результат | Вид тестирования | Первый этап применения | Статус |
|---|---|---|---|---|
| QA-01 | 40 агентов принимают многоизломную форму, остаются одной группой. | unit (геометрия/слоты), integration (движение/членство), manual (устойчивость формы) | S1 | local_tests_verified; manual S1 accepted 2026-11-06: three-corner path, 40 identities/membership, bounded movement, exact slots and stable rest |
| QA-02 | split 40 → две корректные непустые группы, сумма 40. | unit, integration; manual (независимые приказы) | S2 | local_tests_verified; delivery 1 accepted |
| QA-03 | merge групп 15 и 25 → группа 40 без дублей. | unit, integration; manual (сближение/выделение) | S3 | local_tests_verified; delivery 1 accepted |
| QA-04 | split группы из одного агента безопасно отклоняется. | unit, integration | S2 | local_tests_verified; delivery 1 accepted |
| QA-05 | смерть агента во время независимых приказов, split или merge правильно очищает ссылки и счётчики. | unit, integration; manual (HUD/выделение) | S5 полностью; S3 — фикстура смерти при merge | local_tests_verified: actual combat deaths during movement, on split tick and during merge; manual HUD/selection pending |
| QA-06 | достижение порога окраски показывает один win-screen, Restart работает. | unit (порог), integration (outcome/reset), e2e, manual | S4 | local_tests_verified: threshold, real-map victory, frozen outcome and Restart; Chrome full victory; manual pending |
| QA-07 | серия быстрых или пустых жестов не ломает состояние или UI. | unit (фильтрация), integration (команды), e2e, manual | S1; расширение S2/S3 | local_tests_verified; manual S1 accepted 2026-11-06: mixed rapid/empty commands, coalesced turns, frame continuity, cancellation/recovery, resize and Restart; split/merge repeated commands locally verified |
| QA-08 | одинаковые seed + журнал команд → одинаковый логический результат независимо от рендера/FPS. | unit, integration; e2e smoke по доступности | S0 — fixed-step/seed основа; полный replay S5 | partial_verified: full victory and defeat seed/command replay; 30/60/144 FPS comparison remains limited to earlier foundation scenario |
| QA-09 | статичный B-static спрайт при перемещении не морфится, не вращается «перекатыванием», не эмитирует непрерывных частиц. | manual; e2e (движение), review rendering | S0 — статичные маркеры; движение S1; финальные спрайты S6 | partial_verified: B-static position-only movement reviewed, stable canvas after arrival; final sprites/S6 pending |
| QA-10 | отдельные отряды достигают разных флангов; карта позволяет минимум два осмысленных параллельных маршрута. | integration (независимые цели), manual, e2e по доступности | S2 — группы; полная планировка S4 | local_tests_verified: independent groups crossed both routes on the current map; manual assessment pending |
| QA-11 | HUD и выделение правильны после split/merge/смерти; результат матча не пересчитывается после окончания. | integration, e2e, manual | S2 — split; S3 merge; S4 outcome; S5 смерть | partial_verified: combat losses, outcome freeze and browser victory/Restart checked; manual and full defeat UI pending |
| QA-12 | Vercel preview и production работают с корректными ассетами, координатами мыши и resize. | e2e (Playwright), manual | S0 — preview; pointer S1; production S7, с разрешением | partial_verified: local S1 pointer/resize/CSS offset at DPR 1/2; S0 Vercel manual checklist accepted; external S1 e2e not_run; full production S7 not_implemented |

Раннее частичное применение не означает закрытия всего QA. Новые проверки сохранять и повторять при изменении смежных механизмов. В частности, fixed steps S0 не заменяют replay S5, локальный preview не заменяет Vercel, а Vercel preview не заменяет production. Restart S0 также не закрывает QA-06 без окраски/win S4.

## Выполненные проверки S0 — 2026-11-05

- `npm ci`: exit 0, 147 пакетов установлено, audit 0 после точного dev-override minimatch. Необязательный install-script fsevents не разрешался; npm вывел предупреждение, не ошибку.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`: exit 0. Дополнительный TS-project без DOM/Node types проверяет чистую границу core/simulation/session.
- `npm run test`: exit 0, 2 файла / 23 теста. ID, группы, ошибочные членства, seed/RNG, frozen snapshot, Restart/очередь/журнал/accumulator, fixed steps и stall, viewport/видимость всех маркеров в четырёх размерах.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:smoke`: exit 0, 1 тест на production dist; macOS 26.6.2 arm64, Google Chrome 156.0.8078.80. 40 объектов рендера, HUD 40/1, статичный canvas по сравнению скриншотов, три Restart и Enter, resize 1440×900 → 900×650 → 1920×1080 → 1440×900, ошибки JS/console/request/HTTP отсутствуют. Снимок просмотрен агентом, не является ручной приёмкой пользователя.
- Vercel URL, Firefox, WebGPU, FPS/стресс, pointer/игровые действия: **not_run** либо **not_implemented** согласно этапу. Ранние sandbox/DNS/типовые ошибки и их устранение перечислены в отчёте.

## Дополнительные проверки по этапам

### S1, действие 1 — локальные указатель/выбор, 06.11.2026

`npm run typecheck/lint/test/format:check/build` (отдельные команды) и `PLAYWRIGHT_CHANNEL=chrome npm run test:smoke` прошли: 35 unit/integration + 3 Chrome smoke. Сохранились прежние 23 теста и 1 smoke S0, добавлены 12 unit/integration и 2 smoke DPR 1/2. Проверены client/world mapping с offset/CSS scale/resize/полями, fixed-step выбор и immutable payload, пустые/быстрые/невалидные команды, Restart, журнал выбора при разных FPS, статичность колец/HUD. JS/console/network/HTTP-ошибок в smoke нет. Первый localhost EPERM устранён разрешённым повтором; зависимости не устанавливались.

Рисования/движения ещё нет, QA-01 и полные QA-07/QA-08/QA-09/QA-12 не закрыты. Ручная оценка UX/дизайна действия 1 ожидается; тесты не заменяют её. [Точные команды, файлы, снимок, локальное демо и чеклист](S1_ACTION_1_REPORT.md). Только принятая подготовка действия 0 отправлена отдельным запросом в `f64af0a` с запретом автодеплоя ветки; действия 1 в удалённом Preview нет, новый deployment не обнаружен.

### S1, действие 0 — только локальная подготовка, 06.11.2026

Сохранены отдельные локальные коммиты приёмки S0 (`8452ba0`) и пользовательского .gitignore (`8fe235e`), от второго создана feature/s1-formations. Это подготовка Git/документов без игровой реализации; статусы QA-01—QA-12 не повышаются. В действии 0 npm ci/typecheck/lint/test/build/browser smoke не запускались: runtime/tests/lockfile не менялись, прежние 23 теста и 1 Chrome smoke остаются историческими результатами S0. Документальная сверка и ручной чеклист подготовки — в STATUS; результат действия ожидает просмотра пользователем.

После S0 промежуточные изменения запускаются, демонстрируются и проверяются локально. Новые Vercel deployment — только на последних стадиях по отдельному поручению; отсутствие нового удалённого smoke не выдаётся за pass. Push/merge — отдельный шаг по явному запросу после приёмки всех изменений соответствующего промежуточного действия; приёмка не разрешает их автоматически. Итоговая ручная приёмка S1 и исходные QA-гейты сохраняются.

### Приёмка и повторная проверка S0 — 2026-11-06

Пользователь подтвердил весь ручной чеклист и предоставил Preview URL/скриншоты. **S0 accepted**, исходный коммит `29946cdefb1208c93b61303ed2fcd8dc984cbee1`; закрыт только гейт foundation/Preview S0, не весь QA-12.

Агент повторил offline `npm ci --offline --cache /private/tmp/splat-npm-cache`, typecheck/lint/test/format:check/build и `PLAYWRIGHT_CHANNEL=chrome npm run test:smoke`: все exit 0, 23 unit/integration + 1 локальный smoke. GitHub SHA и Vercel Git metadata совпали; Preview READY, проект/Node/Vite/команды сборки/GitHub link и production branch main проверены через GET API. Анонимный запрос получает 302 на Vercel SSO: внешний Playwright не запускался, защита не менялась. Опубликованный browser checklist проверен **пользователем**. [Точные команды, ограничения и доказательства](S0_ACCEPTANCE.md).

Первичный технический Production deployment в истории пользователя не означает полной QA-12/S7-приёмки: будущего pointer/resize при рисовании, Firefox, полного игрового сценария и финальной production-публикации ещё нет.

- **S0:** уникальные ID, group.agentIds равны живым агентам своей фракции, одинаковый restart-state и повторяемые fixed steps, 40 видимых маркеров. Reset создаёт чистое состояние. Typecheck/lint/test/build и разрешённый preview; Playwright smoke по доступности.
- **S1:** пустая/короткая/прямая/многоизломная линия, фильтрация дублей, лимиты точек/длины, world-координаты после resize, превью, выделение, без телепорта/дрожания, натяжение без auto-split.
- **S2:** разрез 40, одного агента, крайних участков, быстрые повторы; два уникальных Group ID, без потерь/дублей; явное правило целей после split, независимые приказы. Демонстрация для обсуждения D-06 без самостоятельного утверждения.
- **S3:** merge(15,25), дальнее сближение вместо мгновенного merge, repeated click, split→merge→split, неверная фракция, пустая группа, фикстура смерти при сближении; однократное объединение и явное разрешение старых целей.
- **S4:** owner/control, детерминированная перекраска, победный порог, win один раз, заморозка влияния после итога и чистый Restart; центр/два фланга/2–4 зоны, разделение ускоряет покрытие.
- **S5:** синхронное удаление умерших из групп/HUD, смерть при split/merge, нет двойных ударов, поражение при нуле синих, детерминированный противник и seed+commands replay.
- **S6:** B-static в движении, нет emitter на move/update; контраст, большие группы, mouse hitboxes и resize; FPS на базовом/нагрузочном сценарии; обучение с новым человеком без устных пояснений, исправление неоднозначных действий.
- **S7:** полный QA-01—QA-12, code review/мёртвый код/зависимости/scope, Chromium/Firefox, 40 агентов и стресс-набор, JS console и ассеты, preview/production по разрешению, точные версия/commit/date/URL.

## Definition of Ready и Definition of Done

**Definition of Ready:** цель этапа, файловые границы, observable behavior, данные/исключения, конфигурируемые гипотезы, список тестов и способ запуска согласованы.

**Definition of Done:** код + тесты + typecheck/lint/build успешны; инварианты соблюдены; QA смежных этапов не регрессировали; пользователь увидел демо и принял; README/DECISIONS/CHANGELOG обновлены. Если нельзя запустить тест, агент сообщает об этом явно. Дополнительно STATUS содержит фактические проверки, приёмку и handoff. Для S−1 применяется документальный гейт без требования создавать код или устанавливать зависимости.

## Процедура будущей приёмки S0–S7

1. Проверить реальное состояние, прочитать обязательные документы и выбрать только разрешённый этап. Зафиксировать цель, границы и гипотезы.
2. Выполнить необходимую реализацию и проверки согласно этапу. После S0 доступны `npm ci` при необходимости установки, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`; точную smoke-команду определить в S0. На S7 обязателен `npm ci` и Playwright Chromium/Firefox. На S−1 команды npm не выполнять.
3. В отчёте записать точные команды, exit status, фактический результат, среду и ограничения. Незапущенную проверку обозначить как not_run, отсутствующую — not_implemented; недоступность не означает pass.
4. Показать демо и чеклист гейта. Ручной smoke расширяется по этапам до draw → split → отдельные приказы → merge → paint → enemy combat → win/lose → restart. Проверить Pause, подсказки, пустые/повторные действия и resize там, где реализованы.
5. Обновить STATUS/CHANGELOG, отметить Proposed/Open в DECISIONS. Записать implemented и tests_verified отдельно; ожидать ручной приёмки, не переводить в accepted самостоятельно.
6. После явной приёмки записать подтверждение и фактический commit hash при наличии Git, затем новый чат для следующего этапа. Push/merge, remote, подключение аккаунтов и production требуют отдельного разрешения. URL проверить фактически.

## Исторический чеклист ручной приёмки S−1

- [ ] Просмотрены AGENTS, навигация README/SPEC и полное MASTER_SPEC.
- [ ] План содержит S−1.1—S−1.4 и все подзадачи/гейты S0–S7, будущие этапы не запущены.
- [ ] Различаются Approved/Proposed/Open; D-06 не закрыт, D-07—D-10 не утверждены за заказчика.
- [ ] A+B/B-static, просторная арена, HUD без логотипа, стек, отсутствие runtime GenAI/backend согласованы между документами.
- [ ] Два переданных moodboard учтены; динамические эффекты/лица не становятся требованиями или ассетами.
- [ ] Отчёт целостности и handoff просмотрены; исторические расхождения §8 отмечены.
- [ ] Человек явно принял S−1; до этого поле manual_acceptance остаётся pending, принятый commit — not_available.

Этот исторический список S−1 не заполнялся агентом от имени человека; общая приёмка S−1 получена 05.11.2026. S0 принят пользователем 06.11.2026 подтверждением всех пунктов отдельного чеклиста в S0_REPORT. Основание и пределы — S0_ACCEPTANCE. Автоматические результаты сами по себе не означают accepted; S1 по-прежнему требует отдельного поручения.
