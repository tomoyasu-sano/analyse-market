-- amk_app_rankings: App Store / Google Play ランキングデータ（毎日蓄積）
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

-- RLS: anon不可、authenticated全操作可
ALTER TABLE amk_app_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_app_rankings_auth_all" ON amk_app_rankings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
