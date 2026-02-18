
-- Create storage bucket for second opinion medical reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('second-opinion-reports', 'second-opinion-reports', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/dicom']);

-- Anyone can upload files to the bucket
CREATE POLICY "Anyone can upload second opinion reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'second-opinion-reports');

-- Authenticated users (admin) can view/download files
CREATE POLICY "Authenticated users can view second opinion reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'second-opinion-reports' AND auth.role() = 'authenticated');
