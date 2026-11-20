-- Posts now wait for the owner's OK before publishing.
ALTER TABLE "ScheduledPost" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Everything scheduled before this change was already approved in chat.
UPDATE "ScheduledPost" SET "approvedAt" = "createdAt";
