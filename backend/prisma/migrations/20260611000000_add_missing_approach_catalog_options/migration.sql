INSERT INTO approaches (id, name, slug, active, deleted)
VALUES
  ('approach-analise-comportamento-behaviorismo', 'Análise do Comportamento/Behaviorismo', 'analise-do-comportamento-behaviorismo', true, false),
  ('approach-analise-transacional', 'Análise Transacional', 'analise-transacional', true, false),
  ('approach-analitica-junguiana', 'Analítica/Junguiana', 'analitica-junguiana', true, false),
  ('approach-arteterapia', 'Arteterapia', 'arteterapia', true, false),
  ('approach-centrada-na-pessoa-humanista-rogeriana', 'Centrada na Pessoa/Humanista/Rogeriana', 'centrada-na-pessoa-humanista-rogeriana', true, false),
  ('approach-construcionismo-social', 'Construcionismo Social', 'construcionismo-social', true, false),
  ('approach-fenomenologia-existencial', 'Fenomenologia Existencial', 'fenomenologia-existencial', true, false),
  ('approach-gestalt', 'Gestalt', 'gestalt', true, false),
  ('approach-logoterapia', 'logoterapia', 'logoterapia', true, false),
  ('approach-neuropsicanalise', 'Neuropsicanálise', 'neuropsicanalise', true, false),
  ('approach-neuropsicologia', 'Neuropsicologia', 'neuropsicologia', true, false),
  ('approach-psicodinamica', 'Psicodinâmica', 'psicodinamica', true, false),
  ('approach-psicodrama', 'Psicodrama', 'psicodrama', true, false),
  ('approach-psicologia-corporal-reichiana', 'Psicologia Corporal Reichiana', 'psicologia-corporal-reichiana', true, false),
  ('approach-sistemica-familiar', 'Sistêmica Familiar', 'sistemica-familiar', true, false),
  ('approach-socio-historica', 'Sócio-Histórica', 'socio-historica', true, false),
  ('approach-terapia-de-aceitacao-e-compromisso', 'Terapia de Aceitação e Compromisso', 'terapia-de-aceitacao-e-compromisso', true, false),
  ('approach-terapia-dos-esquemas', 'Terapia dos Esquemas', 'terapia-dos-esquemas', true, false)
ON CONFLICT (slug)
DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  deleted = EXCLUDED.deleted,
  updated_at = NOW();