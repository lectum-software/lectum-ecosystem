# TASK-230 - Setas discretas nos carrosseis desktop

## Objetivo e referencias

Pedido de 07/10/2026, screenshots de comunidades sugeridas e Publica em, e
controle real de recolher o menu lateral. PROTO-INVENTORY e arquitetura consultados.
Builder/Quick Copy indisponivel; preservar layout existente mobile-first.
ADR-0570. Nenhum pacote, banco ou contrato novo.

## Inventario

- Comunidades sugeridas no Inicio e no fim da comunidade: componente compartilhado.
- Publica em, na aba Publicacoes do psicologo: setas e alinhamento central seguro.
- Recomendacoes da pagina Seguindo: controles condicionais.
- Imagens de posts no feed, comunidade e detalhe: mesma navegacao, sem loop nas bordas.
- Miniaturas anexadas na criacao e edicao de posts: controles condicionais.
- Comunidades populares: mesmo controle; grade desktop preservada, sem setas se couber.
- Filtros do feed de psicologos ja possuem setas condicionais proprias; preservados.
- Barras de ordenacao, filtros, metricas e acoes sao ferramentas, nao carrosseis de itens;
  nenhuma mudanca no comportamento dessas barras ou na navegacao vertical de psicologos.

## Aceite

- [x] Setas de 24px, chevrons de 12px e tokens do menu lateral, somente em lg/desktop.
- [x] Cada direcao aparece apenas com overflow real, sem retorno circular nas imagens.
- [x] Medicao atualizada por scroll, resize, carga de imagens e mudancas nos itens.
- [x] Nomes acessiveis, tooltip, teclado e preferencia por movimento reduzido.
- [x] Scroll por toque e controles de seguir/remover midia preservados.
- [x] Inicio da lista Publica em acessivel mesmo quando nao cabe centralizada.
- [x] Check frontend e smoke local desktop/mobile aprovados.
- [ ] Build de producao validado apos liberar espaco.

## Validacao

Check frontend completo aprovado, incluindo 11 testes de recomendacoes/controles.
Playwright nas duas rotas reais dos screenshots: 1440px e 390px, Enter, ida e volta
ate as bordas, resize e ausencia de overflow mobile. Remocao somente no DOM do
browser de teste validou recalculo sem recarregar; nenhuma mutacao de dados.
Capturas desktop inspecionadas, sem pageerror. Sem teste em aparelho fisico ou
smoke autenticado das miniaturas/Seguindo; suites reais existentes aprovadas.

Disco C: ainda com aproximadamente 250 MB apos QA. Build completo pendente de
espaco (build da task anterior falhou por ENOSPC). Nao publicar antes de validar.
Sem push/deploy. Rollback: reverter a integracao do controle compartilhado.

Check raiz aprovou versao 0.1.602, segredos, encoding, ADRs, tasks, source-safety
e env; permanece bloqueado pelos limites preexistentes de community-post-card.tsx
(724 linhas) e community-post-controls.test.mjs (916), nao alterados nesta task.
