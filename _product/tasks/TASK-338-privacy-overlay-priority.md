# TASK-338 — Prioridade da janela de cookies

Corrigir sobreposição reportada em 22/11/2026. Referência: capturas do usuário, layout existente mobile-first.

- [x] Aviso mantém prioridade até escolha ou navegação.
- [x] Aviso e preferências usam camada modal nativa; outras modais aguardam.
- [x] Onboarding reconhece cookies e diálogos nativos.
- [x] Checks, build e validação no navegador local executados; ressalva abaixo.

Sem alteração de consentimento, eventos ou backend. Publicação pendente.

Validação: Edge local 390/1440 na página real e Preferências; serviços externos bloqueados, feed indisponível no localhost, sem alteração de dados. Harness com componentes reais comprovou modal adiada, retomada e rascunho preservado. Suite Modal em Chrome: 23 testes aprovados. Build frontend aprovado. Lint, TypeScript, testes gerais, testes de modais (23/23), content-videos, testimonials e release-batch aprovados. A suíte adicional video-contact falha no caso preexistente "failed standby metadata is retried once on activation" (13/14 tentativas em vez de 1); reproduzido isoladamente. O harness e suas 17 fontes carregadas não têm alterações nesta task. Não afirmar check completo verde; publicação pendente desta ressalva. ADR-0703. Versão 0.1.832.
