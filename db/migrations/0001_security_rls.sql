-- Seguridad de datos del Bloque 1: rol de aplicación, funciones de contexto, RLS, guardas e
-- inmutabilidad de la auditoría. La aplicación se conecta como app_user, que no es propietario de
-- ninguna tabla, así que las políticas RLS se aplican siempre.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- ---------------------------------------------------------------------------
-- Contexto de la petición (fijado por withActor/withSystem con set_config local)
-- ---------------------------------------------------------------------------

CREATE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION app.is_system() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT coalesce(current_setting('app.system', true), '') = 'on' $$;

-- Las funciones SECURITY DEFINER leen tablas protegidas por RLS sin recursión. Tienen search_path
-- fijo para que nadie pueda suplantar objetos.

CREATE FUNCTION app.current_user_email() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT u.email FROM public.users u WHERE u.id = app.current_user_id() AND u.status = 'active' $$;

CREATE FUNCTION app.has_platform_role(roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles pr
    JOIN public.users u ON u.id = pr.user_id AND u.status = 'active'
    WHERE pr.user_id = app.current_user_id() AND pr.role = ANY (roles)
  )
$$;

CREATE FUNCTION app.is_member(rid uuid, roles text[] DEFAULT ARRAY['owner', 'manager', 'cashier']) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members m
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.restaurant_id = rid
      AND m.user_id = app.current_user_id()
      AND m.status = 'active'
      AND m.role = ANY (roles)
  )
$$;

