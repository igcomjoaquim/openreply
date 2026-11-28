-- Destravando: teste fechado só com convite pessoal (uso único).
CREATE TABLE "DtvInvite" (
  "code" TEXT NOT NULL,
  "label" TEXT,
  "usedById" TEXT,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DtvInvite_pkey" PRIMARY KEY ("code")
);
-- os códigos são gerados no servidor (rota /api/destravando/convites, protegida), nunca ficam no repositório
