# Research: Meeting File Upload — Technical Implementation

**PRD**: @docs/prd-meeting-file-upload-and-display.md
**Plan**: @docs/plan-meeting-file-upload-and-display.md
**Дата**: 2026-08-17

Цель документа — зафиксировать конкретные технические решения (библиотеки, паттерны, конфигурация) для фаз плана, чтобы реализация не решала архитектурные вопросы на ходу. Ссылки на актуальные версии/CVE проверены веб-поиском на дату документа.

## 1. Зависимости, которые нужно добавить

Сервер уже тянет `@nestjs/platform-express` (`^11.0.1`), но **не** содержит `multer`/`@types/multer` как прямые зависимости (проверено — их нет в `apps/server/node_modules`). Их нужно установить явно:

```bash
pnpm --filter server add multer@^2.2.0
pnpm --filter server add -D @types/multer
```

**Почему именно `^2.2.0`, а не `1.4.x`**: серия 1.4.x-lts несёт несколько DoS-уязвимостей, патченных только в 2.x — CVE-2025-47935 (memory leak/resource exhaustion до 2.0.0), CVE-2025-48997 и CVE-2025-7338 (DoS через malformed multipart, патч в 2.0.1/2.0.2), и ещё два high-severity DoS-фикса в 2.1.0 (февраль 2026). Минимально безопасная версия — `2.1.0`, ставим `^2.2.0` как текущий latest. NestJS 11 + `@nestjs/platform-express` совместимы с multer 2.x — `FileInterceptor`/`FilesInterceptor` — это просто типизированная обёртка над multer middleware, мажорная версия multer не завязана на версию Nest.

Postgres/`docker-compose.yml` поднимает только `postgres` — сам `apps/server` при разработке не контейнеризован (`pnpm start:dev` на хосте), поэтому `STORAGE_DIR` как обычная директория на диске разработчика не требует изменений в docker-compose. Если сервер когда-то будет контейнеризован, `STORAGE_DIR` потребует volume mount — не блокирует эту итерацию, но стоит держать в уме при выборе абстракции хранилища (см. §4).

## 2. Приём файла: `FileInterceptor` + `diskStorage`

Nest использует multer как middleware; для одного файла на запрос — `@UseInterceptors(FileInterceptor('file', multerOptions))`, файл приходит в `@UploadedFile() file: Express.Multer.File`. Поле формы должно называться `file`, чтобы совпасть с фронтендом (см. §7).

```ts
// meeting-files.controller.ts
@Post(':id/files')
@UseGuards(JwtAuthGuard)
@UseInterceptors(
  FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
      const ok =
        ALLOWED_MIME_TYPES.includes(file.mimetype) &&
        ALLOWED_EXTENSIONS.includes(extname(file.originalname).toLowerCase());
      cb(null, ok); // false -> multer просто не подключает файл к request, не бросает
    },
  }),
)
async upload(
  @Param('id') meetingId: string,
  @UploadedFile() file: Express.Multer.File,
  @Req() req: RequestWithUser,
) {
  if (!file) {
    throw new BadRequestException('Недопустимый формат файла');
  }
  return this.meetingFilesService.attach(meetingId, req.user.sub, file);
}
```

**Ключевые технические решения:**

