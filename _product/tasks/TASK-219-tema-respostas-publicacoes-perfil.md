# TASK-219 - Tema nas respostas das publicacoes do perfil

Data: 2026-10-06.

## Escopo

Somente na aba Publicacoes do perfil profissional, substituir Respondido em
pelo tema com chevron na linha do autor, como nos posts originais. Preservar
selo, favorito, truncamento e navegacao. Respostas no feed e no detalhe do post
continuam sem chevron. Reutilizar profilePublicationMode e o link existente.
Referencia: WhatsApp Image 2026-10-06 at 09.39.52.jpeg fornecida pelo usuario.
Arquitetura, PROTO-INVENTORY e docs locais Next consultados. Builder indisponivel;
referencia visual do anexo e componentes reais existentes. ADR-0559.

## Criterios de aceite

- [x] Respostas profissionais do perfil usam autor, selo, favorito e chevron/tema.
- [x] Linha Respondido em e seu divisor removidos somente nesse contexto.
- [x] Feed, comentarios e respostas fora do perfil preservados.
- [x] Testes de regressao e check frontend aprovados.
- [x] Layout mobile-first validado em 320/390px e desktop.
- [ ] Build e smoke de homologacao registrados.

## Deploy e rollback

Frontend somente. Sem API, banco, migration, env ou dependencia nova.
Push em homolog dispara deploy automatico. Producao exige novo pedido.
Rollback por reversao revisada em homolog. Nenhum dado persistente alterado.

## Validacao

Check frontend completo, build Next e guards de versao, encoding, ADRs, tasks
e source-safety aprovados. O build emitiu avisos de cache webpack, sem falha.
54 testes direcionados passaram, incluindo renderizacao SSR do card real com
favorito ativo/inativo, resposta fora do perfil e cabecalho desabilitado.
Chromium com SSR real e CSS publicado passou em 320/390/1440px: nome longo,
selo, alinhamento e chevron junto ao coracao, sem overflow. Fixtures somente
em teste isolado, sem endpoints simulados ou escrita de dados persistentes.
Build local servido em localhost:3002; smoke da pagina tentou carregar o perfil,
mas a aba Publicacoes nao apareceu em 60s. Nao considerar esse smoke aprovado.
Evidencias externas: outputs/profile-reply-topic-0591-*.
