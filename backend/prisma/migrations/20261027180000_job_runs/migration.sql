-- Scheduled-job claims: one run per slot across all API replicas.
CREATE TABLE "job_runs" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "job"         VARCHAR(50) NOT NULL,
    "run_key"     VARCHAR(40) NOT NULL,
    "status"      VARCHAR(16) NOT NULL DEFAULT 'running',
    "started_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "error"       TEXT,
    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_runs_job_run_key_key" ON "job_runs"("job", "run_key");
CREATE INDEX "job_runs_started_at_idx" ON "job_runs"("started_at");
