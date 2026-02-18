CREATE POLICY "Authenticated users can update second opinions"
ON public.second_opinions
FOR UPDATE
USING (true)
WITH CHECK (true);