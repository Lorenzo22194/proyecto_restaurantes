-- Quien tiene una invitación pendiente necesita ver el nombre del restaurante para decidir si la
-- acepta, aunque el restaurante siga en revisión.

CREATE FUNCTION app.has_pending_invitation(rid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members m
    WHERE m.restaurant_id = rid AND m.status = 'invited' AND m.invited_email = app.current_user_email()
  )
$$;

REVOKE ALL ON FUNCTION app.has_pending_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.has_pending_invitation(uuid) TO app_user;

DROP POLICY restaurants_select ON public.restaurants;
CREATE POLICY restaurants_select ON public.restaurants FOR SELECT TO app_user
  USING (
    status = 'approved'
    OR created_by = app.current_user_id()
    OR app.is_member(id)
    OR app.has_pending_invitation(id)
    OR app.has_platform_role(ARRAY['admin', 'support'])
  );
