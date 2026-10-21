-- Apply after pickup-registration-until-kickoff.sql.
-- Automatically promote FIFO waitlisted players when a reserved spot is released
-- or an offer expires. Does not send emails; notification dispatcher must process
-- newly offered registrations separately before this feature can go live.
-- The pickup_games row lock serializes capacity changes with new registrations.
CREATE OR REPLACE FUNCTION public.auto_promote_pickup_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 g public.pickup_games%rowtype;
 occupied integer;
 next_id uuid;
BEGIN
 IF TG_OP <> 'UPDATE' OR OLD.status NOT IN ('pending_payment','confirmed','offered')
    OR NEW.status NOT IN ('cancelled','expired') THEN
  RETURN NEW;
 END IF;
 SELECT * INTO g FROM public.pickup_games WHERE id=NEW.game_id FOR UPDATE;
 IF NOT FOUND OR g.status<>'published' OR g.starts_at<=now() THEN RETURN NEW; END IF;
 SELECT count(*) INTO occupied FROM public.pickup_registrations
 WHERE game_id=NEW.game_id AND status IN ('pending_payment','confirmed','offered');
 WHILE occupied<g.capacity LOOP
  SELECT id INTO next_id FROM public.pickup_registrations
  WHERE game_id=NEW.game_id AND status='waitlisted'
  ORDER BY created_at,id LIMIT 1;
  EXIT WHEN next_id IS NULL;
  UPDATE public.pickup_registrations
   SET status='offered',offer_expires_at=LEAST(now()+interval '60 minutes',g.starts_at)
   WHERE id=next_id AND status='waitlisted';
  occupied:=occupied+1;
  next_id:=NULL;
 END LOOP;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pickup_auto_promote_after_release ON public.pickup_registrations;
CREATE TRIGGER pickup_auto_promote_after_release
AFTER UPDATE OF status ON public.pickup_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_promote_pickup_waitlist();
REVOKE ALL ON FUNCTION public.auto_promote_pickup_waitlist() FROM PUBLIC,anon,authenticated;
