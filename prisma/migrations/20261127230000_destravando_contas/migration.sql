-- Destravando: contas dos alunos (cadastro/lead + login + progresso). Só cria tabelas novas.
CREATE TABLE "DtvUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "whatsapp" TEXT,
    "gender" TEXT,
    "ageRange" TEXT,
    "state" TEXT,
    "city" TEXT,
    "goal" TEXT,
    "howFound" TEXT,
    "selfLevel" TEXT,
    "testLevel" TEXT,
    "marketingOk" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" JSONB,
    "progressAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DtvUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DtvUser_email_key" ON "DtvUser"("email");

CREATE TABLE "DtvSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DtvSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DtvSession_tokenHash_key" ON "DtvSession"("tokenHash");
CREATE INDEX "DtvSession_userId_idx" ON "DtvSession"("userId");
ALTER TABLE "DtvSession" ADD CONSTRAINT "DtvSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DtvUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DtvReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DtvReset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DtvReset_userId_idx" ON "DtvReset"("userId");
ALTER TABLE "DtvReset" ADD CONSTRAINT "DtvReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DtvUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
