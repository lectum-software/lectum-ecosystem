# ADR-0463: Upload multipart para vídeo de apresentação

## Status

Accepted

## Task relacionada

TASK-157

## Contexto

O upload do vídeo de apresentação aceitava apenas 50 MB e enviava o arquivo inteiro ao domínio
proxied da API. Um vídeo real de aproximadamente 250 MB recebeu `413 Content Too Large` em
homologação. A Cloudflare limita o tamanho do corpo de cada request conforme o plano e pode rejeitar
o arquivo antes de o Express/Multer executar. Apenas aumentar o limite do backend não corrige esse
ponto e ainda ampliaria pressão de memória, timeout e banda no processo Node.

O R2 suporta multipart e recomenda esse método para vídeos/arquivos grandes. A Lectum já usa chunks
de 5 MiB no upload de mídia de respostas, com sucesso real registrado na ADR-0452.

## Decisão

- Definir 300 MB como limite de produto para o vídeo de apresentação, suficiente para o arquivo de
  aproximadamente 250 MB que revelou o problema e ainda explícito para custo/abuso.
- Mapear os 11 endpoints binários que usam Multer em uma configuração única e atribuir uma env
  opcional a cada entrada. Os fluxos multipart têm ainda uma env para o limite total, totalizando
  13 chaves com fallback compatível em `backend/.env.example`.
- Manter o chunk operacional fixo em 5 MiB. `*_MULTIPART_CHUNK_MB` controla apenas o teto defensivo
  aceito pelo Multer e não pode reduzir abaixo de 5 MB nem fazer o navegador enviar partes maiores.
- Rejeitar configuração fora de tetos defensivos: 100 MB para imagem, 500 MB para request simples,
  50 MB para uma parte e 5 GiB para o total multipart. Limites simples/total de fluxos híbridos têm
  mínimo de 5 MB para permanecer compatíveis com o limiar dos clientes publicados.
- Manter o endpoint simples de 50 MB para compatibilidade e adicionar endpoints de iniciar, enviar
  parte, completar e abortar multipart.
- Fazer o navegador enviar sequencialmente chunks de 5 MiB à API; cada chunk é enviado ao R2 como
  uma parte e descartado da memória antes do próximo.
- Usar sessão e identificadores de parte opacos, criptografados e expirados, vinculados ao usuário,
  escopo e perfil. Nenhum `UploadId`, key interna ou ETag do provider é exposto diretamente.
- Exigir tamanho exato de cada parte a partir do tamanho declarado, validar assinatura do primeiro
  chunk e exigir todas as partes, na ordem, antes da conclusão.
- Revalidar as regras profissionais no início e na conclusão; a URL só é persistida após o R2
  confirmar o objeto completo.
- Exibir progresso percentual no frontend e aplicar retry limitado somente a falhas transitórias.
- Reutilizar no frontend o orquestrador de chunks/retry/abort e, no backend, o middleware de parte.
  O formato criptográfico já publicado para respostas permanece temporariamente intacto: convertê-lo
  no mesmo deploy invalidaria sessões iniciadas por uma versão anterior durante o rollout.
- Não adotar URL assinada direta nesta correção: embora reduza banda do backend, ela exige
  `@aws-sdk/s3-request-presigner` e CORS específico no bucket, aumentando os requisitos externos do
  rollout. A decisão pode ser revista em uma task própria de otimização.

## Consequências

- O arquivo de 250 MB deixa de atravessar Cloudflare como uma única request e não depende de upgrade
  do plano da zona.
- O backend mantém somente o chunk atual em memória, não o vídeo completo.
- Homologação e produção podem escolher limites diferentes somente por env e restart, sem fork ou
  nova compilação. Como todas as envs são opcionais, o primeiro deploy não depende de provisionamento.
- Um upload de 250 MB produz cerca de 50 requests de parte e operações Class A no R2; é um trade-off
  consciente em favor de confiabilidade sem configuração externa nova.
- Upload interrompido pode deixar sessão incompleta no R2 se o abort best-effort também falhar; o
  lifecycle do R2 permanece como segunda barreira.
- Não há alteração de schema, migration, package ou mídia já publicada. Há somente envs opcionais
  com fallback, portanto não existe **ALERTA DE DEPLOY** obrigatório nem risco de boot por ausência.
- A configuração de Multer não substitui limites anteriores ao Express. Upload simples continua
  limitado pela Cloudflare/reverse proxy; mídia grande deve usar um fluxo multipart.

## Rollout e rollback

- Publicar backend e frontend pelo fluxo normal em `homolog`.
- Como o contrato é aditivo, frontend/backend em versões diferentes continuam funcionais para o
  caminho legado; fallback para backend antigo é restrito a arquivos de até 50 MB.
- Após deploy, validar `/health`, `/ready`, versões e repetir o upload com o vídeo real.
- Nenhuma ação Cloudflare é esperada para partes de 5 MiB. Se elas ainda retornarem `413`, a conta de
  homologação deverá ser verificada manualmente, pois ela é diferente da conta disponível no projeto.
- Rollback é somente de código e restaura o comportamento de 50 MB; não exige reversão de dados.

## Referências

- Cloudflare 413 e limites por plano:
  `https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/`.
- Cloudflare R2 multipart:
  `https://developers.cloudflare.com/r2/objects/upload-objects/`.
- ADR-0452: upload multipart de mídia grande em respostas.
