ALTER TABLE "FcmToken"
  ADD COLUMN IF NOT EXISTS "localidadId" integer;

ALTER TABLE "FcmToken"
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "FcmToken_localidadId_idx" ON "FcmToken"("localidadId");

UPDATE "FcmToken" ft
SET "localidadId" = u."localidadId"
FROM "Usuario" u
WHERE ft."usuarioId" = u.id
  AND ft."localidadId" IS NULL;
