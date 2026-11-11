-- Required before enabling PICKUP_PAYMENT_REMINDERS_ENABLED in production.
-- Add the transactional game-day payment reminder event without altering existing events.
alter table public.notification_events drop constraint if exists notification_events_event_type_check;
alter table public.notification_events add constraint notification_events_event_type_check
check (event_type = any (array[
 'game_published','registration_received','payment_reported','payment_verified',
 'waitlist_joined','waitlist_offer','game_reminder','game_cancelled',
 'game_updated','admin_reminder','payment_reminder','registration_cancelled'
]));
