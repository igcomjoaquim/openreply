-- Destravando: mensagens "Achou um problema? Me conta". Só cria uma tabela nova.
CREATE TABLE "DtvFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "screen" TEXT,
    "text" TEXT NOT NULL,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DtvFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DtvFeedback_createdAt_idx" ON "DtvFeedback"("createdAt");
