# P4 Patient File Storage Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace patient-file local disk emulation with secure S3-compatible storage, signed download URLs, and delayed object cleanup.

**Architecture:** Keep the P4 boundary from the previous stabilization step: member uploads still go through the NestJS API, while the API owns validation, object keys, metadata persistence, and short-lived read URLs. Add a focused storage adapter under the `files` module instead of introducing a broad platform storage framework.

**Tech Stack:** Turborepo, pnpm, NestJS, TypeORM, BullMQ, S3-compatible object storage, AWS SDK v3, Vitest, TypeScript, ESLint, Prettier.

---

## Context

The previous P4 stabilization commit (`c60beb9 feat(apps): stabilize P4 patient portal workflows`) completed CMS webhook determinism, Redis-backed consent versions, typed P4 API client services, and member route/API cleanup. Its plan explicitly left patient file storage hardening as the next P4 item.

Current implementation findings:

- `apps/api/src/modules/files/files.service.ts` writes uploaded buffers to `uploads/patient-files` with `fs.writeFileSync` and returns local `/uploads/...` URLs.
- `apps/api/src/modules/files/files.service.ts` already validates max size and MIME type, but there is no extension validation, storage abstraction, S3 upload, presigned URL generation, or S3 object deletion.
- `apps/api/src/modules/files/files.controller.ts` uses `FileInterceptor` with an in-memory file and a 10 MB Multer size limit.
- `apps/api/src/config/validation.schema.ts` has generic optional `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, and `S3_ENDPOINT`, but P4 docs call for patient-file specific S3-compatible configuration.
- `apps/api/.env.example` is missing P3/P4 S3 variables entirely.
- `apps/api/src/modules/queue/queue.module.ts` registers `video-queue`, `email-queue`, `sms-queue`, and `in-app-queue`; there is no dedicated `files-queue` or worker.

Relevant docs:

- `docs/4 Patient Portal and Strapi CMS/05-api-specification.md:146-250`
- `docs/4 Patient Portal and Strapi CMS/04-database-schema.md:82-112`
- `docs/CROSS_PHASE_DEPENDENCIES.md:69-77`
- `docs/2026-05-15-master-plan-gap-assessment-and-p4-stabilization-plan.md:387-431`

---

## File Map

**API Dependencies and Config**

- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/src/config/validation.schema.ts`
- Modify: `apps/api/.env.example`

**Files Module Storage Boundary**

- Create: `apps/api/src/modules/files/storage/files-storage.module.ts`
- Modify: `apps/api/src/modules/files/files.module.ts`
- Modify: `apps/api/src/modules/files/files.service.ts`
- Create: `apps/api/src/modules/files/storage/patient-file-storage.service.ts`
- Create: `apps/api/src/modules/files/storage/patient-file-storage.service.spec.ts`
- Create: `apps/api/src/modules/files/files.service.spec.ts`

**Async Cleanup Queue**

- Modify: `apps/api/src/modules/queue/queue.module.ts`
- Create: `apps/api/src/modules/queue/workers/files.worker.ts`
- Create: `apps/api/src/modules/queue/workers/files.worker.spec.ts`
- Import: `apps/api/src/modules/files/storage/files-storage.module.ts`

**Optional Member Verification Only**

- Inspect: `apps/member/src/app/(portal)/records/upload/page.tsx`
- Inspect: `packages/api-client/src/services/patient-files.service.ts`
- Modify only if API response shape or signed URL naming changes.

---

## Chunk 1: Lock Patient File Service Behavior

### Task 1: Add Failing Tests For Upload Validation And Storage Calls

**Files:**

- Create: `apps/api/src/modules/files/files.service.spec.ts`
- Inspect: `apps/api/src/modules/files/files.service.ts`
- Inspect: `apps/api/src/modules/files/entities/patient-file.entity.ts`

- [ ] **Step 1: Create the test scaffold**

Mock the TypeORM repository, the future `PatientFileStorageService`, and the future files queue dependency. Keep the repository mock minimal: `create`, `save`, `findOne`, `update`, `createQueryBuilder`, and `findAndCount` only where needed.

