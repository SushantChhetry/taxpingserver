CREATE TABLE IF NOT EXISTS preparers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  drive_token JSONB,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparer_id UUID NOT NULL REFERENCES preparers(id),
  twilio_number TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparer_id UUID NOT NULL REFERENCES preparers(id),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  drive_folder_id TEXT,
  tax_year INTEGER NOT NULL DEFAULT 2027,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(preparer_id, mobile, tax_year)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'active',
  docs_collected TEXT[] DEFAULT '{}',
  docs_pending TEXT[] DEFAULT '{"W2","1099","Other"}',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  tax_year INTEGER NOT NULL DEFAULT 2027,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  body TEXT,
  media_url TEXT,
  doc_type TEXT,
  drive_file_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  error TEXT NOT NULL,
  media_url TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
