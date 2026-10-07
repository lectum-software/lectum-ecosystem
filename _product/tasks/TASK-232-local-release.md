# TASK-232 - Publicacao do lote validado em localhost

## Objetivo

Publicar tasks 225-231 apos autorizacao de 07/10/2026. Usuario confirmou salvamento
do post local e Autodeploy off nos quatro Backend/Video de homolog e producao.
Nao publicar dados, arquivos de teste, certificados ou configuracoes locais.
ADR-0572. Sem migrations, dependencias ou alteracao de contrato backend.

## Ajustes de preparacao

- Extrair handlers do card para seu suporte existente, preservando eventos.
- Dividir suite grande de controles por apresentacao, mantendo todas as assercoes.
- Desativar deploy Git da branch homolog via vercel.json de frontend/admin.
  Main permanece habilitada; nao remover checks/protecoes para permitir merge.
- Consolidar build anterior 0.1.603 e aprovacao local do usuario; revalidar lote.
- Teste de falha de autenticacao usa porta loopback fechada no Windows, evitando
  tratar caminho Windows como hostname DNS. Unix socket preservado em outros SOs.

## Aceite

- [x] Build frontend 0.1.604 aprovado (90 paginas).
- [x] Check geral aprovado.
- [x] Salvamento local aprovado pelo usuario.
- [x] Video/post de teste fora do Git e da producao.
- [ ] PR homolog -> main revisado e merge sem excluir branch.
- [ ] Deploy frontend/admin confirmado; backend/video sem rebuild.
- [ ] Smoke produtivo e saude da API verificados.

## Operacao

Saude inicial: frontend/admin 0.1.596, API 0.1.594, health=ok e ready=ready.
Sete commits locais pendentes sobre origin/homolog. Main em ea318ca2 (PR 91).
Check geral tinha dois arquivos acima de 700 linhas; corrigir por separacao de
responsabilidades, sem ampliar limites ou suprimir testes.
Rollback: reverter o merge por PR revisado ou promover deployment Vercel anterior;
nao alterar bancos/volumes. Registrar PR, checks e smoke no fechamento.

Execucao Windows normal: frontend e gates de repositorio passaram; backend teve
870 passes e um timeout no teste de autenticacao isolada. Diagnostico com loopback
fechado validou HTTP 503 nas duas rotas sem modificar middleware/Passport/Prisma.
Executor restrito tambem apresenta falha os.userInfo; adaptacao diagnostica local
fica somente em outputs. Revalidar suite normal apos ajuste de transporte do teste.

Revalidacao normal em 07/10/2026 13:57 -03:00: pnpm check terminou com exit 0;
871 testes backend passaram. Gates raiz, frontend, admin e video aprovados.
Video manteve 11 skips existentes de render real por ausencia de FFmpeg/ffprobe;
admin manteve skip existente de source maps sem artefato de build. Nao houve
mudanca funcional nesses servicos. Build frontend 0.1.604 terminou com exit 0,
90 paginas, sem mapas de source publicados. Nenhum teste foi removido ou ignorado
para promover o lote. Evidencias em outputs/validar-release-local.log e result JSON.