```ts
const filesRepo = {
  create: vi.fn((value) => value),
  save: vi.fn(async (value) => ({ ...value, id: 'file-id' })),
  findOne: vi.fn(),
  update: vi.fn(),
};

const storage = {
  putObject: vi.fn(),
  getSignedReadUrl: vi.fn(),
  deleteObject: vi.fn(),
};

const filesQueue = {
  add: vi.fn(),
};
```

- [ ] **Step 2: Write a failing test for S3 upload and metadata persistence**

```ts
it('uploads the patient file to S3-compatible storage and persists metadata', async () => {
  storage.putObject.mockResolvedValue(undefined);

  await service.upload(
    {
      originalname: 'lab-result.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('pdf'),
    },
    'patient-1',
    'appointment-1',
    'Lab result',
  );

  expect(storage.putObject).toHaveBeenCalledWith(
    expect.objectContaining({
      key: expect.stringMatching(/^patient-files\/patient-1\/[0-9a-f-]+\.pdf$/),
      body: Buffer.from('pdf'),
      contentType: 'application/pdf',
    }),
  );
  expect(storage.putObject.mock.calls[0][0].key).not.toContain('lab-result');
  expect(filesRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({
      patientId: 'patient-1',
      appointmentId: 'appointment-1',
      fileName: 'lab-result.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      description: 'Lab result',
    }),
  );
});
```

- [ ] **Step 3: Write failing tests for upload security validation**

Cover these cases:

- `FILE_TOO_LARGE` for files over 10 MB.
- `FILE_TYPE_NOT_ALLOWED` for unsupported MIME types.
- `FILE_TYPE_NOT_ALLOWED` for mismatched extension, such as `report.exe` with `application/pdf`.
- Accepted extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`.

- [ ] **Step 4: Write a failing test for signed URL delegation**

```ts
it('returns a 1-hour signed read URL for an owned file', async () => {
  filesRepo.findOne.mockResolvedValue({
    id: 'file-id',
    patientId: 'patient-1',
    s3Key: 'patient-files/patient-1/file.pdf',
    isDeleted: false,
  });
  storage.getSignedReadUrl.mockResolvedValue({
    signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
    expiresAt: '2026-05-16T11:00:00.000Z',
  });

  await expect(
    service.getSignedUrl('file-id', { sub: 'patient-1', role: 'patient' }),
  ).resolves.toEqual({
    signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
    expiresAt: '2026-05-16T11:00:00.000Z',
  });
});
```

- [ ] **Step 5: Write a failing test for soft-delete cleanup enqueue**

Assert soft-delete updates DB metadata and enqueues a cleanup job with a 5-minute delay.

```ts
expect(filesQueue.add).toHaveBeenCalledWith(
  'delete-object',
  { key: 'patient-files/patient-1/file.pdf' },
  expect.objectContaining({ delay: 5 * 60 * 1000 }),
);
```

- [ ] **Step 6: Run the focused tests and verify failure**

Run:

```bash
pnpm --filter @clinic-platform/api test -- files.service.spec.ts
```

Expected:

- FAIL because the service still writes local files and has no storage adapter or cleanup queue.

---

## Chunk 2: Add S3-Compatible Storage Adapter

### Task 2: Add AWS SDK v3 Dependencies

**Files:**

- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add the focused dependencies**

Run:

```bash
pnpm --filter @clinic-platform/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Expected:

- `apps/api/package.json` includes both dependencies.
- `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Run package install verification**

Run:

```bash
pnpm --filter @clinic-platform/api check-types
```

Expected:

- May still FAIL until the adapter is implemented, but dependency resolution should not fail.

### Task 3: Add Env Validation For Patient File Storage

**Files:**

- Modify: `apps/api/src/config/validation.schema.ts`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Extend S3 schema without hardcoding secrets**

Add these env vars, keeping them optional for test/local boot until the files module actually needs the storage client:

```ts
S3_PATIENT_FILES_BUCKET: Joi.string().optional(),
S3_ACCESS_KEY_ID: Joi.string().optional(),
S3_SECRET_ACCESS_KEY: Joi.string().optional(),
S3_FORCE_PATH_STYLE: Joi.boolean().default(true),
S3_SIGNED_URL_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(3600),
```

Keep existing generic `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` temporarily only if other P3 code still references them. Do not remove or rename unrelated env vars in this plan.

- [ ] **Step 2: Update `.env.example`**

Add a P3/P4 object storage section:

```dotenv
# ====================================
# S3 / MinIO Object Storage
# ====================================
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
S3_PATIENT_FILES_BUCKET=patient-files
S3_SIGNED_URL_TTL_SECONDS=3600
```

- [ ] **Step 3: Verify config compiles**

Run:

```bash
pnpm --filter @clinic-platform/api check-types
```

Expected:

- PASS if only config changed, or unrelated current type failures must be documented before proceeding.

### Task 4: Implement `PatientFileStorageService` And `FilesStorageModule`

**Files:**

- Create: `apps/api/src/modules/files/storage/files-storage.module.ts`
- Create: `apps/api/src/modules/files/storage/patient-file-storage.service.ts`
- Create: `apps/api/src/modules/files/storage/patient-file-storage.service.spec.ts`
- Modify: `apps/api/src/modules/files/files.module.ts`

- [ ] **Step 1: Write adapter tests first**

Test cases:

- Builds an S3 client from `ConfigService` without exposing secret values.
- Passes `S3_ENDPOINT`, `S3_REGION`, credentials, and `S3_FORCE_PATH_STYLE` into `S3Client` so local MinIO and other S3-compatible providers do not silently target AWS defaults.
- `putObject()` sends bucket, key, body, content type, and content length.
- `getSignedReadUrl()` uses `GetObjectCommand` and default 3600-second TTL.
- `deleteObject()` sends bucket and key.
- Throws a clear boot-time error when required values are missing and a storage operation is attempted.

Run:

```bash
pnpm --filter @clinic-platform/api test -- patient-file-storage.service.spec.ts
```

Expected:

- FAIL until the adapter exists.

- [ ] **Step 2: Implement config resolution**

Read and validate these values from `ConfigService` at operation time or constructor time:

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_PATIENT_FILES_BUCKET`
- `S3_ACCESS_KEY_ID` with fallback to `S3_ACCESS_KEY`
- `S3_SECRET_ACCESS_KEY` with fallback to `S3_SECRET_KEY`
- `S3_FORCE_PATH_STYLE`
- `S3_SIGNED_URL_TTL_SECONDS`

- [ ] **Step 3: Construct the S3 client explicitly**

Pass endpoint, region, credentials, and path-style config into `S3Client`:

```ts
new S3Client({
  endpoint,
  region,
  forcePathStyle,
  credentials: { accessKeyId, secretAccessKey },
});
```

- [ ] **Step 4: Implement `putObject()` with AWS SDK v3**

Public methods:

```ts
interface PutPatientFileObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
}

async putObject(input: PutPatientFileObjectInput): Promise<void>;
```

Use `PutObjectCommand` with bucket, key, body, content type, and content length.

- [ ] **Step 5: Implement `getSignedReadUrl()` with AWS SDK v3**

```ts
async getSignedReadUrl(key: string): Promise<{ signedUrl: string; expiresAt: string }>;
```

Use `GetObjectCommand` plus `getSignedUrl(...)` with `expiresIn` from `S3_SIGNED_URL_TTL_SECONDS`, capped by Joi at 3600 seconds.

- [ ] **Step 6: Implement `deleteObject()` with AWS SDK v3**

```ts
async deleteObject(key: string): Promise<void>;
```

Use `DeleteObjectCommand` with the patient-files bucket and key.

Implementation constraints:

- Read config from `ConfigService`.
- Pass `S3_ENDPOINT` and `S3_REGION` to `S3Client`.
- Use `S3_PATIENT_FILES_BUCKET` for this module.
- Use `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`; if missing, fall back to existing `S3_ACCESS_KEY` and `S3_SECRET_KEY` only to reduce migration friction.
- Use `S3_FORCE_PATH_STYLE` for MinIO/local compatibility.
- Do not log access keys, secret keys, signed URLs, or raw file contents.

