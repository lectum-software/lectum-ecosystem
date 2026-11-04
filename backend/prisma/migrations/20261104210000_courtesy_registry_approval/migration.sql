-- Expiry ends benefits, not administrative approval. Preserve explicit rejections.
WITH eligible AS (
  SELECT DISTINCT ON (p.id)
    p.id AS psychologist_id, p.cpf, p.crp, p.updated_at AS profile_updated_at,
    s.id AS subscription_id, s.granted_by,
    COALESCE(s.grant_started_at, s.created_at) AS granted_at
  FROM psychologist_profiles p
  JOIN professional_subscriptions s ON s.psychologist_id = p.id
  JOIN subscription_plans plan ON plan.id = s.plan_id
  WHERE NOT p.deleted AND NOT s.deleted
    AND s.source = 'admin_grant' AND plan.slug = 'profissional'
    AND COALESCE(s.grant_started_at, s.created_at) <= CURRENT_TIMESTAMP
    AND p.crp_status IN ('pendente', 'em_analise')
    AND p.cfp_verified_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM professional_registry_checks c
      WHERE c.psychologist_id = p.id AND NOT c.deleted
        AND c.provider = 'manual_admin' AND NOT c.found
        AND c.checked_at >= COALESCE(s.grant_started_at, s.created_at)
    )
  ORDER BY p.id, COALESCE(s.grant_started_at, s.created_at) DESC, s.id DESC
), approved AS (
  UPDATE psychologist_profiles p
  SET crp_status = 'aprovado', updated_at = CURRENT_TIMESTAMP
  FROM eligible e
  WHERE p.id = e.psychologist_id
    AND p.updated_at = e.profile_updated_at
    AND p.crp_status IN ('pendente', 'em_analise')
    AND p.cfp_verified_at IS NULL
  RETURNING e.*
)
INSERT INTO professional_registry_checks
  (id, psychologist_id, provider, cpf, registro, uf, found, checked_at, raw)
SELECT 'courtesy-approval-' || subscription_id, psychologist_id, 'manual_admin',
  cpf,
  CASE WHEN position('/' in crp) > 0 THEN split_part(crp, '/', 2) ELSE crp END,
  CASE WHEN position('/' in crp) > 0 THEN split_part(crp, '/', 1) ELSE NULL END,
  true, granted_at,
  jsonb_build_object(
    'source', 'manual_admin', 'decision', 'approved',
    'origin', 'admin_grant_backfill', 'subscription_id', subscription_id,
    'admin', jsonb_build_object('name', granted_by),
    'notes', 'Reconhecimento da cortesia administrativa preexistente; nao representa nova consulta ao conselho.'
  )
FROM approved
ON CONFLICT (id) DO NOTHING;
