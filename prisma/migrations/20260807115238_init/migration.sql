-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_name" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,
    "participant_email" TEXT NOT NULL,
    "live_url" TEXT NOT NULL,
    "github_repo_url" TEXT NOT NULL,
    "demo_video_url" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "is_zerops_subdomain" BOOLEAN,
    "detected_services" JSONB,
    "dependency_hints" JSONB,
    "commit_authenticity" TEXT,
    "commit_timeline" JSONB,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uptime_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "is_up" BOOLEAN,

    CONSTRAINT "uptime_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judge_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "judge_id" UUID NOT NULL,
    "dashboard_shown_in_video" BOOLEAN NOT NULL DEFAULT false,
    "score_idea" INTEGER,
    "score_execution" INTEGER,
    "score_zerops_usage" INTEGER,
    "notes" TEXT,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judge_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uptime_logs" ADD CONSTRAINT "uptime_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_reviews" ADD CONSTRAINT "judge_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_reviews" ADD CONSTRAINT "judge_reviews_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