- **`limits.fileSize` в multer — обязательный первый барьер**, как и указано в плане (Фаза 2). Multer обрывает поток на превышении лимита _во время_ чтения (`LIMIT_FILE_SIZE` ошибка), не дожидаясь полной передачи в память — это единственный уровень, который реально экономит bandwidth/диск при слишком большом файле. Валидация размера в DTO/сервисе после того, как файл уже полностью на диске, — это уже поздно, оставляем её только как сообщение об ошибке пользователю.
- **`fileFilter` — это MIME/расширение по `Content-Type` заголовка и имени файла, которые полностью управляются клиентом** (их легко подделать: переименовать `.exe` в `.mp3`, отправить произвольный `Content-Type`). Для этой фичи (аудио/видео-файлы для будущей транскрибации, не исполняемый контент, доверенные пользователи с JWT-авторизацией) достаточно проверки расширения + заявленного mime-type — это соответствует тому, что просит PRD ("допустимые аудио/видео форматы"), не требует глубокой проверки содержимого. Если понадобится защита от спуфинга контента (например, если файлы когда-либо будут раздаваться другим пользователям или обрабатываться небезопасным парсером) — на будущее есть пакет `file-type` для сигнатурной (magic-bytes) проверки после сохранения; **сознательно не включаем в эту итерацию**, т.к. PRD явно выносит обработку файла за скоуп.
- **`fileFilter` cb(null, false) не бросает ошибку сам по себе** — Nest просто не прикрепит `file` к request, поэтому контроллер должен сам проверить `if (!file) throw new BadRequestException(...)` и выдать понятное сообщение (как требует критерий готовности PRD). Альтернатива — `ParseFilePipe` с `FileTypeValidator`/`MaxFileSizeValidator` (декларативный, Nest-нативный способ) вместо ручной проверки в `fileFilter`/контроллере; выбор между ними — вопрос стиля, оба варианта покрывают требования. Рекомендация: **`ParseFilePipe`** — он даёт единообразные 400-ошибки через встроенный `HttpException` и не требует ручного `if (!file)`.

```ts
@UploadedFile(
  new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
      new FileTypeValidator({ fileType: ALLOWED_MIME_REGEX }),
    ],
    exceptionFactory: (error) => new BadRequestException(error),
  }),
)
file: Express.Multer.File,
```

Комбинация: multer `limits.fileSize` как ранний обрыв потока (защита от переполнения диска гигантским файлом) + `ParseFilePipe` как финальная, единообразная 400-валидация с понятным сообщением — обе задачи из Фазы 2 закрываются без дублирования правил (константы `ALLOWED_MIME_TYPES`/`MAX_FILE_SIZE_BYTES` — общие для обоих слоёв, определены в одном файле, как и требует план).

## 3. `diskStorage` и генерация имени файла — не доверять `originalname`

Дефолтная multer `diskStorage` дает контроль над `destination` и `filename`. **Критично: нельзя использовать `file.originalname` как часть пути на диске** — это user-controlled строка, потенциальный path traversal (`../../etc/passwd`) и коллизии имён между встречами/пользователями.

```ts
diskStorage({
  destination: (req, file, cb) => cb(null, storageDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});
```

Оригинальное имя (`fileName` в `MeetingFile`) сохраняется только как **метаданные в БД** для отображения в UI — на диск идёт сгенерированный UUID. Это отделяет "как файл называется для пользователя" от "где физически лежит файл", что и требует абстракция `FilesStorageService` из плана.

## 4. `FilesStorageService` — абстракция над диском

Интерфейс должен быть узким и без утечки деталей multer/диска наружу, чтобы замена на S3 в будущем не требовала менять контроллер/сервис `MeetingFiles`:

```ts
interface FilesStorageService {
  save(file: Express.Multer.File): Promise<{ storagePath: string }>;
  // storagePath — непрозрачный идентификатор для этой реализации;
  // для диска это относительный путь внутри STORAGE_DIR, для S3 был бы object key
}
```

Т.к. `diskStorage` уже физически пишет файл на диск синхронно с приёмом запроса (это multer storage engine, а не то, что происходит "после" контроллера), самый простой способ уложить это в абстракцию — **инжектировать `STORAGE_DIR` в конфигурацию multer через `MulterModule.registerAsync`** (использует `ConfigService`, читает `STORAGE_DIR` из env с дефолтом `apps/server/uploads/`), а `FilesStorageService` держать тонким — фактически он просто описывает, куда `diskStorage` кладёт файл, и предоставляет `resolvePath(storagePath)` для будущего скачивания. Это соответствует тому, что PRD **выносит скачивание/стриминг за скоуп** — сервис не обязан сейчас уметь отдавать файл обратно, только принимать.

`STORAGE_DIR` по умолчанию `apps/server/uploads/`, добавляется в `apps/server/.gitignore` (не в корневой — директория относится только к серверу) и создаётся при старте, если не существует (`fs.mkdirSync(storageDir, { recursive: true })` в `onModuleInit` модуля хранения).

## 5. Prisma-схема (Фаза 1)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())

  createdMeetings Meeting[]     @relation("MeetingCreator")
  uploadedFiles   MeetingFile[] @relation("FileUploader")
}