CREATE FUNCTION app.restaurant_has_members(rid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (SELECT 1 FROM public.restaurant_members m WHERE m.restaurant_id = rid) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

-- ---------------------------------------------------------------------------
-- Tablas de autenticación (Better Auth): sin RLS, solo las usa el módulo Identity
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions, public.accounts, public.verifications, public.rate_limits TO app_user;

-- ---------------------------------------------------------------------------
-- platform_roles: se otorgan por script de arranque o por un administrador
-- ---------------------------------------------------------------------------

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.platform_roles TO app_user;

CREATE POLICY platform_roles_select ON public.platform_roles FOR SELECT TO app_user
  USING (user_id = app.current_user_id() OR app.has_platform_role(ARRAY['admin']));
CREATE POLICY platform_roles_insert ON public.platform_roles FOR INSERT TO app_user
  WITH CHECK (app.has_platform_role(ARRAY['admin']) AND granted_by = app.current_user_id());
CREATE POLICY platform_roles_delete ON public.platform_roles FOR DELETE TO app_user
  USING (app.has_platform_role(ARRAY['admin']));

-- ---------------------------------------------------------------------------
-- consents: cada usuario ve y registra solo los suyos
-- ---------------------------------------------------------------------------

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.consents TO app_user;

CREATE POLICY consents_own ON public.consents FOR ALL TO app_user
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.restaurants TO app_user;

CREATE POLICY restaurants_select ON public.restaurants FOR SELECT TO app_user
  USING (
    status = 'approved'
    OR created_by = app.current_user_id()
    OR app.is_member(id)
    OR app.has_platform_role(ARRAY['admin', 'support'])
  );
CREATE POLICY restaurants_insert ON public.restaurants FOR INSERT TO app_user
  WITH CHECK (created_by = app.current_user_id() AND status = 'pending' AND reviewed_by IS NULL);
CREATE POLICY restaurants_update ON public.restaurants FOR UPDATE TO app_user
  USING (app.is_member(id, ARRAY['owner']) OR app.has_platform_role(ARRAY['admin']))
  WITH CHECK (app.is_member(id, ARRAY['owner']) OR app.has_platform_role(ARRAY['admin']));

CREATE FUNCTION app.restaurants_guard() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.created_by <> OLD.created_by OR NEW.slug <> OLD.slug OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'restaurants: campo inmutable' USING ERRCODE = '42501';
  END IF;

  IF (NEW.status, NEW.reviewed_by, NEW.reviewed_at, NEW.review_note)
       IS DISTINCT FROM (OLD.status, OLD.reviewed_by, OLD.reviewed_at, OLD.review_note) THEN
    IF NOT app.has_platform_role(ARRAY['admin']) THEN
      RAISE EXCEPTION 'restaurants: solo un administrador de plataforma cambia el estado' USING ERRCODE = '42501';
    END IF;
    IF NEW.status <> OLD.status AND NOT (
         (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
      OR (OLD.status = 'approved' AND NEW.status IN ('suspended', 'closed'))
      OR (OLD.status = 'suspended' AND NEW.status IN ('approved', 'closed'))
    ) THEN
      RAISE EXCEPTION 'restaurants: transición de estado no permitida (% -> %)', OLD.status, NEW.status USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TRIGGER restaurants_guard BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION app.restaurants_guard();

-- ---------------------------------------------------------------------------
-- restaurant_locations
-- ---------------------------------------------------------------------------

ALTER TABLE public.restaurant_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.restaurant_locations TO app_user;

CREATE POLICY restaurant_locations_select ON public.restaurant_locations FOR SELECT TO app_user
  USING (
    app.is_member(restaurant_id)
    OR app.has_platform_role(ARRAY['admin', 'support'])
    OR (status = 'active' AND EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.status = 'approved'
    ))
  );
CREATE POLICY restaurant_locations_write ON public.restaurant_locations FOR INSERT TO app_user
  WITH CHECK (app.is_member(restaurant_id, ARRAY['owner', 'manager']) OR app.has_platform_role(ARRAY['admin']));
CREATE POLICY restaurant_locations_update ON public.restaurant_locations FOR UPDATE TO app_user
  USING (app.is_member(restaurant_id, ARRAY['owner', 'manager']) OR app.has_platform_role(ARRAY['admin']))
  WITH CHECK (app.is_member(restaurant_id, ARRAY['owner', 'manager']) OR app.has_platform_role(ARRAY['admin']));

-- ---------------------------------------------------------------------------
-- restaurant_members
-- ---------------------------------------------------------------------------

ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.restaurant_members TO app_user;

CREATE POLICY restaurant_members_select ON public.restaurant_members FOR SELECT TO app_user
  USING (
    app.is_member(restaurant_id)
    OR user_id = app.current_user_id()
    OR (status = 'invited' AND invited_email = app.current_user_email())
    OR app.has_platform_role(ARRAY['admin', 'support'])
  );

-- Quien solicita el alta de un restaurante se convierte en su primer dueño.
CREATE POLICY restaurant_members_insert_founder ON public.restaurant_members FOR INSERT TO app_user
  WITH CHECK (
    role = 'owner' AND status = 'active'
    AND user_id = app.current_user_id()
    AND invited_email = app.current_user_email()
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.created_by = app.current_user_id())
    AND NOT app.restaurant_has_members(restaurant_id)
  );

-- Invitaciones: el dueño invita gerentes y cajeros; el gerente solo cajeros.
CREATE POLICY restaurant_members_insert_invite ON public.restaurant_members FOR INSERT TO app_user
  WITH CHECK (
    status = 'invited' AND user_id IS NULL AND invited_by = app.current_user_id()
    AND (
      (role IN ('manager', 'cashier') AND app.is_member(restaurant_id, ARRAY['owner']))
      OR (role = 'cashier' AND app.is_member(restaurant_id, ARRAY['manager']))
      OR (role IN ('owner', 'manager', 'cashier') AND app.has_platform_role(ARRAY['admin']))
    )
  );

CREATE POLICY restaurant_members_update_manage ON public.restaurant_members FOR UPDATE TO app_user
  USING (app.is_member(restaurant_id, ARRAY['owner']) OR app.has_platform_role(ARRAY['admin']))
  WITH CHECK (app.is_member(restaurant_id, ARRAY['owner']) OR app.has_platform_role(ARRAY['admin']));

