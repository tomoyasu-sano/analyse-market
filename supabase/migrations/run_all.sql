-- =====================================================
-- Analyse Market — Phase 1 マイグレーション
-- Supabase SQL Editor に貼り付けて実行してください
-- プロジェクト: personal-project (rttcdttncrabozpvucna)
-- =====================================================

-- amk_app_rankings: App Store / Google Play ランキングデータ
CREATE TABLE IF NOT EXISTS amk_app_rankings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform       text NOT NULL CHECK (platform IN ('ios', 'android')),
  chart_type     text NOT NULL CHECK (chart_type IN ('free', 'paid', 'grossing')),
  category       text NOT NULL DEFAULT 'all',
  country        text NOT NULL DEFAULT 'us',
  rank           integer NOT NULL,
  app_name       text NOT NULL,
  app_id         text NOT NULL,
  developer      text,
  rating         numeric,
  rating_count   integer,
  price          numeric,
  genre          text,
  description_short text,
  icon_url       text,
  collected_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amk_app_rankings_platform_chart_collected
  ON amk_app_rankings (platform, chart_type, category, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_amk_app_rankings_app_id_collected
  ON amk_app_rankings (app_id, collected_at DESC);

ALTER TABLE amk_app_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_app_rankings_auth_all" ON amk_app_rankings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- amk_collection_logs: 収集ジョブのログ
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

ALTER TABLE amk_collection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_collection_logs_auth_all" ON amk_collection_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
