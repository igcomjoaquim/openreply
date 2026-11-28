-- Destravando: desafio com amigo (convite por código, ofensiva lado a lado, cutucar)
ALTER TABLE "DtvUser" ADD COLUMN "inviteCode" TEXT;
CREATE UNIQUE INDEX "DtvUser_inviteCode_key" ON "DtvUser"("inviteCode");
CREATE TABLE "DtvFriend" (
  "id" TEXT NOT NULL,
  "aId" TEXT NOT NULL,
  "bId" TEXT NOT NULL,
  "pokeA" TEXT,
  "pokeB" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DtvFriend_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DtvFriend_aId_bId_key" ON "DtvFriend"("aId", "bId");
CREATE INDEX "DtvFriend_bId_idx" ON "DtvFriend"("bId");
ALTER TABLE "DtvFriend" ADD CONSTRAINT "DtvFriend_aId_fkey" FOREIGN KEY ("aId") REFERENCES "DtvUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DtvFriend" ADD CONSTRAINT "DtvFriend_bId_fkey" FOREIGN KEY ("bId") REFERENCES "DtvUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
