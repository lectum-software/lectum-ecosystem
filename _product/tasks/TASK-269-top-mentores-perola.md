# TASK-269 - Top Mentores com fundo perola

Status: Done
Dependencia: TASK-268

## Escopo

Alteracao exclusivamente visual aprovada: titulo auxiliar em Manrope, caixa alta,
14px e peso 800; fundo neutro perola para branco em todas as comunidades.
Preservar nome, avatar colorido, medalhas, colunas, ranking e interacoes.
Garantir contraste dos controles e variante neutra compativel com tema escuro.

## Referencias

Captura enviada pelo usuario em 2026-10-23 e proposta aprovada na conversa.
PROTO-INVENTORY consultado; Builder indisponivel. ADR-0632.
Validar mobile-first em 390px e desktop em 1440px.

## Aceite

- [x] Titulo auxiliar em caixa alta sem distorcao ou fonte nova.
- [x] Fundo independente das cores da comunidade, sem alterar os metais.
- [x] Checks, build e verificacao visual local aprovados.

## Evidencias

- Frontend check completo (Biome, ESLint, TypeScript e testes) aprovado.
- Testes de ranking e contrato visual: 5 aprovados; build de producao aprovado.
- Playwright em 320px, 390px e 1440px, sem overflow horizontal ou erros de pagina;
  titulo Manrope 14px/800/uppercase, icone e medalhas carregados.
- Capturas claras e escura revisadas. Podio validado com registros temporarios
  no banco local e fallback de iniciais; registros removidos ao terminar.
- Build emitiu aviso ENOSPC ao gravar cache local, mas concluiu com exit 0.
- Cache webpack regeneravel removido e tipos de rotas regenerados com next typegen
  apos identificar um validator temporario invalido em .next/dev/types.
- Versao local 0.1.707. Sem alteracao ou publicacao em producao.

## Deploy e rollback

Refinamento solicitado em 2026-10-23: suavizar apenas a cor da linha auxiliar
para cinza #686c72 (claro) e #a1a5ad (escuro), preservando tamanho e peso.
Contraste minimo superior a 4.5:1 contra os extremos dos fundos correspondentes.

Previa ficticia solicitada pelo usuario: comunidade local isolada
previa-layout-top-mentores, cinco perfis com sobrenome Exemplo e iniciais.
Sem mocks no frontend ou alteracao do ranking. Script ignorado
.tmp/task269-layout-preview.ts valida host, porta e nome do banco local;
modo cleanup remove exclusivamente os IDs task269-layout-preview.
Dados ficam disponiveis para revisao visual, sem publicacao remota.
Refinamento 0.1.708: validacao visual clara/escura aprovada em 320/390/1440px.
Build adicional compilou, mas foi interrompido apos ENOSPC recorrente no cache
local. Nao considerar esse build concluido; repetir antes da publicacao.

Somente frontend; sem banco, dependencia, env nova ou alteracao de regra.
Rollback pelo codigo anterior. Sem push, merge ou deploy automatico.
