# ADR-0591 - Preservar aba da comunidade no retorno do post

Status: validado localmente; publicacao autorizada.
Data: 2026-10-10
Task: TASK-23

## Contexto
A aba estava em useState e um efeito reaplicava Oportunidades ao remontar a comunidade, descartando Em destaque escolhido pelo profissional.

## Decisao
A URL passa a guardar sort e os periodos de Mais comentados/Mais uteis. Usar replace sem rolagem, preservar outros parametros e validar valores pelo catalogo existente. Sem parametro valido, manter Oportunidades para psicologo e Em destaque para paciente. Oportunidades continua restrito a psicologos. A memoria existente de retorno/rolagem ja guarda a URL completa, sem necessidade de storage paralelo. Escopo: tela interna da comunidade; nao alterar regras de ranking nem feed principal.

## Validacao e rollout
Biome e TypeScript aprovados; testes locais de navegacao/ranking aprovados. Browser com comunidade/post reais no banco local isolado, build final e commit pendentes. Bloqueio recente de build por falta de disco permanece como gate; nao usar VPS. Sem mock, package, backend, migration ou env nova. Referencia: layout atual/proto de comunidade, sem mudanca visual; Builder indisponivel. Publicacao apenas apos validacoes e autorizacao; sem push/deploy. Rollback por reversao frontend, URLs antigas seguem validas.

## Evidencia final
Build frontend/backend e check geral aprovados. Browser autenticado local com dados reais: Novos -> post -> Voltar retornou a sort=new e selecao preservada. Defaults por perfil/restricao de Oportunidades cobertos pelos testes. Nenhum mock; integracao e mutacoes de teste restritas ao PostgreSQL local.

## Preflight do lote
Dokploy consultado: Autodeploy backend/video homolog OFF; previews backend homolog e producao OFF; schedules backend homolog/producao e video homolog vazios. Video produtivo Autodeploy OFF, watch paths excluem package.json. Vercel frontend/admin ja tem deploymentEnabled.homolog=false no remoto. Workflow Stream fora dos paths alterados. API health/ready 200; backend 0.1.617 e frontend 0.1.618 antes do deploy. VPS com MemAvailable 4718224 kB e disco livre 14 GiB, sem iniciar builds concorrentes. Publicar somente PR homolog -> main, backend manual e smoke final.
