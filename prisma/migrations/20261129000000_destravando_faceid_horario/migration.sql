-- Destravando: entrar com Face ID/digital (passkey) + horário do lembrete escolhido pelo aluno
CREATE TABLE "DtvPasskey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "credId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "transports" TEXT,
  "rpId" TEXT NOT NULL,
  "device" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "DtvPasskey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DtvPasskey_credId_key" ON "DtvPasskey"("credId");
CREATE INDEX "DtvPasskey_userId_idx" ON "DtvPasskey"("userId");
ALTER TABLE "DtvPasskey" ADD CONSTRAINT "DtvPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DtvUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DtvUser" ADD COLUMN "reminderHour" INTEGER NOT NULL DEFAULT 19;
ALTER TABLE "DtvUser" ADD COLUMN "timezone" TEXT;
ALTER TABLE "DtvUser" ADD COLUMN "pushAt" TEXT;