- [ ] **Step 7: Register the adapter in a dedicated module**

Create `apps/api/src/modules/files/storage/files-storage.module.ts`:

```ts
@Module({
  imports: [ConfigModule],
  providers: [PatientFileStorageService],
  exports: [PatientFileStorageService],
})
export class FilesStorageModule {}
```

Import `FilesStorageModule` from both `FilesModule` and `QueueModule`. This avoids a circular dependency when the files worker needs storage but `FilesModule` needs `QueueModule` for the cleanup queue.

- [ ] **Step 8: Verify adapter tests pass**

Run:

```bash
pnpm --filter @clinic-platform/api test -- patient-file-storage.service.spec.ts
```

Expected:

- PASS.

---

## Chunk 3: Integrate Storage Into Files Service

### Task 5: Add Strong File Validation And Opaque Keys

**Files:**

- Modify: `apps/api/src/modules/files/files.service.ts`
- Test: `apps/api/src/modules/files/files.service.spec.ts`

- [ ] **Step 1: Remove `fs` and `path` upload directory behavior**

Delete local disk constants and constructor side effects:

- `import * as fs from 'fs';`
- `import * as path from 'path';`
- `UPLOAD_DIR`
- `fs.mkdirSync(...)`
- `fs.writeFileSync(...)`

- [ ] **Step 2: Inject `PatientFileStorageService`**

Constructor should depend on the repository and storage adapter. Add queue injection in Chunk 4.

- [ ] **Step 3: Generate opaque object keys**

Keep patient isolation in the prefix, but do not include the original filename in object keys because filenames may contain PHI and keys can appear in Bull Board, object-store access logs, or error messages.

```ts
const extension = getAllowedExtension(file.originalname, file.mimetype);
const s3Key = `patient-files/${patientId}/${randomUUID()}${extension}`;
```

- [ ] **Step 4: Implement MIME and extension validation**

Use a whitelist mapping:

```ts
const ALLOWED_UPLOADS = new Map([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
]);
```

Reject when the MIME type is not allowed or the lowercased extension does not match the MIME whitelist.

- [ ] **Step 5: Add PDF signature validation**

PDF buffers must start with `%PDF-`.

- [ ] **Step 6: Add JPEG signature validation**

JPEG buffers must start with bytes `FF D8 FF`.

- [ ] **Step 7: Add PNG signature validation**

PNG buffers must start with bytes `89 50 4E 47 0D 0A 1A 0A`.

- [ ] **Step 8: Add WebP signature validation**

WebP buffers must match `RIFF....WEBP`.

- [ ] **Step 9: Wire signature validation before upload**

Do not trust only the client-provided MIME type. Add small magic-byte checks for supported formats:

- PDF: `%PDF-`
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- WebP: `RIFF....WEBP`

Reject mismatches with `FILE_TYPE_NOT_ALLOWED`. This is not malware scanning; keep virus scanning as out of scope.

- [ ] **Step 10: Verify validation tests pass**

Run:

```bash
pnpm --filter @clinic-platform/api test -- files.service.spec.ts
```

Expected:

- PASS for size, MIME, extension, magic-byte, and opaque-key tests.

### Task 6: Store Objects Through The Storage Adapter

**Files:**

- Modify: `apps/api/src/modules/files/files.service.ts`
- Test: `apps/api/src/modules/files/files.service.spec.ts`

- [ ] **Step 1: Upload before DB save**

Call `storage.putObject()` before `filesRepo.save()` so DB metadata does not point to a missing object. If DB save fails after S3 upload, log a warning with file key and enqueue cleanup if Chunk 4 is complete; otherwise document the cleanup gap in the commit message body.

- [ ] **Step 2: Do not log PHI-bearing file metadata**

Replace upload logs that include `file.originalname` with object-safe fields only:

```ts
this.logger.log(`File uploaded: id=${saved.id}, size=${file.size}`);
```

Do not log signed URLs, original filenames, file buffers, or S3 credentials.

