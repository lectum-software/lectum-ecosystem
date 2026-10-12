# ADR-0606 - Publicacao do lote de interface de outubro

## Status
Publicacao autorizada em 11/10/2026; gates em andamento, sem push/merge ainda.

## Escopo e decisao
Promover o lote homolog posterior a PR #101 pelo fluxo localhost -> PR homolog/main -> producao. Usuario confirmou explicitamente conferencia visual dos ultimos ajustes ADR-0604/0605; demais ajustes ja aprovados individualmente. Preservar alteracoes locais alheias backend/swagger/api.json e frontend/AGENTS.md fora dos commits.

Corrigir gates sem bypass: remover BOM do ADR-0599 e mover helper puro createFocusedReplyRelativeUrl de reply-card.tsx para reply-support.ts existente, sem alterar logica, para respeitar limite 700 linhas. Nao ampliar limite nem suprimir testes. Timeout de optional-auth-failure requer repeticao completa com concorrencia controlada, nao exclusao do teste.

## Impacto e operacao
Sem schema/migration, dependencia nova ou env obrigatoria no lote. Backend primeiro recomendado; contrato opcional da metrica WhatsApp tolera versoes desencontradas. Exclusao usa regras no servidor; rollback de codigo nao restaura conteudo excluido. Nao excluir conteudo produtivo no smoke. Frontend/admin sao apps Vercel separados; backend/video apps Dokploy separados. Video sem mudanca funcional; bump sincronizado nao justifica restart desnecessario.

Baseline produtivo: frontend/admin/backend 0.1.622; backend health/ready 200. Frontend version redireciona para www, 200 sem cache e noindex. Sessao Dokploy expirou ao conferir homologacao; login solicitado antes de qualquer push. Vercel consultas autenticadas confirmaram frontend/admin em main, roots separados e nenhum deploy hook; homolog=false no vercel.json ja publicado deve ser preservado. Router Cloudflare fora do diff, nenhum arquivo do seu gatilho alterado.

## Validacao e gates
- [x] Autorizacao de publicacao e aprovacao visual.
- [x] Commits individuais ADR-0604 cf84baf3 (0.1.636) e ADR-0605 15e5c02a (0.1.637).
- [ ] Check completo e builds locais finais.
- [x] Gatilhos de homologacao verificados nos provedores.
- [ ] PR revisado, checks remotos e merge sem excluir homolog.
- [ ] Deploy e smoke produtivo com versoes por app.

Sessao Dokploy restaurada pelo usuario: homolog Backend Autodeploy OFF, Preview Deployments disabled, schedules vazios; homolog Video Autodeploy OFF, branch homolog, schedules vazios, watch path exclui video/package.json. Nenhum servico parado ou dado alterado. Vercel frontend/admin API consultada e config homolog=false confirmada tambem na branch remota publicada. Backend produtivo sera implantado manualmente (Autodeploy OFF). Builds frontend e backend finais aprovados; check geral em andamento.

Monitoramento VPS antes do deploy: CPU 0%, memoria 3.40/7.75 GiB e disco 44.24/58.76 GB. Executar somente um build Dokploy (backend) por vez; nenhum build homolog. GitHub webhook push continua ativo para infra.lectum.com.br, mas servicos homolog estao explicitamente com Autodeploy OFF. Nao desativar protecoes nem limpar dados.
