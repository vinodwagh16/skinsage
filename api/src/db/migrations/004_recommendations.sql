CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  home_remedies JSONB DEFAULT '[]',
  routine_changes JSONB DEFAULT '{}',
  habit_suggestions JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  exercises JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
