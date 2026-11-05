-- Run this AFTER deploying the "notify" Edge Function (README, step 5).
-- It calls the function every 5 minutes. Replace both placeholders first:
--   YOUR-PROJECT-REF  -> the part before .supabase.co in your project URL
--   YOUR-CRON-SECRET  -> the CRON_SECRET you saved as a function secret
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('ardrix-notify', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR-CRON-SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