- [ ] **Step 3: Delegate signed URL generation**

Replace the local `/uploads/...` URL with `storage.getSignedReadUrl(file.s3Key)`.

- [ ] **Step 4: Run service tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- files.service.spec.ts
```

Expected:

- PASS.

---

## Chunk 4: Add Async File Object Cleanup

### Task 7: Register A Dedicated Files Queue

**Files:**

- Modify: `apps/api/src/modules/queue/queue.module.ts`
- Modify: `apps/api/src/modules/files/files.module.ts`
- Modify: `apps/api/src/modules/files/files.service.ts`
- Test: `apps/api/src/modules/files/files.service.spec.ts`

- [ ] **Step 1: Register `files-queue`**

Add `files-queue` to `BullModule.registerQueue(...)` and `BullBoardModule.forFeature(...)` in `QueueModule`.

- [ ] **Step 2: Import `QueueModule` into `FilesModule`**

This lets `FilesService` inject the queue. `FilesModule` should also import `FilesStorageModule`; `QueueModule` imports `FilesStorageModule` directly for the worker, not `FilesModule`.

- [ ] **Step 3: Inject the queue into `FilesService`**

```ts
@InjectQueue('files-queue')
private readonly filesQueue: Queue,
```

- [ ] **Step 4: Enqueue delayed delete on soft delete**

After the DB update succeeds, enqueue:

```ts
await this.filesQueue.add(
  'delete-object',
  { key: file.s3Key },
  {
    delay: 5 * 60 * 1000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
  },
);
```

- [ ] **Step 5: Verify service tests pass**

Run:

```bash
pnpm --filter @clinic-platform/api test -- files.service.spec.ts
```

Expected:

- PASS.

### Task 8: Implement Files Worker

**Files:**

- Create: `apps/api/src/modules/queue/workers/files.worker.ts`
- Create: `apps/api/src/modules/queue/workers/files.worker.spec.ts`
- Modify: `apps/api/src/modules/queue/queue.module.ts`

- [ ] **Step 1: Write worker tests first**

Test cases:

- Processes `delete-object` jobs by calling `PatientFileStorageService.deleteObject(key)`.
- Throws for unknown job names so BullMQ can mark them failed.
- Does not log signed URLs or secrets.

Run:

```bash
pnpm --filter @clinic-platform/api test -- files.worker.spec.ts
```

Expected:

- FAIL until the worker exists.

- [ ] **Step 2: Add worker implementation**

Use direct injection through `FilesStorageModule`. This worker intentionally throws on unknown job names so BullMQ marks misrouted jobs as failed instead of silently skipping cleanup.

```ts
@Processor('files-queue', { concurrency: 5 })
export class FilesWorker extends WorkerHost {
  constructor(private readonly storage: PatientFileStorageService) {
    super();
  }

  async process(job: Job<{ key: string }>) {
    if (job.name !== 'delete-object') {
      throw new Error(`Unknown files job: ${job.name}`);
    }

    await this.storage.deleteObject(job.data.key);
  }
}
```

- [ ] **Step 3: Register the worker provider**

Add `FilesWorker` to `QueueModule` providers and import `FilesStorageModule` into `QueueModule`. Do not import `FilesModule` into `QueueModule`.

- [ ] **Step 4: Verify queue tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- files.worker.spec.ts files.service.spec.ts
```

Expected:

- PASS.

---

## Chunk 5: Response Shape And Client Compatibility

### Task 9: Implement Upload Signed URL API Shape

**Files:**

- Modify: `apps/api/src/modules/files/files.service.ts`
- Modify: `apps/api/src/modules/files/files.controller.ts` only if needed for response mapping
- Modify: `packages/api-client/src/services/patient-files.service.ts`
- Inspect: `apps/member/src/app/(portal)/records/upload/page.tsx`

- [ ] **Step 1: Match the P4 API spec for `POST /files`**

P4 docs require `signedUrl` and `signedUrlExpiresAt` in the upload response at `docs/4 Patient Portal and Strapi CMS/05-api-specification.md:164-176`. Implement that contract deterministically.

