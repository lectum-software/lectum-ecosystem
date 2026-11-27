# TASK-376 - Paginas e comunidades no GA4 sem remarketing

Status: Implementada localmente; configuracao GA4 pendente

## Escopo
Atender as quatro analises solicitadas especificamente no GA4: visitas por comunidade, cadastros por pagina de entrada, origem por pagina e engajamento por pagina. Identificar a comunidade por nome publico e URL canonica; acompanhar transicoes SPA. O usuario confirmou a implementacao apos conhecer a distincao entre coleta analitica e remarketing.

## Aceite
- [x] Nome vem do registro publico da comunidade, sem nomes de visitantes, relatos ou IDs de publicacoes.
- [x] URL publica da comunidade, titulo e parametros aprovados de campanhas no page_view.
- [x] Navegacao A -> B -> A gera tres views; polling/hidratacao nao duplica views.
- [x] Eventos de cadastro usam a pagina atual; entrada e origem ficam na sessao do GA4.
- [x] Contexto da tag acompanha a pagina para os eventos automaticos de engajamento.
- [x] Somente analytics_storage granted; publicidade e Google Signals desativados.
- [x] Novo consentimento Google v2, aviso explicito sobre nomes de comunidades.
- [x] 63 testes de privacidade, check completo e build frontend aprovados.
- [x] Validacao local mobile 390px e desktop do consentimento; no build final, aceite v1 renova para v2 e recusa anterior permanece recusada.
- [x] SDK real: tres views em A -> inicio -> A, nomes/UTMs preservados, page_leave atribui engajamento a pagina anterior e publicidade negada.
- [ ] Configuracao da propriedade GA4 verificada: medicao automatica, dimensao e evento principal.

ADR-0740. Deploy somente frontend, sem banco/env/dependencias novas. Rollback por revert/redeploy; nao reconstruir historico. Consentimento anterior nao autoriza a nova coleta. O GA4 requer configuracao propria descrita em GA4-COMMUNITY-REPORTS.md. Acesso ao navegador conectado indisponivel nesta execucao; nao declarar a propriedade configurada sem evidencia. Interface mantem estrutura existente; apenas copy atualizada, validacao mobile-first. Builder indisponivel, inventario local consultado.
