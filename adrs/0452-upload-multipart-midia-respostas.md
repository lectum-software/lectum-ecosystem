# ADR-0452: Upload multipart para mídia grande em respostas

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

O limite de produto para mídia de comunidade foi ampliado para 200 MB, mas vídeos grandes ainda podiam falhar no envio de respostas porque o caminho anterior enviava um único request multipart ao backend e o storage customizado carregava o arquivo completo em memória antes de gravar no bucket público.

Em ambientes publicados, esse fluxo fica suscetível a limite intermediário de proxy/runtime, timeout e pressão de memória, mesmo quando a validação da aplicação aceita 200 MB.

## Decisão

Adicionar um fluxo aditivo de upload multipart para mídia grande em respostas de post:

- O frontend usa o upload simples para arquivos pequenos e troca automaticamente para multipart quando a midia passa de 5 MB, alinhado ao tamanho seguro de chunk do backend.
- O backend expõe endpoints de iniciar, enviar parte, completar e abortar upload multipart, mantendo o contrato final `{ media_url, media_type }` e o prefixo público `/public/files/posts/media/`.
- Cada parte enviada ao backend tem tamanho pequeno, com upload direto do chunk para o bucket público por multipart server-side.
- O cliente faz até 3 tentativas por parte em falhas transitórias/rede antes de abortar a sessão multipart.
- O cliente normaliza o MIME por declaração do navegador e, quando necessário, por extensão conhecida para tolerar arquivos mobile com `File.type` vazio ou parametrizado.
- A sessão e as partes do upload usam tokens opacos criptografados com a chave de JWT já obrigatória do backend; dados internos do provedor não são expostos ao cliente.
- O identificador opaco de cada parte é exposto como `part_id`, não como `part_token`, para não ser removido pelo sanitizador público que protege campos de autenticação.
- Durante o rollout, o backend também aceita `partToken` na finalização e devolve `part_token` como alias legado restrito ao endpoint de parte, porque PWAs/browsers podem manter o JavaScript anterior em cache por alguns minutos.
- A validação de permissão de mídia em respostas permanece a mesma: psicólogo com CFP verificado e Plano Profissional ativo, ou cortesia administrativa ativa.
- Thumbnails de video em respostas/comentarios dentro da Lectum sao cruas, sem moldura `Respondido na Lectum`; a moldura com caixa azul e identificacao profissional fica restrita ao fluxo de compartilhamento externo.
- A preparacao local de preview/miniatura de videos selecionados e agendada apos o retorno ao composer, para que a galeria nativa feche e o carregamento aconteca no campo de resposta.
- O trigger de midia do composer de respostas fica dentro do campo, centralizado verticalmente, com contraste forte; quando uma midia esta anexada, ele e ocultado ate a remocao da midia.
- O composer ativo em mobile reaproveita o padding de safe-area da navegacao inferior, e o campo usa raio `24px` com botao de camera de `36px` para manter margens internas equilibradas.

## Consequências

- Vídeos grandes deixam de depender de um único request HTTP de dezenas/centenas de MB ao backend.
- O backend não precisa manter o arquivo inteiro em memória, apenas o chunk atual.
- O contrato de criação de resposta não muda; a resposta continua recebendo URL pública originada do fluxo permitido.
- O frontend novo tenta multipart e faz fallback para o upload simples se encontrar backend antigo sem os endpoints, preservando rollout parcial.
- Uploads interrompidos podem deixar sessões multipart pendentes até expiração/lifecycle do storage; o frontend chama abort best-effort em falhas conhecidas.
- Campos públicos do fluxo multipart não usam sufixo `token`, evitando conflito com a política global de sanitização de respostas.
- A compatibilidade com `part_token` é uma exceção transitória e não representa token de autenticação; o valor continua opaco, criptografado, expira e só é aceito junto da sessão do mesmo usuário.
- Vídeos médios, como o arquivo real de 13,89 MB usado no diagnóstico de 2026-08-11, também deixam de depender do upload simples e passam a ser enviados em partes.
- O chunk de 8 MB funcionava no R2, mas ainda ficava perto de limites intermediarios de proxy/runtime quando embalado em `multipart/form-data`; por isso o chunk publicado passa a 5 MB.
- O arquivo real `IMG_3087.MP4` de 120,05 MB foi validado localmente em 25 chunks de 5 MB, e o multipart direto no R2 completou com sucesso; a mitigacao restante fica no cliente/rede/PWA, nao no storage.
- Videos de comentarios ja publicados com thumbnail de compartilhamento podem continuar tendo a miniatura antiga no registro, mas a UI de resposta ignora essa thumbnail para renderizar o video sem a moldura externa.

## Produção e rollout

- Sem migration, sem alteração de dados existentes e sem novo package.
- Sem nova env obrigatória; reutiliza `JWT_SECRET_KEY` e as envs existentes de R2 já usadas pelo upload atual.
- Mudança aditiva: backend antigo continua aceitando upload simples, e frontend novo usa fallback em 404/405 dos endpoints multipart.
- Rollback: reverter o commit remove o fluxo multipart e volta ao upload simples com limite lógico de 200 MB, mas grandes vídeos podem voltar a falhar por infraestrutura.

## Validação

- `pnpm --dir backend biome:check`
- `pnpm --dir backend typecheck`
- `pnpm --dir frontend biome:check`

## Pendências

- Após deploy de homologação, validar manualmente com o vídeo real `IMG_3087.MP4` em resposta de post autenticada no celular/PWA.
