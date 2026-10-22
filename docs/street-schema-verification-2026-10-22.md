# Street integration — verified production column metadata (2026-10-22)

Source: read-only `information_schema.columns` query supplied by project owner. This is column metadata only, **not** verification of keys, foreign keys, indexes, RLS policies, data or API access.

## Confirmed
- `public.players.id`: bigint NOT NULL; `full_name`, `email`, `phone` text NOT NULL.
- `public.pickup_games.id`: uuid NOT NULL; `is_test` boolean NOT NULL; `series_id` uuid nullable; `occurrence_index` integer nullable.
- `public.pickup_registrations.id`: uuid NOT NULL; `game_id` uuid NOT NULL; `player_id` text NOT NULL; `user_id` uuid NOT NULL; `registration_type` text NOT NULL; `team_name` text nullable; `spots_reserved` integer NOT NULL; `status`, `payment_status` text NOT NULL.
- `public.admin_users.user_id`: uuid NOT NULL.

## Design implications
1. Reference `players.id` with bigint in **new** verified identity mappings. Existing `pickup_registrations.player_id` remains text; do not alter its type.
2. A registration may reserve multiple spots; never treat registrations as a complete participant roster.
3. Street sessions should optionally reference a pickup game UUID, and distinguish field/session (men's versus coed) even when sharing the same date.
4. Store unmatched provider players without a local player ID until admin review.
5. Do not create tables or deploy from this document. Verify live constraints, foreign keys and RLS first; develop migration against a separate Supabase project.

## Next read-only query
```sql
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name AS referenced_table,
       ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_catalog=kcu.constraint_catalog
 AND tc.constraint_schema=kcu.constraint_schema
 AND tc.constraint_name=kcu.constraint_name
 AND tc.table_name=kcu.table_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_catalog=ccu.constraint_catalog
 AND tc.constraint_schema=ccu.constraint_schema
 AND tc.constraint_name=ccu.constraint_name
WHERE tc.table_schema='public'
  AND tc.table_name IN ('players','pickup_games','pickup_registrations','admin_users')
  AND tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY','UNIQUE')
ORDER BY tc.table_name,tc.constraint_type,tc.constraint_name,kcu.ordinal_position;
```

Do not share player rows, credentials or tokens.
