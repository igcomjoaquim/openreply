-- Destravando: notificação no celular (Web Push). Uma linha por aparelho inscrito.
CREATE TABLE "DtvPush" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "device" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastOkAt" TIMESTAMP(3),
  CONSTRAINT "DtvPush_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DtvPush_endpoint_key" ON "DtvPush"("endpoint");
CREATE INDEX "DtvPush_userId_idx" ON "DtvPush"("userId");
ALTER TABLE "DtvPush" ADD CONSTRAINT "DtvPush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DtvUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
