# TASK-221 - Barra fixa de favorito no perfil

## Objetivo

Ao rolar o perfil, substituir as abas fixas por identidade compacta e favorito
com a mesma apresentacao do header. Escopo: Sobre, Publicacoes e Avaliacoes.

## Referencias

- Imagem enviada: codex-clipboard-7440baa7-e584-49c4-9c5a-9f06b6c1734d.png.
- Componentes existentes ProfileHero, ProfileAvatar e FavoriteHeart.
- PROTO-INVENTORY e ARCHITECTURE consultados; Builder indisponivel neste cliente.
- ADR-0561.

## Aceite

- [x] Barra compacta aparece somente apos a acao original sair pelo topo.
- [x] Avatar, nome truncado e selo preservado; estilo do botao igual ao header.
- [x] Estado favorito, carregamento e fluxo de login compartilhados.
- [x] Proprio perfil nao oferece favorito na barra; guard existente preservado.
- [x] Abas deixam de ser sticky; WhatsApp e navegacao preservados.
- [x] Testes, build e validacao visual mobile/desktop registrados.
- [ ] Deploy de homologacao e limitacoes registrados.

## Rollout

Somente frontend, sem banco, contratos ou novas variaveis. Publicar em homolog;
producao apenas mediante pedido posterior. Risco: posicionamento ao rolar e
espaco para nomes longos. Rollback por reversao da task em homolog e promocao
revisada, se necessaria. Nenhuma acao manual de dados.

## Validacao

- Frontend check completo (Biome, ESLint, TypeScript e suites) e build passaram.
- Suite profile-hero com 11 testes, incluindo paridade do botao, aria/inert,
  perfil proprio, estado pending, observacao e abas sem sticky.
- Navegador isolado com componentes React reais, CSS do build e perfil publico
  de homologacao: 18 cenarios em 320/390/1440px, tres abas e visitante/proprio
  perfil; entrada/saida no limite do botao, retorno ao topo, favoritos sincronizados
  via props e ausencia de overflow/sobreposicao. Nao alterou favoritos reais.
- Servidor local iniciou em 3003, mas a API de homolog bloqueou sua origem por
  CORS. Fluxo integrado autenticado nao validado; confirmar em homologacao.
- Versoes, ADRs, tasks, encoding, source-safety e ciclos passaram.
- Source-size global reporta dois arquivos preexistentes de comunidade acima
  de 700 linhas (community-post-card.tsx e community-post-controls.test.mjs),
  ambos inalterados nesta task.
