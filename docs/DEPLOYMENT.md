# SPLAT! — подготовка GitHub → Vercel для S0

Состояние на 05.11.2026: **локальный build готов, Vercel preview не выполнен, URL отсутствует**. Пользователь разрешил подключить указанный remote; подключение Vercel, push/merge и публикация требуют отдельного разрешения. Ни одна из следующих команд публикации не выполнялась.

**Уточнение 06.11.2026:** [официальная документация Vercel](https://vercel.com/docs/deployments/environments#first-deployment) прямо указывает: первый deployment нового проекта всегда Production, включая `--target=preview` и feature-ветку. Создание пустого проекта не отменяет это правило. Прежняя инструкция недостаточно учитывала этот случай. До отдельного решения о первичном техническом Production deployment нельзя обещать preview-only путь нового проекта. Код игры и MASTER_SPEC не менялись, публикация не выполнялась.

## Уже выполнено локально

Git создан; принятая документация S−1 сохранена в `main`:

```text
8519f198f501e9fba3bfd32693f0306f0043ccd5  docs: preserve accepted S-1 baseline
```

Текущая ветка — `feature/s0-foundation`; S0 остаётся в рабочем дереве, приёмка pending. Origin:

```text
https://github.com/monxchrxme/GenAI-SPLAT-.git
```

`git ls-remote --heads origin` завершился exit 0 без вывода: на момент проверки удалённых веток не было. Локальный `git remote add` настраивает адрес, не публикует файлы и не подключает Vercel/GitHub-интеграцию аккаунта. Повторять `git init`, дописывать второе название в README или добавлять remote заново не нужно.

`vercel.json` подготовлен для статического проекта:

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

## После отдельного разрешения: безопасная последовательность preview

1. Сверить `git status --short --branch`, `git remote -v` и заново `git ls-remote --heads origin`. Если remote получил историю, сначала изучить её; не применять force и не переписывать чужие коммиты.
2. Отдельно разрешить review-коммит S0 и отправку веток. Такой коммит в feature-ветке — кандидат для preview, **не принятый S0 и не merge в main**. Перед staging просмотреть diff; не добавлять секреты и игнорируемые `node_modules`, `dist`, `.vercel`, отчёты.
3. Если remote всё ещё пуст, разрешённый push `main` отправляет только принятый S−1; feature-ветка публикует кандидат S0. Команды ниже — инструкции, а не выполненные операции:

```sh
git push -u origin main
# После просмотра и фиксации согласованного состава S0 в feature-ветке:
git push -u origin feature/s0-foundation
```

4. Для нового Vercel-проекта сначала согласовать отдельное исключение для первичного технического **Production deployment** либо оставить гейт открытым. Это обязательная классификация первого деплоя платформой, даже при `--target=preview`. На `main` пока только документация; не менять production branch на feature и не выполнять merge ради деплоя. Предложение [P], не выполнено и не утверждено: создать/связать проект через CLI, после отдельного разрешения выполнить `npx vercel@latest deploy --prod --skip-domain`, затем `npx vercel@latest deploy --target=preview`. [Флаг --skip-domain](https://vercel.com/docs/cli/deploy#skip-domain) предотвращает автоматическое назначение доменов, но deployment остаётся Production и его уникальный URL может быть доступен согласно настройкам защиты; это не обещание приватности. Если проект уже имеет deployment, даже неуспешный, следующий `--target=preview` может использовать обычный Preview workflow. Не удалять историю деплоев ради повторной попытки. Подключение GitHub выполняется в Settings → Git, production branch оставляется `main`; Preview проверяется по фактическому Environment в панели, не только по виду URL.
5. Получить реальный URL успешного Preview deployment, записать его, проверить в браузере: 40/1, Restart, resize, JS console и ассеты. При deployment protection использовать разрешённый доступ, не сохранять bypass-токены в файлах.
6. При доступном для Playwright preview можно использовать `SMOKE_BASE_URL=https://<фактический-preview-host> PLAYWRIGHT_CHANNEL=chrome npm run test:smoke` после разрешения. URL и успешность нельзя подставлять заранее; защита входа может потребовать ручной smoke.
7. Только после проверки URL обновить preview-гейт в STATUS/QA/S0_REPORT; `accepted` устанавливать лишь по сообщению человека. Merge, push принятого main и production требуют своего разрешения; S1 всё равно начинается отдельным поручением.

Текущий гейт: `preview = not_run_not_authorized`; production = S7 / not_started.
