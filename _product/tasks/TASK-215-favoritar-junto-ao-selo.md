# TASK-215 - Favoritar junto ao selo e rotulo profissional neutro

Data: 2026-10-05.

## Escopo

Aplicar a decisao aprovada: + Favoritar junto ao selo verificado nos posts,
respostas e comentarios. Ao favoritar, o coracao vermelho permanece no inicio
do mesmo espaco. Resposta profissional usa grafite semibold, sem brilho.
Nao alterar os controles de perfil, diretorio ou comunidade.

Referencia: capturas e decisao do usuario nesta conversa; PROTO-INVENTORY
consultado. Builder/Quick Copy nao exposto neste cliente; preservar componentes
existentes. Mobile-first, incluindo nomes longos e desktop.

## Criterios de aceite

- [x] Acao apos o selo, incluindo nomes curtos, sem alinhamento a direita.
- [x] Espaco fixo de 66px preserva nome e selo durante a transicao.
- [x] Gap de 8px entre selo e controle; icone interno inicia cerca de 10px apos selo.
- [x] Nome longo com reticencias; selo e acao nao encolhem.
- [x] Preservar + Favoritar, fonte, fundo transparente e coracao vermelho existentes.
- [x] Manter animacao suave e prefers-reduced-motion.
- [x] Rotulos profissionais em grafite semibold estatico.
- [x] Testes direcionados dos controles aprovados (33 casos).
- [x] Checks completos e build do frontend.
- [x] Smoke local mobile: pagina renderiza; API local indisponivel, sem dados simulados.

## Validacao

Suite completa frontend (Biome, ESLint, TypeScript e testes), build e guards de
versao, ADRs, tasks, source-safety e encoding aprovados. Um teste preexistente
de symlink e ignorado no Windows por permissao. Sem alteracao funcional backend.
Smoke local: http://localhost:3025/ em 390x844; feed indisponivel por falta de API.
Conferencia visual mobile/desktop e transicao com dados reais sera registrada
apos o deploy em outputs/favorite-near-badge-0587-smoke.md, fora do artefato.

## Deploy

Somente apresentacao frontend. Sem API, migration, env ou dependencia nova.
Publicar em homolog; producao permanece em 0.1.586.
ADR-0555. Evidencias no workspace outputs/favorite-near-badge-0587-*.
