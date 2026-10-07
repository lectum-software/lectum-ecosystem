# TASK-229 - Header da comunidade somente ao subir

## Objetivo

Exibir a barra compacta da comunidade apenas ao rolar de volta para cima,
depois que a linha original de seguir sair pelo topo. Perfil do psicologo
preservado. Referencia: pedido do usuario, TASK-227 e PROTO-INVENTORY;
Builder/Quick Copy indisponivel. Layout existente, mobile-first. ADR-0569.

## Aceite

- [x] Descer oculta a barra; subir revela somente fora do header original.
- [x] Retornar ao topo, redimensionar e remontar deixam a barra oculta.
- [x] Gestos lentos acumulam 8px; pequenas inversoes nao causam oscilacao.
- [x] Overscroll limitado ao documento; handlers e frame limpos na desmontagem.
- [x] Seguir, acessibilidade, busca e header do psicologo preservados.
- [x] Check, tentativa de build e smoke local mobile/desktop registrados.

## Rollout

Somente frontend, sem banco, API, env ou pacote novo. Sem push/deploy.
Rollback: reverter a logica direcional mantendo o componente original.

## Validacao

Suite profile-hero: 20 testes aprovados, incluindo tres testes direcionais.
Check completo do frontend aprovado (lint, tipos e testes). Smoke Playwright em
320/390/1440px confirmou descida oculta, subida lenta revela, nova descida oculta,
retorno ao topo e busca contextual; sem overflow, sobreposicao ou pageerror.
Capturas mobile/desktop inspecionadas. PWA fisico nao testado.

Build tentou compilar 0.1.601, mas falhou por ENOSPC no disco C:. Tentativa de
limpar somente .next/cache bloqueada pela politica de execucao, mesmo apos
concessao de escrita. Build deve ser repetido depois de liberar espaco; nao
publicar este lote antes disso. Nenhum arquivo pessoal ou banco foi apagado.

Check raiz aprovou versao, segredos, encoding, ADRs, tasks, source-safety e env;
falhou nos limites preexistentes de community-post-card.tsx (724 linhas) e
community-post-controls.test.mjs (916), ambos inalterados. Sem push/deploy.