-- La persona invitada acepta con el correo que verificó al iniciar sesión.
CREATE POLICY restaurant_members_update_accept ON public.restaurant_members FOR UPDATE TO app_user
  USING (status = 'invited' AND invited_email = app.current_user_email())
  WITH CHECK (status = 'active' AND user_id = app.current_user_id() AND invited_email = app.current_user_email());

CREATE FUNCTION app.restaurant_members_guard() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.restaurant_id <> OLD.restaurant_id OR NEW.invited_email <> OLD.invited_email
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'restaurant_members: campo inmutable' USING ERRCODE = '42501';
  END IF;
  IF OLD.status = 'revoked' THEN
    RAISE EXCEPTION 'restaurant_members: una membresía revocada no se reactiva; crea una invitación nueva' USING ERRCODE = '42501';
  END IF;
  -- Solo el dueño o un administrador cambian roles; quien acepta solo pasa de invitado a activo.
  IF NEW.role <> OLD.role
     AND NOT (app.is_member(OLD.restaurant_id, ARRAY['owner']) OR app.has_platform_role(ARRAY['admin'])) THEN
    RAISE EXCEPTION 'restaurant_members: no puedes cambiar el rol' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER restaurant_members_guard BEFORE UPDATE ON public.restaurant_members
  FOR EACH ROW EXECUTE FUNCTION app.restaurant_members_guard();

-- ---------------------------------------------------------------------------
-- member_locations
-- ---------------------------------------------------------------------------

ALTER TABLE public.member_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.member_locations TO app_user;

CREATE POLICY member_locations_select ON public.member_locations FOR SELECT TO app_user
  USING (app.is_member(restaurant_id) OR app.has_platform_role(ARRAY['admin', 'support']));
CREATE POLICY member_locations_insert ON public.member_locations FOR INSERT TO app_user
  WITH CHECK (app.is_member(restaurant_id, ARRAY['owner', 'manager']) OR app.has_platform_role(ARRAY['admin']));

CREATE FUNCTION app.member_locations_consistency() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurant_members m WHERE m.id = NEW.member_id AND m.restaurant_id = NEW.restaurant_id)
     OR NOT EXISTS (SELECT 1 FROM public.restaurant_locations l WHERE l.id = NEW.location_id AND l.restaurant_id = NEW.restaurant_id) THEN
    RAISE EXCEPTION 'member_locations: miembro y ubicación deben pertenecer al mismo restaurante' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER member_locations_consistency BEFORE INSERT ON public.member_locations
  FOR EACH ROW EXECUTE FUNCTION app.member_locations_consistency();

-- ---------------------------------------------------------------------------
-- audit_events: solo inserción
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.audit_events TO app_user;

CREATE POLICY audit_events_insert ON public.audit_events FOR INSERT TO app_user
  WITH CHECK (actor_user_id IS NOT DISTINCT FROM app.current_user_id());
CREATE POLICY audit_events_select ON public.audit_events FOR SELECT TO app_user
  USING (
    app.has_platform_role(ARRAY['admin', 'support'])
    OR (restaurant_id IS NOT NULL AND app.is_member(restaurant_id, ARRAY['owner', 'manager']))
  );

CREATE FUNCTION app.reject_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '%: tabla de solo inserción', TG_TABLE_NAME USING ERRCODE = '42501';
END
$$;

-- Aplica incluso al propietario de la tabla: la auditoría no se corrige, se complementa.
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION app.reject_mutation();
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON public.audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION app.reject_mutation();

-- ---------------------------------------------------------------------------
-- outbox_events: cualquiera encola; solo el proceso interno lee y actualiza
-- ---------------------------------------------------------------------------

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.outbox_events TO app_user;

CREATE POLICY outbox_events_insert ON public.outbox_events FOR INSERT TO app_user
  WITH CHECK (status = 'pending' AND attempts = 0);
CREATE POLICY outbox_events_system_select ON public.outbox_events FOR SELECT TO app_user
  USING (app.is_system());
CREATE POLICY outbox_events_system_update ON public.outbox_events FOR UPDATE TO app_user
  USING (app.is_system())
  WITH CHECK (app.is_system());
