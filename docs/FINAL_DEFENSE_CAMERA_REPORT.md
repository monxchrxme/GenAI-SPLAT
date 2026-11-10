# Финальная оборона и перелистывание камеры — 10.11.2026

`implemented: true` · `awaiting_manual_acceptance: true`

Три обычных поста третьего участка теперь выдвигаются к ближайшему живому синему в своей зоне даже при численном перевесе синих. Радиус обнаружения — 300 единиц от поста, цель центра построения ограничена 200 единицами; без синих в зоне отряд возвращается. Компактное построение позволяет нескольким бойцам вступить в бой рядом друг с другом. Численность, базовый урон, первые два участка и правила победы сохранены. Девианты получили 8 HP вместо 5; скорость, дальность, частота атак и прежняя погоня сохранены. Параметры пробные [P].

Автокамера смотрит на центр выбранной синей группы, а не на переднего бойца, и перелистывает окно только при движении центра в крайних 15% ширины. При обычном шаге окна разница между порогами прямого и обратного перехода — 320 единиц. Плавность перехода, стрелки, удержание камеры при рисовании и сброс на старте сохранены.

Код: `src/core/{config,types}.ts`, `src/enemy/controller.ts`, `src/simulation/simulation.ts`, `src/rendering/{pixiRenderer,presentation}.ts`. Проверки: `tests/unit/{threeSectorMap,deviantMovement,hazardsObjective,viewport}.test.ts`, `tests/smoke/longMap.spec.ts`.

## Проверки

`tests_verified`: во временной копии `/private/tmp/splat-final-camera.dNW99Y` с существующими зависимостями, `NODE=/private/tmp/node-v24.22.2-darwin-arm64/bin/node`:

- `$NODE node_modules/typescript/bin/tsc --noEmit` и `$NODE node_modules/typescript/bin/tsc -p tsconfig.core.json --noEmit`: exit 0.
- `$NODE node_modules/eslint/bin/eslint.js . --max-warnings 0`, `$NODE node_modules/prettier/bin/prettier.cjs --check .`, `$NODE node_modules/vite/bin/vite.js build`: exit 0.
- `$NODE node_modules/vitest/vitest.mjs run`: exit 0, 151 тест в 26 файлах. Проверены атака обычного поста против 24 синих и возврат, выживание девианта после первого залпа шести бойцов, зоны переключения камеры и детерминизм.
- `SMOKE_BASE_URL=http://127.0.0.1:4209 PLAYWRIGHT_CHANNEL=chrome $NODE node_modules/@playwright/test/cli.js test tests/smoke/longMap.spec.ts tests/smoke/threeSectors.spec.ts tests/smoke/combat.spec.ts tests/smoke/hazards.spec.ts tests/smoke/clickMove.spec.ts`: exit 0, 11 тестов. После уточнения ожиданий теста широкого построения он повторно прошёл с `test tests/smoke/longMap.spec.ts -g 'leading soldier'` (1 тест).
- `git diff --check`: exit 0.

## Ручная проверка и передача

1. Открыть локальную сборку `http://127.0.0.1:4209/` и подвести синий отряд к одному из постов третьего участка.
2. Проверить, что обычные красные идут в бой, а при отходе синих возвращаются. Оценить, можно ли разобрать оборону по частям и взять точку с остатком отряда.
3. Сравнить бой с девиантом при сосредоточенной атаке и меньшим отрядом. Оценить 8 HP и общую сложность финала.
4. Сменить направление несколько раз посередине экрана, затем подвести центр группы к краю. Проверить, что окно спокойно в бою и плавно перелистывается у края; проверить стрелки, рисование и «Заново».
5. Полная партия, Firefox, FPS, внешний smoke и остальные QA-гейты не закрыты этой проверкой. Окончательный баланс требует ручной оценки.
6. Локальный HEAD и upstream при старте совпадали на `a71a70ee213c98686608f507a83169529f750bb6`; последний подтверждённый source Preview указан в DEPLOYMENT. Новая работа локальна; публикация отдельным шагом.