- [ ] **Step 2: Add service response type**

Return upload metadata plus a fresh signed URL:

```ts
{
  ...saved,
  signedUrl,
  signedUrlExpiresAt: expiresAt,
}
```

Avoid adding signed URLs to `findMyFiles()`.

- [ ] **Step 3: Update API client upload response type**

In `packages/api-client/src/services/patient-files.service.ts`, add or update a type like:

```ts
export interface UploadedPatientFile extends PatientFile {
  signedUrl: string;
  signedUrlExpiresAt: string;
}
```

Then make `upload()` return `Promise<ApiResponse<UploadedPatientFile>>`.

- [ ] **Step 4: Verify API client method names still match**

Run:

```bash
pnpm --filter @clinic-platform/api-client test
```

Expected:

- PASS. No client changes expected unless response types are tightened.

- [ ] **Step 5: Verify member upload still builds**

Run:

```bash
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
```

Expected:

- PASS.

---

## Chunk 6: Final Verification And Commit Sequence

### Task 10: Run Targeted API Verification

- [ ] **Step 1: Run files tests**

```bash
pnpm --filter @clinic-platform/api test -- files.service.spec.ts patient-file-storage.service.spec.ts files.worker.spec.ts
```

Expected:

- PASS.

- [ ] **Step 2: Run API quality gates**

```bash
pnpm --filter @clinic-platform/api lint
pnpm --filter @clinic-platform/api check-types
pnpm --filter @clinic-platform/api build
```

Expected:

- PASS.

### Task 11: Run Cross-Package Verification

- [ ] **Step 1: Verify dependent clients/apps**

```bash
pnpm --filter @clinic-platform/api-client test
pnpm --filter @clinic-platform/api-client build
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
```

Expected:

- PASS.

- [ ] **Step 2: Run full repo gates before PR/merge**

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

Expected:

- All commands exit 0.
- If Strapi emits a Node engine warning under unsupported local Node versions, rerun release verification under the repo-supported Node range before treating the branch as merge-ready.

### Task 12: Commit In Small Chunks

- [ ] **Commit dependency and config changes**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/config/validation.schema.ts apps/api/.env.example
git commit -m "chore(api): configure patient file object storage"
```

- [ ] **Commit storage adapter and files service integration**

```bash
git add apps/api/src/modules/files
git commit -m "feat(api): store patient files in s3-compatible storage"
```

- [ ] **Commit async cleanup queue**

```bash
git add apps/api/src/modules/queue apps/api/src/modules/files
git commit -m "feat(api): enqueue patient file object cleanup"
```

---

## Security Checklist

- [ ] No access keys, secret keys, signed URLs, or file buffers are logged.
- [ ] S3 credentials are read only from environment variables.
- [ ] File size limit remains 10 MB at both Multer and service levels.
- [ ] MIME type, extension, and file signature are whitelisted.
- [ ] Object keys are generated server-side, include patient isolation prefix, and do not include original filenames.
- [ ] `GET /files/:id/url` preserves owner/role authorization checks before signing.
- [ ] List endpoints do not expose signed URLs.
- [ ] Soft delete hides DB rows before delayed object deletion.
- [ ] Worker retries object deletion without exposing sensitive data in errors.

---

## Out Of Scope

- Direct-to-S3 browser uploads.
- Virus scanning or DLP pipeline beyond basic magic-byte validation.
- Multi-region storage replication.
- Full P5 tenant-specific bucket provisioning.
- Reworking member auth from localStorage to httpOnly cookies.
- Rewriting existing medical records or consent APIs.

---

## Success Criteria

- Patient uploads are stored in S3-compatible object storage, not local disk.
- `patient_files.s3_key` contains the authoritative object key for downloads and cleanup.
- Signed file URLs are generated with a maximum 1-hour TTL.
- Unsupported file types, mismatched extensions, and files over 10 MB are rejected with P4 error codes.
- Soft-deleted files disappear from patient/doctor lists and enqueue delayed object cleanup.
- Focused API, api-client, and member verification commands pass before merge.
