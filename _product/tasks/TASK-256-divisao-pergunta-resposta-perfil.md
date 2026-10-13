# TASK-256 - Divisao entre pergunta e resposta no perfil

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Escopo

Refinamento solicitado em 13/10/2026 apos a publicacao da TASK-255.
Referencia visual: WhatsApp Image 2026-10-13 at 19.49.07.jpeg enviada pelo usuario.
Mobile-first (~390px), preservando a identidade existente. Inventario consultado;
Builder indisponivel, usando captura fornecida. ADR-0618.

Remover Favoritar repetido nos cards de publicacoes do proprio perfil profissional,
mantendo a acao no topo do perfil e nos feeds. Dividir pergunta branca e resposta com
faixa azul muito suave, sem outro card/borda/sombra, em texto, video e imagem.
Corrigir os menus de resposta com portal opaco acima da arvore e do composer,
posicionamento dentro do viewport visivel e abertura para cima quando necessario.
Manter controles em uma linha e antecipar a continuacao por largura, aplicando
o mesmo limite a todos os irmaos, independentemente do papel do autor.
Refinamento aprovado: psicologos sem midia mantem WhatsApp ao lado de responder,
mas Salvar/Compartilhar ficam no menu. Com midia, as duas acoes continuam visiveis.
Calcular folga por camada real para preservar mais um nivel de texto quando couber,
sem reduzir icones, alvos ou recuos.
Nao alterar posicao, apresentacao ou comportamento do WhatsApp por pedido expresso.

## Aceite

- [x] Cards de posts e respostas no perfil nao repetem Favoritar.
- [x] Favoritar permanece nos cards fora do perfil e no cabecalho do perfil.
- [x] Pergunta separada da resposta por faixa azul suave em todas as midias.
- [x] Titulo, descricao e expansao do texto preservados, inclusive descricao vazia.
- [x] Salvos mantem apresentacao anterior; faixa apenas nas respostas do perfil.
- [x] WhatsApp e video sem alteracao.
- [x] Menus de autor e visitante compartilham portal e protecao contra clique atravessado.
- [x] Menu respeita viewport, composer, teclado e foco de retorno.
- [x] Respostas irmas de pacientes e psicologos seguem o mesmo limite por largura.
- [x] Continuacao e foco profundo preservam o comentario exato.
- [x] Texto profissional usa menu para Salvar/Compartilhar, sem mudar WhatsApp.
- [x] Folga considera os controles existentes por camada, nao uma barra hipotetica completa.
- [x] Controles nao quebram; rolagem horizontal e ultima defesa em telas extremas/zoom.
- [x] Testes, check e build frontend aprovados.
- [ ] Conferencia visual autenticada mobile/desktop.

## Validacao e rollout

Testes de renderizacao real cobrem perfil/feed, favorito ativo/inativo,
texto/video/imagem e descricao vazia. Testes de geometria cobrem telas estreitas,
largas, zoom, contadores longos, irmaos mistos, foco profundo e menu acima do composer.
Nenhum dado ficticio inserido no produto.
Sem API, migration, env, dependencia ou alteracao de midia.
Rollback somente de codigo frontend. Commit local; sem push/deploy automatico.
Controle do navegador falhou ao iniciar o processo Node; QA visual pendente.

Validacao em 13/10/2026, versao local 0.1.662:
- pnpm --dir frontend check aprovado, incluindo regressao de camada preservada.
- pnpm --dir frontend build aprovado com LECTUM_LOW_DISK_MODE=1.
- Guards de versao, segredos, encoding, ADRs, tasks, source-safety, env,
  tamanho de fontes e ciclos aprovados.
- Smoke localhost:3000/version retorna 0.1.662; /auth/login retorna HTTP 200.
- Frontend local reiniciado; backend local e producao nao foram alterados.
- Browser automatico indisponivel (falha do helper sandbox/Node); nao afirmar
  validacao visual em iPhone, desktop, Safari ou PWA. Task permanece In Progress
  exclusivamente pela conferencia visual autenticada.
