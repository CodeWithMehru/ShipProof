-- CreateTable
CREATE TABLE "event_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "event_start" TIMESTAMPTZ NOT NULL,
    "event_end" TIMESTAMPTZ NOT NULL,
    "judging_end" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);
