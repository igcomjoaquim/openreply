-- Lições de casa com link fixo por aluno.
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Student_slug_key" ON "Student"("slug");

CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lesson_studentId_createdAt_idx" ON "Lesson"("studentId", "createdAt");
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LessonAttempt" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "progress" JSONB NOT NULL DEFAULT '{}',
    "finishedAt" TIMESTAMP(3),
    "review" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LessonAttempt_lessonId_idx" ON "LessonAttempt"("lessonId");
CREATE INDEX "LessonAttempt_finishedAt_idx" ON "LessonAttempt"("finishedAt");
ALTER TABLE "LessonAttempt" ADD CONSTRAINT "LessonAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LessonRecording" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "transcript" TEXT NOT NULL DEFAULT '',
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonRecording_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LessonRecording_attemptId_idx" ON "LessonRecording"("attemptId");
ALTER TABLE "LessonRecording" ADD CONSTRAINT "LessonRecording_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "LessonAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
