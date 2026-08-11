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

- O frontend usa o upload simples para arquivos pequenos e troca automaticamente para multipart quando a mídia passa de 40 MB.
- O backend expõe endpoints de iniciar, enviar parte, completar e abortar upload multipart, mantendo o contrato final `{ media_url, media_type }` e o prefixo público `/public/files/posts/media/`.
- Cada parte enviada ao backend tem tamanho pequeno, com upload direto do chunk para o bucket público por multipart server-side.
- A sessão e as partes do upload usam tokens opacos criptografados com a chave de JWT já obrigatória do backend; dados internos do provedor não são expostos ao cliente.
- O identificador opaco de cada parte é exposto como `part_id`, não como `part_token`, para não ser removido pelo sanitizador público que protege campos de autenticação.
- A validação de permissão de mídia em respostas permanece a mesma: psicólogo com CFP verificado e Plano Profissional ativo, ou cortesia administrativa ativa.

## Consequências

- Vídeos grandes deixam de depender de um único request HTTP de dezenas/centenas de MB ao backend.
- O backend não precisa manter o arquivo inteiro em memória, apenas o chunk atual.
- O contrato de criação de resposta não muda; a resposta continua recebendo URL pública originada do fluxo permitido.
- O frontend novo tenta multipart e faz fallback para o upload simples se encontrar backend antigo sem os endpoints, preservando rollout parcial.
- Uploads interrompidos podem deixar sessões multipart pendentes até expiração/lifecycle do storage; o frontend chama abort best-effort em falhas conhecidas.
- Campos públicos do fluxo multipart não usam sufixo `token`, evitando conflito com a política global de sanitização de respostas.

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

- Após deploy de homologação, validar manualmente com um vídeo real acima de 50 MB e abaixo de 200 MB em resposta de post.
