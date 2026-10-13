# TASK-255 - Pergunta de video e acoes profissionais

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Escopo

Pedido de 13/10/2026, capturas WhatsApp 18:28:55, 18:29:03 e 18:35:14.
No perfil profissional, videos-resposta usam titulo e descricao da pergunta
acima da autoria e da resposta, como textos-resposta, sem caixa no player.
Na arvore do post e continuacao, psicologos mantem Salvar/Compartilhar visiveis.
Demais participantes continuam com essas acoes no menu do cabecalho.
WhatsApp segue depois de comentar em texto, sem duplicar o CTA de midia.
Mobile-first (~390px), preservando componentes e identidade visual existentes.
Inventario visual consultado; Builder indisponivel, referencias do usuario.
ADR-0617. Sem publicacao solicitada nesta etapa.

## Aceite

- [x] Perfil mostra pergunta antes de autoria/resposta em texto e video.
- [x] Video do perfil nao recebe caixa de pergunta; exportacao social preservada.
- [x] Psicologos tem Salvar/Compartilhar na barra, sem duplicacao no menu.
- [x] Demais autores mantem Salvar/Compartilhar no menu, inclusive comentario proprio.
- [x] WhatsApp de texto segue comentar; midia mantem CTA sem icone duplicado.
- [x] Arvore e continuacao preservam handlers, estado salvo e pendencia.
- [x] Controles podem quebrar linha em ramos estreitos sem reduzir alvos.
- [x] Check e build frontend aprovados.
- [ ] Validacao visual local mobile/desktop dos fluxos autenticados.

## Riscos e rollout

Frontend-only; sem API, migration, env, pacote ou alteracao de arquivos de video.
O componente de overlay segue disponivel em Salvos, fora do escopo do perfil.
Rollback de codigo frontend sem operacoes em dados. Sem push/deploy automatico.

## Validacao local

Versao 0.1.661. Check frontend completo aprovado; regressao SSR cobre pergunta
em texto/video/imagem, papeis de autor, estado salvo, pending e ordem WhatsApp.
Casos novos reutilizam o harness real em community-post-controls.test.mjs.
Build aprovado (.tmp/task-255-frontend-build.log), sem source maps publicados.
Limite de tamanho de fontes aprovado. Localhost:3000/version confirma 0.1.661;
login e API de desenvolvimento /ready respondem HTTP 200.
Controle do navegador falhou em duas tentativas (processo Node encerrado);
nao houve validacao visual autenticada, nem confirmacao em iPhone nesta etapa.
Alteracoes e commit locais apenas; producao nao alterada.
