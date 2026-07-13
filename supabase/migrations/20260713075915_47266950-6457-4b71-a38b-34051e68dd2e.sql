
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(UUID) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO service_role;

-- Storage policies: attendance bucket, path is <partner_id>/<filename>
CREATE POLICY "partner uploads own attendance images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attendance'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.delivery_partners WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "partner reads own attendance images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.delivery_partners WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "staff reads all attendance images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  );
