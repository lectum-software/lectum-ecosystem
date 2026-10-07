# Localhost para producao

Decisao do usuario em 2026-10-06; ADR-0565. Este fluxo substitui a obrigacao
anterior de publicar cada task em homologacao. Historicos antigos de tasks
descrevem entregas passadas, nao autorizam novos deploys intermediarios.

## Estado da transicao

- Dokploy Backend homolog: usuario confirmou Autodeploy desligado em 2026-10-06.
  Captura anterior confirmou branch `homolog` e Build Path `backend`.
- Dokploy Video homolog: usuario confirmou desligamento; captura
  codex-clipboard-9275be4a-f4f2-4668-b057-61f2c565174b.png mostra Autodeploy off.
- Nenhum servico, banco ou volume foi parado/excluido por esta task.
- Vercel frontend/admin: autodeploys de preview/homolog ainda nao verificados
  nem desativados. Sao externos a VPS, mas ainda geram builds intermediarios.
- Workflow Cloudflare Stream: ainda tem trigger de push em `homolog`, filtrado
  pelos arquivos do router/workflow. Nao e acionado por estas mudancas de docs.
  Revisar a estrategia explicitamente antes de alterar/publicar esse componente
  compartilhado; nao trocar para `main` sem revisar segredos e ambiente.
- PR #91 continua draft, sem merge. As duas correcoes de UI foram conferidas
  pelo usuario no iPhone. O smoke remoto anterior falhou na API homolog;
  nao assumir que isso prova falha de producao nem que a causa foi o build.

## Desenvolvimento e teste

1. Trabalhar na branch `homolog` local. Nao fazer push por ajuste.
2. Inspecionar configuracao local sem imprimir segredos. Backend local deve
   usar banco/filas de desenvolvimento e efeitos externos isolados/desligados;
   frontend no localhost apontando a API produtiva nao e ambiente isolado.
3. Conferir disco livre e portas antes de iniciar checks/builds. Nao apagar
   dados para liberar espaco nem substituir build local por deploy na VPS.
4. Usar scripts existentes (`pnpm dev:frontend`, `pnpm dev:backend`) apenas
   apos confirmar dependencias. O orquestrador `pnpm dev` tambem deve ser
   inspecionado quanto a tunel e servicos externos antes de ser iniciado.
5. Executar checks, testes e build dos apps afetados e validar fluxos locais.
   Falta de dependencia real deve ser registrada, nao mascarada por mocks.
6. Para PWA em telefone, localhost no telefone nao e o PC. Usar acesso de
   desenvolvimento seguro aprovado; validar contexto HTTPS/instalacao e
   origem da API, sem expor publicamente banco, credenciais ou admin.
7. Registrar aprovacao visual, limites de emulacao e risco residual. Criar
   commit local com o bump de versao ja exigido pelo repositorio.

## Publicacao autorizada

1. Confirmar autorizacao do usuario, escopo do lote e evidencias locais.
2. Verificar que push/PR nao dispara builds de homologacao nos provedores.
   Conferir previews, webhooks e schedules alem do Autodeploy do Dokploy.
   Nao desativar protecoes/checks obrigatorios para liberar o merge. Se um
   check depender de preview desativado, acordar substituicao por CI de
   validacao antes da promocao, sem contornar a protecao.
3. Conferir saude atual de producao, dependencias compartilhadas e rollback.
   Homologacao remota nao e requisito, mas erro em dependencia realmente
   compartilhada ou producao indisponivel exige investigacao antes do deploy.
4. Avisar e publicar os commits validados em `homolog`; criar/reutilizar PR
   `homolog` -> `main`, revisar diff e aguardar checks obrigatorios.
5. Fazer merge sem excluir `homolog`. Nenhum push direto em `main`.
6. Evitar builds simultaneos na VPS, verificar quais apps precisam mudar
   e observar CPU/memoria/disco. O bump comum dos manifests pode acionar
   mais apps; nao afirmar que deploy por app ja foi configurado.
7. Acompanhar deploy, versoes, `/health`, `/ready` e fluxos afetados. Registrar
   falha e executar rollback revisado quando necessario; nao alterar dados.

## Limites

Desligar Autodeploy impede o gatilho automatico, nao interrompe containers,
filas ou builds ja em andamento. Nao e prova de resolucao da sobrecarga.
Build de producao ainda pode pressionar recursos. Investigar metricas/logs
e capacidade separadamente; mover builds para CI requer uma mudanca propria.

Referencias: [Dokploy Auto Deploy](https://docs.dokploy.com/docs/core/auto-deploy)
e [Vercel Git](https://vercel.com/docs/git).
