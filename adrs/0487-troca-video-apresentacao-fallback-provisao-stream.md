# ADR-0487: Fallback restrito na provisao do video de apresentacao

## Status

Accepted

## Task relacionada

TASK-171 - Corrigir troca do video de apresentacao do psicologo

## Contexto

A TASK-163 definiu o Cloudflare Stream como plano de dados para novos videos, com upload TUS direto do navegador apos o backend provisionar uma URL de uso unico. A documentacao oficial da Cloudflare confirma esse desenho: o backend cria a URL TUS com `Tus-Resumable`, `Upload-Length` e `Upload-Metadata`, e o navegador envia o arquivo diretamente ao Stream.

Em homologacao, a troca do video de apresentacao do psicologo comecou a retornar o toast publico generico de indisponibilidade. O fluxo de perfil estava seguindo exclusivamente o caminho Stream quando `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED=true`; se a etapa de provisao falhasse por provider indisponivel, timeout, rota ausente em rollout ou 5xx, o usuario ficava bloqueado mesmo com o upload legado multipart/R2 da TASK-157 ainda presente e compativel com o campo `psychologist_profile.video_url`.

Tambem ha divergencia entre paginas oficiais da Cloudflare sobre a capitalizacao de `maxDurationSeconds` no `Upload-Metadata` TUS. A referencia da API lista os metadados suportados em minusculas, incluindo `maxdurationseconds`, enquanto a documentacao narrativa ainda mostra `maxDurationSeconds`.

## Decisao

- Enviar `maxdurationseconds` em minusculas no adapter backend do Cloudflare Stream, preservando `requiresignedurls`, `allowedorigins`, thumbnail e expiracao.
- Marcar no frontend, com `VideoAssetUploadProvisionError`, somente as falhas ocorridas antes de receber a URL TUS do backend.
- Para `profile_presentation`, cair para o upload legado de perfil apenas quando essa falha de provisao for compativel com indisponibilidade/rollout: sem status, `404`, `405`, `408`, `429` ou `5xx`.
- Nao usar fallback em erros `400`, `401`, `403`, `413`, `422` ou em qualquer falha depois que o upload TUS ja comecou, para nao mascarar validacao, sessao/permissao, limite de arquivo, CORS/transporte real ou processamento.
- Manter a regra existente de so substituir/limpar o video anterior depois que o novo video for persistido com sucesso pelo caminho escolhido.

## Alternativas consideradas

### Desabilitar apenas a flag publica de Stream

Rejeitada como correcao de codigo porque depende de operacao manual e deixaria novos uploads sem o caminho alvo da arquitetura. O ajuste de metadata e o fallback restrito tornam o rollout mais resiliente sem exigir nova env.

### Fazer fallback para todo erro de Stream

Rejeitada. Se o TUS ja recebeu a URL ou o upload ja terminou e o processamento ainda esta pendente, um fallback poderia criar dois candidatos de video e permitir que o asset Stream ficasse pronto depois, sobrescrevendo o R2. Por isso o fallback e limitado a provisao inicial.

### Expor a mensagem do provider para o usuario

Rejeitada por politica de seguranca. A UI deve continuar com mensagens publicas seguras e sem detalhes de Cloudflare, token, rota interna, stack ou provider.

## Consequencias

- A troca do video de apresentacao volta a ter um caminho resiliente em homologacao/producao quando a provisao Stream estiver indisponivel, sem remover o video atual ate sucesso do novo envio.
- Durante a janela de fallback, novos videos de apresentacao podem ser gravados no armazenamento legado R2, que continua suportado por leitura, limpeza e migracao segura existentes. Essa excecao deve ser removida quando a provisao Stream estiver comprovadamente estavel.
- Comunidade/posts continuam sem fallback legado nesta decisao; o escopo e apenas autogestao de video de apresentacao.
- Nao ha schema, migration, endpoint novo, env obrigatoria nova, package novo, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback simples reverte o commit. Se o provider falhar novamente apos rollback, o usuario volta a ver indisponibilidade ao tentar trocar o video com Stream habilitado.

## Validacao

- Teste frontend da matriz de status que permite fallback apenas em falhas de provisao indisponiveis/retryable.
- Teste backend do adapter Cloudflare Stream garantindo `maxdurationseconds` no `Upload-Metadata` e ausencia de token da conta no retorno.
- `backend check`, `backend build`, `frontend check`, `frontend build`, `pnpm check`, browser local e smoke de homologacao.
