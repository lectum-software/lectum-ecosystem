# TASK-310 - Aceite no cadastro e data de confirmacao

## Escopo
- Checkbox inicialmente desmarcado no cadastro por e-mail e na modal de nascimento do Google.
- Links dos documentos junto ao checkbox, sem duplicacao no rodape do cadastro.
- Aceite atomico de versoes publicadas, sem converter campo legado em consentimento.
- Topo de Termos e Privacidade informa aceite da versao consultada para o proprio usuario.
- Visitantes nao recebem informacoes de aceite.

## Aceite
- [x] Email e Google registram versoes exatas e rejeitam alteracao concorrente.
- [x] Data vem de legal_acceptance; falha de consulta nao equivale a falta de aceite.
- [x] Testes e verificacoes locais; nenhum push/deploy.

## Evidencias locais - 2026-11-02

Check integral do monorepo e builds backend/frontend aprovados. Integracao
PostgreSQL dos repositorios de cadastro por email/Google confirmou aceite atomico,
rejeicao de IDs antigos/confirmacao ausente e ausencia de conta parcial.
Reaceite da mesma versao preserva a data original.

QA com API/banco reais isolados em 320/390/1440: checkbox desmarcado, links
versionados, modal Google, validacao de nascimento e aceite; datas pessoais em
Termos e Privacidade, ausencia para visitante e estado distinto para falha de
consulta. Sem overflow, pageerror ou HTTP 500. Capturas conferidas visualmente.
Fixtures temporarias removidas; nenhum documento de QA ficou publicado.

Evidencias ignoradas em .tmp/task310-browser-results.json e .tmp/task310-*.png;
integracao reproduzivel em backend/scripts/account-lifecycle.integration.ts.
Navegador usou servidor de desenvolvimento porque o build publicado rejeita API
localhost por seguranca. OAuth externo e iPhone fisico nao foram exercitados.

## Rollout
Backend antes do frontend. Cadastro novo exige documentos publicados e acessiveis.
Nao publicar documentos juridicos nem inventar datas/aceites durante esta task.
Nao liberar o frontend antes dos dois documentos juridicos revisados: sem eles,
o cadastro permanece desabilitado. Documentos legados nao ganham aceite retroativo.
