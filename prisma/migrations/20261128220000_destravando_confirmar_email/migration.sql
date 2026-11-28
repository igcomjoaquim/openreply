-- Destravando: e-mail confirmado por código antes de entrar (Thiago 28/11). Quem já tinha conta conta como confirmado.
ALTER TABLE "DtvUser" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
UPDATE "DtvUser" SET "emailVerifiedAt" = NOW();
