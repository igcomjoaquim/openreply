-- Destravando: lembrete diário por e-mail (quem saiu do lembrete e quando recebeu o último)
ALTER TABLE "DtvUser" ADD COLUMN "reminderOff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DtvUser" ADD COLUMN "reminderAt" TEXT;
