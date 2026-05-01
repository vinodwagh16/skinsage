CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  diet_type TEXT,
  water_ml_per_day INTEGER,
  sleep_hours NUMERIC(3,1),
  smoking BOOLEAN,
  alcohol_frequency TEXT,
  exercise_frequency TEXT,
  stress_level TEXT,
  sun_exposure TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
