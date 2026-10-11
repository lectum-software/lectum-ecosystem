# ADR-0595: Controles de video-resposta no perfil

Data: 2026-10-11. Status: aceita.

## Decisao

Usar o mesmo CommunityActionBar de Salvos nas video-respostas do perfil: tamanho sm, votos agrupados com rotulo Util, contador de respostas e acoes salvar/compartilhar alinhadas ao final. Preservar IDs, mutations, links, player e comentarios compactos. Respostas de texto/imagem nao mudam.

## Impacto de deploy

Somente frontend, sem API, banco, env ou package novo. Rollout independente e rollback por reversao revisada. Sem push/deploy neste lote.

## Validacao e limite

Mobile-first 390px e desktop. Referencia: capturas aprovadas, componente Salvos e PROTO-INVENTORY. Builder/Quick Copy indisponivel. O perfil indicado pelo usuario existe localmente, mas nao tem cadastro profissional nem video-respostas. Usuario informou que conferira a pagina completa em producao. Nao copiar CPF nem ampliar os dados privados locais. Validar o componente real com a resposta autorizada e API local real em suporte temporario de QA; remover suporte antes do build/commit. A verificacao end-to-end da pagina publica permanece pendente, sem alegar que foi executada.

### Evidencia executada

Componente ProfileCommunityPostCard real validado em 390x844 e 1280x900 com API autenticada e video real do banco local isolado. Barra maior com Util, contador, salvar e compartilhar; voto real 0->1->0 e link para a conversa conferidos. Nenhum mock ou relaxamento do guard de perfil. Suporte efemero removido antes do build; tipos gerados obsoletos desse suporte removidos apos primeiro typecheck apontar a referencia. A pagina publica completa segue pendente por ausencia de perfil local elegivel, com ciencia do usuario.

Check completo e build do frontend aprovados. Guards de ADRs, tasks, tamanho, source-safety e encoding aprovados. Sem suporte de QA no artefato final.
