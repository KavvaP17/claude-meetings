# Plan: User Profile & Profile Edit

**PRD**: @docs/prd-user-profile-and-edit.md
**Дата**: 2026-08-24

## Технические решения, зафиксированные при планировании

- **`GET /users/me` возвращает `createdAt` сверх минимального набора `{ id, email, name, avatarUrl }`** из критерия готовности — без этой даты недостижим отдельный критерий «`/profile` отображает ... дату регистрации», а второго источника этой даты в скоупе нет.
- **Эндпоинт загрузки аватара — `POST /users/me/avatar`** (multipart/form-data, поле `avatar`, `JwtAuthGuard`), переиспользующий инфраструктуру `apps/server/src/files/` (тот же `MulterModule`/`FilesStorageService`, что и `POST /meetings/:id/files`) с отдельными константами допустимых типов (`image/jpeg`, `image/png`, `image/webp`) и лимита (5 МБ). PRD описывает только сам факт переиспользования механизма хранения файлов, но не называет маршрут явно — этот эндпоинт сохраняет файл и сразу обновляет `avatarUrl` пользователя, возвращая обновлённый профиль.
- **`uploads/` — общая директория `apps/server/uploads/` (`STORAGE_DIR`)**, та же, что уже используется для файлов встреч; упоминание `apps/api/uploads/` в PRD не соответствует реальной структуре репозитория (приложение называется `apps/server`), считаем это опиской.
- **Смена пароля** переиспользует `bcrypt.compare`/хэширование по аналогии с `AuthService`/`UsersService.create`, но не трогает JWT — существующий токен остаётся валидным до истечения (см. «Технические ограничения» в PRD).

## Фазы реализации

### Фаза 1: База данных и чтение профиля (Tracer Bullet)

**Цель**: Дать модели `User` новые поля и минимальный рабочий путь «токен → данные профиля» через `GET /users/me`.
**Затрагивает**: database, backend
**Задачи**:

- [] Добавить поля `name String?` и `avatarUrl String?` в модель `User` в `apps/server/prisma/schema.prisma`, прогнать `pnpm prisma migrate dev --name add-user-profile-fields` в `apps/server`
- [] Добавить `UsersService.findById(id)` (возвращает `User | null`)
- [] Создать `UsersController` (`src/users/users.controller.ts`) под `JwtAuthGuard` с `GET /users/me`, читающим `request.user.sub`
- [] Добавить `UserProfileResponseDto` (`id`, `email`, `name`, `avatarUrl`, `createdAt`), не раскрывающий `password`
- [] e2e-тест `test/users.e2e-spec.ts`: успешный `GET /users/me` возвращает ожидаемую форму; 401 без токена

**Критерии готовности**: авторизованный запрос к `GET /users/me` возвращает `{ id, email, name, avatarUrl }` (плюс `createdAt`) для только что созданного пользователя.

### Фаза 2: Backend — обновление профиля (`PATCH /users/me`)

**Цель**: Позволить сохранять имя и/или путь к аватару с валидацией.
**Затрагивает**: backend
**Задачи**:

- [] Добавить `UpdateUserProfileDto` (`name?: string`, `avatarUrl?: string`) с `class-validator` (оба поля опциональны, но валидируются, если присутствуют)
- [] Добавить `UsersService.updateProfile(id, dto)`
- [] Добавить `PATCH /users/me` в `UsersController` под `JwtAuthGuard`
- [] e2e-тесты: успешное обновление `name`, успешное обновление `avatarUrl`, 400 на невалидные данные, 401 без токена

**Критерии готовности**: `PATCH /users/me` обновляет `name` и `avatarUrl` и возвращает 400 на невалидные данные.

### Фаза 3: Backend — загрузка аватара

**Цель**: Дать эндпоинт загрузки файла аватара с переиспользованием существующего механизма хранения.
**Затрагивает**: backend
**Задачи**:

- [] Завести константы допустимых MIME-типов (`image/jpeg`, `image/png`, `image/webp`) и лимита 5 МБ для аватаров (по аналогии с `apps/server/src/files/files.constants.ts`, но не смешивая с константами файлов встреч)
- [] Добавить `POST /users/me/avatar` (multipart/form-data, `FileInterceptor('avatar')`, `JwtAuthGuard`) в `UsersController` или выделенный контроллер, переиспользуя `FilesStorageService` для сохранения на диск
- [] После сохранения файла обновлять `avatarUrl` пользователя и возвращать `UserProfileResponseDto`
- [] e2e-тесты: успешная загрузка и обновление `avatarUrl`, отклонение недопустимого формата, отклонение превышения размера, 401 без токена

**Критерии готовности**: загруженный аватар доступен по статическому URL и путь сохраняется в `avatarUrl` пользователя.

### Фаза 4: Backend — смена пароля

**Цель**: Дать эндпоинт смены пароля с проверкой старого пароля.
**Затрагивает**: backend
**Задачи**:

- [] Добавить `ChangePasswordDto` (`oldPassword: string`, `newPassword: string`, минимум 8 символов — как у `RegisterDto`)
- [] Добавить `UsersService.changePassword(id, oldPassword, newPassword)`: `bcrypt.compare` со старым хэшем, при несовпадении — ошибка; при совпадении — хэшировать и сохранить новый пароль
- [] Добавить `POST /users/me/change-password` в `UsersController` под `JwtAuthGuard`, маппинг ошибки несовпадения пароля на 400
- [] e2e-тесты: 200 при верном старом пароле, 400 при неверном старом пароле, 400 при невалидном новом пароле, 401 без токена

**Критерии готовности**: `POST /users/me/change-password` возвращает 200 при верном старом пароле и 400 при неверном.

### Фаза 5: Frontend — страница профиля (`/profile`, read-only)

**Цель**: Показать пользователю его текущие данные.
**Затрагивает**: frontend
**Задачи**:

- [] Добавить `getCurrentUser(accessToken)` (`GET /users/me`) в `apps/client/src/lib/api/users.ts`, тип `UserProfile { id, email, name, avatarUrl, createdAt }`
- [] Создать `apps/client/src/app/profile/page.tsx` (client component, обёрнутый `useRequireSession`, по аналогии с `/meetings/[id]`)
- [] Отобразить аватар (или заглушку, если `avatarUrl` пуст), имя (или email, если имя не задано), email и дату регистрации (`createdAt`, форматированную как в `page.tsx`/`Meeting` через `Intl.DateTimeFormat`)
- [] Добавить кнопку «Редактировать профиль», ведущую на `/profile/edit`
- [] Прогнать разметку через skill `ui-ux-pro-max` (согласно правилу в `apps/client/CLAUDE.md`) и поправить то, что она укажет

**Критерии готовности**: страница `/profile` отображает актуальные имя/email, аватар и дату регистрации.

### Фаза 6: Frontend — редактирование профиля (`/profile/edit`)

**Цель**: Дать форму с тремя независимыми секциями — имя, аватар, смена пароля.
**Затрагивает**: frontend
**Задачи**:

- [] Добавить `updateProfile(accessToken, { name?, avatarUrl? })` (`PATCH /users/me`), `uploadAvatar(accessToken, file)` (`POST /users/me/avatar`) и `changePassword(accessToken, { oldPassword, newPassword })` в `apps/client/src/lib/api/users.ts`
- [] Создать `apps/client/src/app/profile/edit/page.tsx` (client component, `useRequireSession`) с секцией имени (текстовое поле + сохранить), сохраняющей независимо через `updateProfile`
- [] Добавить секцию аватара с drag-and-drop и превью перед загрузкой, отправляющую файл через `uploadAvatar` независимо от остальных секций (клиентская валидация типа/размера аналогично `src/lib/api/file-validation.ts`)
- [] Добавить секцию смены пароля (старый пароль, новый пароль дважды, клиентская проверка совпадения) через `changePassword`, с обработкой ошибки «Неверный текущий пароль» (400) в `role="alert"` баннере, по аналогии с `formError` в `/meetings/new`
- [] Прогнать форму через skill `ui-ux-pro-max` и поправить то, что она укажет

**Критерии готовности**: `/profile/edit` позволяет сохранить имя, загрузить аватар и сменить пароль независимо друг от друга.

### Фаза 7: Frontend — обновление шапки главной страницы

**Цель**: Показать в шапке `/` аватар и имя вместо email, со ссылкой на профиль, без перезагрузки после редактирования.
**Затрагивает**: frontend
**Задачи**:

- [] В `apps/client/src/app/page.tsx` загрузить профиль через `getCurrentUser` и заменить `session.email` в шапке на аватар (если есть `avatarUrl`) + имя (если есть `name`, иначе email)
- [] Добавить ссылку из шапки на `/profile`
- [] Убедиться, что после сохранения на `/profile/edit` и возврата на `/` шапка показывает обновлённые данные без ручной перезагрузки (рефетч профиля при переходе на `/`, т.к. JWT не обновляется — см. технические ограничения PRD)
- [] Прогнать изменения шапки через skill `ui-ux-pro-max`

**Критерии готовности**: после сохранения имени/аватара шапка главной страницы отображает обновлённые данные без перезагрузки.

### Фаза 8: Тесты и типизация

**Цель**: Убедиться, что весь новый функционал покрыт e2e-тестами и проходит строгую типизацию.
**Затрагивает**: backend, frontend
**Задачи**:

- [] Прогнать `pnpm test:e2e` в `apps/server` — все новые эндпоинты (`GET /users/me`, `PATCH /users/me`, `POST /users/me/avatar`, `POST /users/me/change-password`) покрыты успешным путём и ошибками валидации
- [] Прогнать `pnpm typecheck` (или `tsc --noEmit`, если отдельного скрипта нет) в обоих приложениях без ошибок
- [] Ручная проверка в браузере (`pnpm dev`): просмотр `/profile`, независимое сохранение имени/аватара/пароля на `/profile/edit`, обновление шапки без перезагрузки
- [] Обновить `apps/server/CLAUDE.md` (модуль `UsersController`, новые эндпоинты, поля `User`) и `apps/client/CLAUDE.md` (страницы `/profile`, `/profile/edit`, изменения шапки)

**Критерии готовности**: все новые API-эндпоинты покрыты e2e-тестами, `npm run typecheck` проходит без ошибок.