model Meeting {
  id           String   @id @default(uuid())
  title        String
  date         DateTime
  participants String[]
  createdAt    DateTime @default(now())

  creatorId String
  creator   User   @relation("MeetingCreator", fields: [creatorId], references: [id])

  files MeetingFile[]
}

enum MeetingFileStatus {
  UPLOADED
}

model MeetingFile {
  id          String            @id @default(uuid())
  meetingId   String
  meeting     Meeting           @relation(fields: [meetingId], references: [id])
  fileName    String
  mimeType    String
  sizeBytes   Int
  storagePath String
  status      MeetingFileStatus @default(UPLOADED)
  uploadedById String
  uploadedBy   User             @relation("FileUploader", fields: [uploadedById], references: [id])
  createdAt   DateTime          @default(now())
}
```

Замечания:

- `MeetingFileStatus` как Prisma `enum` (а не голая строка) — точнее отражает "единственное значение сейчас, зарезервировано под будущие", даёт компилятор-проверку при добавлении статусов транскрибации позже, и это идиоматичный Prisma-паттерн для конечного набора значений. Расхождение с планом (`String`) — уточнить при реализации, но enum строго безопаснее при том же объёме работы.
- `sizeBytes` — `Int` в Postgre = `int4`, максимум ~2.1 ГБ. Если `MAX_FILE_SIZE_BYTES` заведомо меньше этого предела (ожидаемо для аудио/видео заметок — сотни МБ), `Int` достаточно; если лимит может приблизиться к 2 ГБ, использовать `BigInt`. Зафиксировать конкретное значение `MAX_FILE_SIZE_BYTES` при реализации Фазы 2 и сверить с этим пределом.
- `onDelete` для `creatorId`/`meetingId`/`uploadedById` не указан по умолчанию (`Restrict` в Prisma) — соответствует тому, что удаление пользователей/встреч не в скоупе этой фичи; если понадобится каскадное поведение, это отдельное решение вне текущего PRD.
- Порядок миграции: сначала обязательно **очистить/пересоздать локальные dev-данные без владельца** (как зафиксировано в плане), т.к. `creatorId String` без `?` не пройдёт `migrate dev` на существующих строках без дефолта/backfill.

## 6. API-контракт (Фаза 3)

`POST /meetings/:id/files`, `multipart/form-data`, поле `file`, под `JwtAuthGuard`.

Порядок проверок в сервисе (важен для корректных кодов ответа):

1. `meeting = await prisma.meeting.findUnique({ where: { id } })` → если `null`, `404 NotFoundException`.
2. `meeting.creatorId !== req.user.sub` → `403 ForbiddenException`.
3. Файл уже прошёл multer `limits`/`ParseFilePipe` на уровне контроллера (400, если не прошёл — Nest вернёт эту ошибку раньше, чем сервис увидит `meetingId`, так как `@UseInterceptors` выполняется до тела метода). **Замечание**: чтобы 404/403 по `meetingId` не терялись за 400 по файлу при одновременно неверном `id` и неверном файле — порядок проверок здесь не критичен для этой фичи (оба кода — валидные ответы клиенту), но если тесты (Фаза 6) фиксируют конкретный приоритет, держать multer-валидацию как "выполняется первой" в голове.
4. Сохранить через `FilesStorageService`, создать `MeetingFile` в БД.

`GET /meetings/:id` — расширить `include: { files: true }` в Prisma-запросе, добавить `creatorId` в response DTO. Response DTO для файла явно перечисляет поля (`id`, `fileName`, `sizeBytes`, `mimeType`, `status`, `createdAt`, `uploadedById`) — **не** `storagePath` (внутренняя деталь реализации хранилища, не должна течь наружу, тем более что путь на диске мог бы использоваться для path traversal, если бы фронтенд когда-то начал строить из него URL).

## 7. Фронтенд: `XMLHttpRequest` с прогрессом (Фаза 5)

`fetch()` не даёт `progress`-событий на upload (`ReadableStream` для request body поддерживается не во всех браузерах и не отражает реальный progress так же прямолинейно, как XHR). Стандартный паттерн — `XMLHttpRequest.upload.onprogress`:

```ts
export function uploadMeetingFile(
  accessToken: string,
  meetingId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<MeetingFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}/meetings/${meetingId}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    // Content-Type НЕ выставлять вручную — браузер сам проставит
    // multipart/form-data с корректным boundary при передаче FormData.

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as MeetingFile);
      } else {
        reject(toApiError(xhr));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Сетевая ошибка'));
    xhr.send(formData);
  });
}
```

Существующий `ApiError`/`apiFetch` в `apps/client/src/lib/api/client.ts` построен вокруг `fetch`; для upload не переиспользовать `apiFetch` напрямую, а завести отдельную функцию (как и указано в плане), но **переиспользовать тип `ApiError`**, чтобы обработка ошибок в UI (`formError`) была единообразной с остальными формами приложения.

**Блокировка повторной отправки** — простое булево состояние (`isUploading`) в компоненте, дизейблящее input/кнопку на время активного XHR; не требует серверного "pending" статуса (см. решение в шапке плана — запись `MeetingFile` создаётся только после успешного сохранения, поэтому нет промежуточного состояния, которое нужно было бы отражать в БД).

**Клиентская валидация** (формат/размер) — те же константы `ALLOWED_EXTENSIONS`/`MAX_FILE_SIZE_BYTES`, что и на сервере. Т.к. клиент и сервер — разные пакеты (`apps/client`, `apps/server`) без общего shared-package в этом workspace (см. корневой `CLAUDE.md`: "два приложения не имеют зависимости друг от друга"), константы **придётся продублировать** в `apps/client` и `apps/server` — это осознанный компромисс этой итерации, а не нарушение "одно место определения" из плана (то правило про дублирование _внутри_ сервера, не про синхронизацию клиент/сервер). Если рассинхронизация станет проблемой, кандидат на решение — общий `packages/shared` в pnpm workspace, но заводить его сейчас было бы преждевременной инфraструктурой под одну фичу.

## 8. Тестирование (Фаза 6)

E2e (`supertest`) для multipart — `.attach()`:

```ts
await request(app.getHttpServer())
  .post(`/meetings/${meetingId}/files`)
  .set('Authorization', `Bearer ${token}`)
  .attach('file', Buffer.from('fake audio content'), {
    filename: 'recording.mp3',
    contentType: 'audio/mpeg',
  })
  .expect(201);
