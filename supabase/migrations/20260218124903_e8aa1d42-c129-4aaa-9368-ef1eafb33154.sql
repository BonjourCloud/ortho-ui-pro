
-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  appointment_type TEXT NOT NULL,
  service TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  insurance_provider TEXT,
  emi_interest BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an appointment
CREATE POLICY "Anyone can insert appointments"
  ON public.appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can view appointments (admin)
CREATE POLICY "Authenticated users can view appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (true);

-- Contact messages table
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (true);

-- Second opinions table
CREATE TABLE public.second_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  condition TEXT NOT NULL,
  current_diagnosis TEXT NOT NULL,
  additional_notes TEXT,
  file_names TEXT[], -- store uploaded file names for reference
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.second_opinions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert second opinions"
  ON public.second_opinions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view second opinions"
  ON public.second_opinions FOR SELECT
  TO authenticated
  USING (true);
