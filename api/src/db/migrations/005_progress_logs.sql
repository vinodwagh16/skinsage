CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
