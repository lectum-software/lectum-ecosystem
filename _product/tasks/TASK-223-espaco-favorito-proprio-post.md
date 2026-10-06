# TASK-223 - Espaco de favorito no proprio post

## Objetivo

Eliminar o vao entre selo e comunidade quando o autor visualiza seu proprio
post e o botao de favoritar corretamente nao aparece.

## Referencias

- Captura do usuario: WhatsApp Image 2026-10-06 at 19.38.40.jpeg.
- PROTO-INVENTORY e ARCHITECTURE consultados; componentes existentes mantidos.
- ADR-0563.

## Aceite

- [x] Slot vazio antes da comunidade nao ocupa largura ou margem.
- [x] Tema recupera o limite de largura de uma identidade sem acao.
- [x] Favoritar a si mesmo continua indisponivel.
- [x] Botao e coracao de outros profissionais preservados.
- [x] Respostas sem comunidade nao recebem chevron ou mudanca de slot.
- [x] Testes e verificacao visual mobile/desktop aprovados.
- [ ] Build remoto e deploy de homologacao verificados.

## Rollout

Somente CSS e testes; sem banco, API, dependencia ou env nova.
Publicar em homolog; producao exige pedido explicito posterior.
Rollback por reversao desta task. Nenhuma alteracao de dados reais.

## Validacao

- Frontend check completo aprovado: Biome, ESLint, tipos e todas as suites,
  incluindo tres testes novos para o slot vazio.
- Versoes, tasks, ADRs, encoding, source-safety e ciclos aprovados.
- Preview isolado com PostHeader, AuthorIdentityLine e FeedFavoriteButton reais;
  dados publicos reais e estados locais de visualizador, sem gravacoes na API.
- Playwright: 15 cenarios em 320/390/1440px, autor proprio com favoritos prontos
  ou pendentes, visitante, outro usuario e favorito ativo. Slot proprio zerado,
  chevron a 4px do selo, linha unica, sem overflow; respostas sem chevron intactas.
- CSS do build existente acrescido das regras atuais de favorito da fonte;
  fontes locais e avatar real carregados. Capturas e medidas em
  outputs/favorite-slot-0595*. Nenhum endpoint simulado.
- Build completo local nao executado: disco com cerca de 600 MB livres.
  Build remoto sera validado no deploy de homologacao.
