# TASK-251 - Contexto da arvore e filtros do feed

## Escopo

Corrigir controles de ramos ao abrir resposta por Minhas Publicacoes e manter o
filtro ativo visivel no carrossel do feed principal e da comunidade ao retornar.
Referencia mobile-first: captura do usuario de 12/10/2026, Mais uteis selecionado.
Preservar layout, URL, periodos, rolagem vertical e regras de listagem existentes.

## Aceite

- [x] Caminho de resposta focada abre automaticamente e conserva controles de ramo.
- [x] Ocultar e reabrir prevalece sobre foco automatico; novo foco revela novo caminho.
- [x] Filtro ativo reaparece na area horizontal visivel na montagem e troca de selecao.
- [x] Resize e mudanca de largura dos chips ajustam somente o carrossel.
- [x] Validar check frontend e guards; registrar limitacoes do ambiente local.
- [x] Concluir QA visual da arvore por Minhas Publicacoes e do retorno aos filtros.

## Decisao e rollout

ADR-0613. Somente frontend, sem API, banco, env ou dependencia nova.
Sem push/deploy. Rollback pela versao anterior do frontend. Fonte visual enviada
pelo usuario, sem redesenho nem necessidade de Builder/Quick Copy.

## Validacao

`pnpm --dir frontend check` aprovado: 760 testes, lint e typecheck. Os 10 testes
focados de disclosure e filtros tambem passaram. Guards de versao, encoding,
ADRs, tarefas, source-safety, env, source-size e ciclos aprovados, assim como
`git diff --check`. Versao sincronizada em 0.1.655.

QA local chegou ao diretorio de comunidades com dados reais. A compilacao da
rota de comunidade falhou com `ENOSPC` no cache do Next; os dois fluxos completos
continuam sem validacao visual. Build de release nao executado por falta de
espaco. Servidor frontend local encerrado; nenhum push ou deploy realizado.

## Retomada da validacao - 2026-10-12

- Build frontend 0.1.655 concluido com sucesso apos liberar espaco, com
  `LECTUM_LOW_DISK_MODE=1` e heap limitado. Sem mudanca de codigo posterior.
- QA em 390x844: Minhas Publicacoes -> Comentarios -> resposta aninhada exibiu
  Ocultar respostas nos dois ancestrais abertos pelo foco. Recolher funcionou nos
  dois niveis; reabrir manteve a sequencia de tres respostas, Ver mais e Ocultar.
- Na comunidade, Mais uteis / Desde sempre ficou totalmente visivel na selecao e
  depois de abrir um post e voltar. DOM confirmou `scrollLeft` de aproximadamente
  179px e chip ativo inteiramente dentro do viewport, preservando os filtros na URL.
- O feed principal da conta local de paciente nao exibe os filtros profissionais.
  Solicitado login local de psicologo para concluir esse recorte, sem pedir senha.
- Nova execucao de `pnpm check` passou pelos guards e lint, mas falhou no typecheck
  por sintaxe em `.next/dev/types/validator.ts`, artefato gerado durante a sessao dev.
  Check completo precisa ser repetido com servidor dev parado e tipos regenerados;
  nao considerar essa execucao aprovada nem alterar codigo de produto para mascara-la.
- Dokploy homolog: backend com Autodeploy off, previews desativados e sem schedules;
  video com Autodeploy off e sem schedules. Vercel frontend/admin tem bloqueio de
  `homolog` em vercel.json ja presente na branch remota; Preview Branch Tracking
  permanece ligado na interface. Nenhuma configuracao externa foi alterada.
- Ha um webhook GitHub ativo apontando ao Dokploy, com entregas recentes HTTP 400;
  identificar seu destino antes do push. Nao registrar o token/URL de acionamento.
- Producao conferida: backend e frontend 0.1.653; ping, health, ready e version HTTP 200.
  Sem push, PR, merge ou deploy deste lote.

## Aprovacao para publicacao - 2026-10-13

- Usuario confirmou no localhost que Mais uteis permanece visivel no feed principal
  ao abrir um post e retornar. Complementa a QA de comunidade e arvore descrita acima.
- Os 47 testes focados passaram novamente. Typecheck frontend sem escrita incremental
  tambem passou, sem reproduzir o erro anterior do validator gerado pelo Next.
- Guards de seguranca, estrutura, documentacao e versao passaram novamente.
- A ultima entrega do webhook Dokploy, para refs/heads/main, retornou HTTP 400 com
  Automatic deployments are disabled for this application. Nenhum gatilho foi alterado.
- Producao segue com frontend/backend 0.1.653; endpoints publicos de saude retornaram
  HTTP 200. Check completo, build final e revisao do PR ainda precedem o deploy.
- Cache frontend/.next/cache removido com autorizacao especifica do usuario;
  recuperados aproximadamente 321 MiB fisicos. Nenhum dado de produto foi removido.

## Gate final - 2026-10-13

- pnpm check completo aprovado em 0.1.656, inclusive 913 testes do backend.
  Timeout isolado da primeira execucao nao se repetiu na suite completa; sem
  relaxar assercoes nem timeout. Logs em .tmp/release-0656-check-retry.log.
- Build de producao frontend aprovado com TypeScript e 90 paginas; log em
  .tmp/release-0656-frontend-build.log. Nenhuma mudanca funcional apos a QA.
- Revisao do diff restrita as tres correcoes, testes, ADRs, tasks e bump obrigatorio.
  Sem contrato, banco, infraestrutura ou dependencia nova. Publicacao via PR,
  sem novo deploy de backend/video. Rollback frontend: deployment Vercel 0.1.653.

## Estabilidade do hook de publicacao - 2026-10-13

- O push de 0.1.656 foi bloqueado pelo mesmo timeout de optional-auth-failure.
  Nenhum commit foi enviado. Os demais checks do hook passaram.
- Concorrencia do runner backend limitada a dois arquivos (ADR-0613), sem remover
  testes nem aumentar timeout. Sem alteracao no runtime ou configuracao produtiva.
- Nova validacao e build de release necessarios antes de repetir o push.

- Fechamento 0.1.657: check backend completo aprovado (913 testes, zero skips),
  optional-auth-failure passou em 5,2s dentro da suite com limite original de 30s.
- Novo build frontend 0.1.657 aprovado com TypeScript e 90 paginas, sem alteracao
  das correcoes de UI aprovadas. Evidencias: .tmp/release-0657-backend-check.log e
  .tmp/release-0657-frontend-build.log. Hooks completos mantidos na repeticao do push.
