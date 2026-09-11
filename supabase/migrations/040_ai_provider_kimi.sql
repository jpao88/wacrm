-- ============================================================
-- 040_ai_provider_kimi — allow Kimi (Moonshot AI) as an AI provider
--
-- `ai_configs.provider` and `ai_usage_log.provider` were pinned to
-- ('openai', 'anthropic') by migrations 029 and 033. Kimi's API is
-- OpenAI-shaped, so the app side is a thin adapter — but both CHECK
-- constraints have to be widened or a save rejects the config and the
-- usage-log insert silently drops every Kimi run.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE ai_configs
  DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'kimi'));

ALTER TABLE ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE ai_usage_log
  ADD CONSTRAINT ai_usage_log_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'kimi'));
