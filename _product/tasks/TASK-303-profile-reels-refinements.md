# TASK-303 - Refinamentos de publicacoes, depoimentos e reels

## Escopo aprovado

Implementar os nove ajustes aprovados em 31/10/2026. Referencias: imagens do usuario e previa aprovada em .tmp/community-disclosure-preview/APPROVED.md. Mobile-first em 390px, com verificacao em 320px e desktop. ARCHITECTURE, PROTO-INVENTORY e docs locais do Next consultados. Builder nao disponivel; componentes existentes e capturas aprovadas sao a referencia.

## Aceite

- [x] Icones de reels menores, preservando alvos de toque e controles.
- [x] Modal de depoimentos alinhada a esquerda em todas as entradas e com nomes longos.
- [x] Botao do estado vazio de depoimentos com medidas do botao de Salvos.
- [x] Posts do paciente em Minhas publicacoes com a apresentacao do feed e gestao preservada.
- [x] Aviso de upgrade acima de reels, com foco, bloqueio de interacoes e pausa de midia.
- [x] WhatsApp em posts com fotos na barra de acoes como nos posts de texto.
- [x] Comunidades expansiveis conforme previa, contagens reais, selos e rolagem apos tres linhas.
- [x] Foco inicial dos comentarios sem contorno indevido no X por toque; teclado acessivel.
- [x] Ocultar respostas proprias diretamente no perfil, sem acao para visitantes ou posts.
- [x] Checks, builds, testes de permissoes e QA visual locais registrados.

Sem push/deploy autorizado. API aditiva para contagens por comunidade, sem migration, dependencia ou env nova. ADR-0666. Publicar backend antes do frontend no futuro; frontend tolera campos de contagem ausentes. Rollback de codigo nao desfaz escolhas de visibilidade efetuadas pelo usuario. Safari/iPhone fisico requer validacao separada.

## Evidencias locais

- Versao 0.1.763, um unico bump sincronizado nos cinco manifests.
- `pnpm check` integral aprovado: guardas, frontend, backend, admin e video. Testes especificos do lote: quatro aprovados, mais cobertura backend da agregacao por comunidade.
- Builds backend e frontend aprovados, incluindo TypeScript, geracao de paginas e remocao padrao de source maps. Guarda de source-safety aprovada apos a ultima alteracao.
- Playwright/Chrome com API Express e PostgreSQL reais locais, sem mocks HTTP, em 320/390/1440. Fixtures criadas com UUIDs exclusivos e removidas ao final.
- Tres linhas inteiras na lista com cinco comunidades, rolagem ate as demais, nomes longos, estado sem selo, selos no avatar e ausencia de overflow horizontal conferidos.
- Altura do CTA comparada diretamente com o botao real de Salvos; modal alinhada a esquerda; card do paciente com menu de autoria; foto com WhatsApp na barra de acoes.
- Comentarios com foco inicial no titulo; aviso de upgrade em `:modal`, video pausado e controle de fechamento acima dos controles do Reels. Escape fecha somente o overlay ativo.
- Mutacao real de ocultar retornou HTTP 200, gravou `hidden_from_profile=true` e removeu a resposta do perfil. Menu de Minhas publicacoes restaurou `false`. Visitante sem controle de ocultacao.
- Evidencias ignoradas pelo Git: `.tmp/task303-browser-results.json`, `.tmp/task303-*.png`, `.tmp/task303-check.log`, `.tmp/task303-backend-build.log` e `.tmp/task303-build.log`.

## Limites e observacoes

Safari/iPhone fisico nao testado. A suite geral mantem skips de integracoes opcionais; nao foram apresentados como aprovados.

O navegador de QA bloqueou conexoes externas, inclusive injecoes locais do AdGuard. O indicador de desenvolvimento do Next foi ocultado somente no roteiro de QA porque interceptava o botao de camera; nenhum componente da aplicacao foi ocultado.

Ocorreram HTTP 500 no QA e logs sanitizados de `page-view-tracking` e `visitor-location-capture`. A causa nao foi confirmada. Analytics nao foi alterado nesta task; os fluxos funcionais passaram, mas isso nao confirma saude completa da telemetria. Investigar separadamente antes de promover como lote sem ressalvas.
