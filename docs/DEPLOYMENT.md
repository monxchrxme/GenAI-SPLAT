# SPLAT! — GitHub → Vercel: фактическое состояние после S0

Состояние на **06.11.2026: S0 accepted**, GitHub/Vercel настроены и Preview опубликован **пользователем вручную**. Агент повторил локальные проверки и проверил настройки/историю через GET API; новых публикаций не выполнял. [Preview](https://genai-splat-dqhs48lqm-great-chr.vercel.app/) — READY, принятый SHA `29946cdefb1208c93b61303ed2fcd8dc984cbee1`. Полные действия, времена и доказательства — [S0_ACCEPTANCE](S0_ACCEPTANCE.md).

**История первичной настройки:** первый deployment нового проекта всегда Production, включая `--target=preview`; это было уточнено 06.11.2026 по [официальной документации](https://vercel.com/docs/deployments/environments#first-deployment). В существующем genai-splat уже есть технический Production и Preview, созданные пользователем через CLI. Повторять bootstrap не нужно. Историю deployment не удалять ради получения Preview; при удалении всех записей правило первого Production применяется снова. Назначение доменов и применение `--skip-domain` при первичном запуске отдельно не проверялись; S7 не считается выполненным.

## Уже выполнено локально

Git создан; принятая документация S−1 сохранена в `main`:

```text
8519f198f501e9fba3bfd32693f0306f0043ccd5  docs: preserve accepted S-1 baseline
```

Текущая ветка — `feature/s0-foundation`, upstream `origin/feature/s0-foundation`, принятый S0-коммит `29946cdefb1208c93b61303ed2fcd8dc984cbee1`. Пользователь создал и отправил его, main тоже отправлен, merge не выполнен. Origin после переименования:

```text
https://github.com/monxchrxme/GenAI-SPLAT.git
```

`git ls-remote --heads origin` 06.11.2026: exit 0, feature = `29946cd`, main = `8519f19`, совпадают с локальными ссылками. Project API подтвердил GitHub link `monxchrxme/GenAI-SPLAT` и production branch `main`. Пользовательское дополнение `.gitignore` для `.vercel`/`.env*` сохранено; .vercel, env, node_modules и dist не отслеживаются Git. Повторять git init/remote add или импортировать второй Vercel-проект не нужно.

Настройки vercel.json и Vercel Project API совпадают:

| Настройка | Значение |
|---|---|
| Root Directory | корень репозитория |
| Framework Preset | Vite |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment Variables | не требуются |

SSR, функции и backend отсутствуют. Moodboard не входят в dist. Проверено по [официальному руководству Vercel для Vite](https://vercel.com/docs/frameworks/frontend/vite) и [документации Vite static deploy](https://vite.dev/guide/static-deploy).

## Данные развёртывания и доступа

- Project: `genai-splat`, `prj_xY00Pd9x8HbmTJOGycXBJlXjSGbj`.
- Preview: `dpl_67wGmHp1budVC1XHHGMtCUhmxzKY`, [URL](https://genai-splat-dqhs48lqm-great-chr.vercel.app/), READY, source CLI, branch feature/s0-foundation, SHA 29946cd. CLI показывает target preview; в REST API для этого Preview target null.
- Первичный технический Production: `dpl_493p8K6LBVZby5Rr4YNMCE7sSLq1`, source CLI, тот же SHA, READY; создан пользователем до Preview. Это не merge в main и не финальный релиз S7.
- Защита Project API: `all_except_custom_domains`. Анонимный HTTP-запрос к Preview получает 302 на Vercel SSO; опубликованный browser smoke подтверждён пользователем, remote automated e2e без авторизации not_run. Защита не менялась, bypass-токены агент не создавал.
- `.vercel/project.json` — локальная связь CLI с проектом, не включать её/авторизацию/env в Git. Node 24.22.2 и CLI 65.11.0 доступны в текущей среде; временные пути не гарантированы после очистки /private/tmp.

## Следующие этапы и публикации

1. S0 принят; для S1 нужен новый основной чат и отдельное поручение. Принятую исходную основу брать из `29946cdefb1208c93b61303ed2fcd8dc984cbee1`; main пока S−1.
2. Записи приёмки и прежнее дополнение .gitignore остаются локальными изменениями. Перед следующей веткой сверить status/diff и оформить их сохранение; не перезаписывать пользовательские файлы.
3. Commit/push/merge и новые внешние публикации выполняются в рамках отдельного разрешения. Особенно учитывать: push/merge в main связан с автоматическим Production deployment Vercel, поэтому не делать его скрыто как техническую подготовку S1.
4. Для следующей разрешённой feature-публикации использовать существующий genai-splat и Preview workflow; перед действиями сверить linked project, scope, GitHub repo и production branch main. Повторно project create или production bootstrap не нужны.
5. После публикации проверять фактические Environment/READY, исходный Git SHA и новый URL. Для разрешённого CLI Preview после существующей истории используется `npx vercel@latest deploy --target=preview`; это инструкция, в текущей проверке команда не выполнялась.
6. Внешний Playwright при SSO нельзя объявлять успешным по одному Ready. Применять разрешённый доступ либо явно отделять пользовательский browser checklist от metadata verification; защиту самовольно не отключать.
7. Полный production-релиз, Chromium/Firefox, pointer/resize со всеми механиками и весь QA-01—QA-12 остаются S7. Приёмка S0 не является разрешением выполнить S1–S7 или production-релиз автоматически.

Текущий гейт S0: **verified** по пользовательскому browser checklist и агентской проверке Preview/READY/SHA. S7: **not_started**.
