# TASK-222 - Header solido no Inicio

## Objetivo

Agrupar busca, seletor de comunidade e filtros sobre uma faixa continua opaca,
na cor do fundo da Lectum, sem os controles parecerem soltos sobre os videos.

## Referencias

- Captura do usuario: WhatsApp Image 2026-10-06 at 19.22.23.jpeg.
- PROTO-INVENTORY e ARCHITECTURE consultados; componentes existentes mantidos.
- ADR-0562.

## Aceite

- [x] Header do Inicio com bg-background opaco e borda inferior discreta.
- [x] Posicoes, dimensoes, menus e comportamento de rolagem preservados.
- [x] Controles sem sombras individuais; dropdowns mantem elevacao.
- [x] Tokens existentes respeitam os temas claro e escuro.
- [x] Testes e validacao visual mobile/desktop registrados.
- [ ] Build remoto e deploy de homologacao verificados.

## Rollout

Somente apresentacao do frontend; sem banco, env ou dependencia nova.
Publicar em homolog. Producao somente por pedido explicito posterior.
Risco: fundo ou menus recortados ao rolar. Rollback por reversao desta task.
Nenhuma acao manual em dados.

## Validacao

- Frontend check completo aprovado: Biome, ESLint, tipos e suites, incluindo
  tres testes novos para fundo opaco, controles sem sombra e dropdowns.
- Versoes, ADRs, tasks, encoding, source-safety e ciclos aprovados.
- Preview isolado com os controles React reais, classes do header extraidas
  da fonte, CSS do build existente e dados publicos reais de homologacao.
  Seis cenarios: 320/390/1440px, claro/escuro. Fundo opaco, borda, cobertura
  lateral mobile, ausencia de overflow e busca/seletor/filtro conferidos.
- Sem alteracao de dados reais. Capturas e relatorio em outputs/feed-header-0594*.
- Disco local com cerca de 600 MB livres e cache Next praticamente vazio:
  build completo local nao executado; validacao de build sera feita no deploy
  remoto de homologacao. Nao foram removidos arquivos do usuario.