```

Для теста "превышение размера отклонено" — генерировать буфер нужного размера в памяти (`Buffer.alloc(MAX_FILE_SIZE_BYTES + 1)`), не хранить большой файл-фикстуру в репозитории. Тесты, пишущие реальные файлы на диск через `FilesStorageService`, должны использовать тестовый `STORAGE_DIR` (временную директорию, например `os.tmpdir()`), чтобы не засорять рабочую `apps/server/uploads/` и не конфликтовать между прогонами — очистка в `afterAll`.

## 9. Сводка: что добавить в `apps/server/CLAUDE.md` / `apps/client/CLAUDE.md` (Фаза 6, последний пункт)

- Сервер: модель `MeetingFile` + enum `MeetingFileStatus`, `POST /meetings/:id/files`, `FilesStorageService` (диск, `STORAGE_DIR` env), `multer`/`@types/multer` как новая прямая зависимость (не только через `@nestjs/platform-express`), `ParseFilePipe`-валидация.
- Клиент: страница `/meetings/[id]`, `uploadMeetingFile` (XHR, не `apiFetch`), `session.ts` хранит `userId` для `isCreator`.
- Корневой `CLAUDE.md`: если `STORAGE_DIR` начнёт восприниматься как workspace-уровневая инфраструктура (например, понадобится для локального docker-compose сервиса сервера) — обновить тогда, не сейчас (сейчас это чисто серверная деталь).

## Источники

- [How to Handle File Uploads in NestJS](https://oneuptime.com/blog/post/2026-02-02-nestjs-file-uploads/view)
- [CVE-2026-2359: Multer Node.js Middleware DoS Vulnerability](https://www.sentinelone.com/vulnerability-database/cve-2026-2359/)
- [February 2026 Security Releases — Express.js](https://expressjs.com/2026/02/27/security-releases.html)
- [Multer DoS Vulnerability (CVE-2025-7338)](https://zeropath.com/blog/cve-2025-7338-multer-dos-vulnerability)
- [multer | Snyk vulnerability database](https://security.snyk.io/package/npm/multer)
