# TASK-301 - Convites de depoimento em janelas e menus

## Escopo aprovado

Somente novas respostas em video, diretamente ao paciente. Janela fixa de 24h
a partir da primeira resposta elegivel; profissionais distintos entram na mesma
janela sem prolonga-la. Novo profissional apos o prazo abre outra janela.
Uma notificacao interna e uma tentativa push por lote, respeitando preferencias;
sem email, campanha retroativa ou nova solicitacao para o mesmo profissional.
Copy aprovada: Recebeu acolhimento? Retribua com um relato. CTA: Deixar depoimento.
Padronizar iniciais dos menus de paciente e psicologo, sem mudar destinos.
Bloco de comunidades permanece somente previa, nao implementado.

## Aceite

- [x] Persistencia, concorrencia e limite exato de 24h testados no PostgreSQL local.
- [x] Texto/imagem, avaliacoes existentes, opt-out e alvos removidos nao geram convites.
- [x] Push idempotente e link restrito aos profissionais elegiveis do lote do paciente.
- [x] Menus, copy, acao push e compatibilidade de frontend validados.
- [x] Migracao local, checks, builds e smoke local; sem push/deploy.

ADR-0664. Flags existentes permanecem desligadas por padrao. Ativacao produtiva
somente depois de migracao, backend e frontend atualizados e autorizacao explicita.

## Evidencias e limites

- Migracao aditiva aplicada por db:migrate no PostgreSQL 127.0.0.1:55432,
  banco lectum_task295_visibility_dev_20261030, sem reset/backfill.
- Backend check/build aprovados; 1136 testes, sem falhas ou skips.
- Frontend check completo aprovado; suite final de depoimentos 71/71, incluindo
  Chrome real. Build isolado em 0.1.761, sem configuracao produtiva.
- Script backend/scripts/testimonial-windows.integration.ts usa PostgreSQL real:
  concorrencia, prazo exato, nova janela, canais, dedup, ocultacao, exclusao,
  opt-out, silenciamento, resposta indireta e propriedade do lote.
- Chrome local autenticado com API real: menus dos dois perfis, fonte Manrope,
  ausencia de overflow em 320/390/1440; link com lote e acesso por outro paciente.
- Complemento TASK-300: MP4 real servido localmente; retorno do perfil preservou
  o tempo, termino natural avancou a outra comunidade, camera gratuita branca em
  fundo escuro. Sem mock de endpoint; registros temporarios removidos ao final.
- Logs/capturas em .tmp/task301-*. Nenhuma chamada a provider push ou producao.
  Payload/acao e claim foram testados localmente; entrega em aparelho via
  VAPID/servico externo exige smoke autorizado apos o deploy.
- Ultima padronizacao inclui Sair da Conta. Preview de comunidades fora do lote.
- Build/check repetidos apos o ultimo rotulo; smoke autenticado final aprovado
  nos tres tamanhos, incluindo reels. Registros temporarios removidos e nenhuma
  requisicao externa no navegador. Guardas do repositorio e diff-check aprovados.
