# TASK-357 - Sitemaps dinamicos

Status: Concluida localmente em 2026-11-24. Sem autorizacao de publicacao desta task.

## Escopo

Substituir as quatro URLs estaticas por um indice paginado que inclui comunidades,
perfis profissionais publicos, posts publicados e videos publicos de posts/respostas.
Usar a mesma elegibilidade das paginas existentes, sem credenciais do visitante.
Sem mudanca de interface, banco ou dependencias.

## Aceite

- [x] Indice aponta para todas as particoes do catalogo publico.
- [x] Videos usam URL canonica, capa/conteudo estaveis e data real.
- [x] Rascunhos, conteudo removido e videos indisponiveis ficam fora.
- [x] Datas de modificacao persistidas; paginas estaticas sem data inventada.
- [x] Checks e builds completos.
- [x] Integracao com PostgreSQL isolado e handlers reais.

## Validacao

Banco local isolado ja autorizado, sem acesso ao banco de producao.
Mais de 500 posts temporarios comprovam paginacao; conteudo temporario removido
ao final. Handlers do frontend consomem o roteador real e geram XML local.
Evidencias nao versionadas em out/seo-post-preview.
Testes de regressao do backend e frontend acompanham o codigo.

Versao local 0.1.859: pnpm check e builds de backend/frontend passaram.
Quatro testes especificos em cada aplicacao passaram, alem de 13 verificacoes
de integracao com PostgreSQL e API reais. Parser XML aceitou indice e videos.
Checks usam DATABASE_URL local e JWT efemero, sem credenciais de producao.
Testes opcionais de browser, Docker e providers mantiveram seus skips padrao;
nenhuma interface foi alterada. Banco local encerrado apos a validacao.

## Rollout

Publicar backend primeiro e frontend depois. Nenhuma migration ou env nova.
API antiga ausente gera 503 sem cache no sitemap dinamico, nunca lista vazia
com sucesso. Cache de sucesso de cinco minutos. Conferir indice e particoes
em producao antes de reenviar sitemap.xml no Search Console.
Nao garante indexacao: o Google ainda precisa rastrear e selecionar as paginas.
Sem push ou deploy nesta task.

Referencia: ADR-0721.
