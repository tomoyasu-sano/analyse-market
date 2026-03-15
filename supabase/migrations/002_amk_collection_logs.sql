-- amk_collection_logs: 収集ジョブの実行ログ（失敗監視用）
CREATE TABLE IF NOT EXISTS amk_collection_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name       text NOT NULL,
  source         text NOT NULL,
  status         text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_saved  integer NOT NULL DEFAULT 0,
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_amk_collection_logs_started
  ON amk_collection_logs (started_at DESC);

-- RLS: anon不可、authenticated全操作可
ALTER TABLE amk_collection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_collection_logs_auth_all" ON amk_collection_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
