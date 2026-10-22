-- READ ONLY: verify current capacity before applying the team migration.
SELECT g.title, g.id AS game_id, g.capacity,
 count(r.id) FILTER (WHERE r.status IN ('pending_payment','confirmed','offered')) AS reserved_spots,
 g.capacity-count(r.id) FILTER (WHERE r.status IN ('pending_payment','confirmed','offered')) AS remaining_spots,
 count(r.id) FILTER (WHERE r.status='waitlisted') AS waitlisted_registrations
FROM public.pickup_games g
LEFT JOIN public.pickup_registrations r ON r.game_id=g.id
GROUP BY g.id,g.title,g.capacity
ORDER BY g.title;