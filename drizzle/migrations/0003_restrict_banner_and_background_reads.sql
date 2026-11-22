DROP POLICY IF EXISTS "Anyone can read banner videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read site assets" ON storage.objects;

CREATE POLICY "Admins read banner videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins read site assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));