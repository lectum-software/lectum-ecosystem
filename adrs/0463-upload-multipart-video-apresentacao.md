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

Após corrigir os thresholds do parser, uma request real `.mov` ainda foi rejeitada no primeiro
chunk. O payload observado continha exatamente as duas fields e o arquivo esperados. A inspeção de
assinatura era restrita a um `ftyp` no início do arquivo e somente à marca principal; o formato
QuickTime permite indicar compatibilidade também na lista de marcas e arquivos legados podem omitir
essa caixa.

Com homologação publicada, novos erros precisam ser localizáveis pelo operador no terminal do
container sem aumentar a exposição de dados. O identificador de usuário, o token da sessão, os IDs
do R2 e mensagens cruas do SDK não podem ser usados como correlação.

O primeiro smoke com essa observabilidade mostrou iniciação e abort bem-sucedidos para o mesmo
`traceId`, enquanto a parte era rejeitada como sessão inválida sem correlação. A causa não estava no
R2 nem na criptografia: o package validator move campos aceitos para `req.b` e limpa `req.body`, mas
o controller da parte ainda montava o DTO a partir de `req.body`.

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
- Para ISO BMFF/QuickTime, ler a estrutura da caixa `ftyp`, considerar marca principal e marcas
  compatíveis e permitir sua localização após no máximo oito átomos de preenchimento dentro dos
  primeiros 4 KiB. Na ausência de `ftyp`, aceitar como `video/quicktime` somente cabeçalhos de átomos
  legados plausíveis (`mdat`, `moov`, `pnot` ou `wide`); prefixos genéricos isolados não bastam.
- Não classificar QuickTime legado como MP4 e continuar recusando marcas de imagem, `ftyp` truncado
  ou malformado. Essa validação é uma barreira de conteúdo complementar ao MIME/extensão, não uma
  análise ou transcodificação integral do vídeo.
- Manter a razão interna da rejeição tipada e converter sessão, tamanho de parte e assinatura em
  códigos públicos distintos, traduzidos e acionáveis. A resposta não revela token, `UploadId`, key,
  ETag, erro criptográfico ou mensagem do R2.
- Gerar um UUID aleatório de observabilidade no início e armazená-lo apenas dentro da sessão
  criptografada. Sessões antigas sem esse campo continuam válidas durante o rollout.
- Emitir eventos estruturados `UPLOAD_MULTIPART_*` em parser, início, parte, conclusão, persistência
  e abort. Eventos de sucesso usam `info`, rejeições de contrato usam `warn` e falhas de
  infraestrutura/persistência usam `error`.
- Como o parser executa antes da leitura da sessão, suas rejeições não recebem o `traceId`; elas
  carregam somente escopo, teto de bytes e motivo enumerado. As etapas posteriores permanecem
  correlacionadas pelo UUID da sessão.
- Aplicar uma whitelist runtime antes do `console`: somente scope interno, UUID de correlação,
  MIME normalizado, contagens, número/tamanho de partes, duração e motivo enumerado são permitidos.
  Propriedades extras são descartadas mesmo se um chamador contornar a tipagem.
- Nunca registrar usuário, filename, token de sessão/parte, bucket/objeto, `UploadId`, key, ETag,
  conteúdo binário, credencial, erro bruto, mensagem ou stack do provider.
- Ler `uploadSessionId` e `partNumber` de `req.b` depois do validator. Não adicionar fallback para
  `req.body`, porque isso contornaria a sanitização/normalização que constitui o contrato vigente.
- Classificar internamente a rejeição de sessão como `session_missing`, `session_invalid`,
  `session_expired` ou `session_context`; todas continuam retornando o mesmo erro público seguro e
  nenhuma classificação inclui o token ou a identidade do usuário.
- Configurar `fileSize`, `fieldSize` e `parts` internos uma unidade acima do máximo inclusivo do
  produto. Busboy sinaliza esses thresholds ao alcançá-los; a compensação aceita exatamente o teto
  declarado e continua rejeitando o primeiro byte ou parte excedente.
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
- A semântica inclusiva fica coberta por teste HTTP multipart real, sem mock: duas fields e um chunk
  de 5 MiB são aceitos, enquanto uma field ou um byte adicional são rejeitados.
- A mesma regressão HTTP cobre a cadeia `Multer -> validator`: uma sessão longa permanece integral
  em `req.b`, `partNumber` é convertido para número e `req.body` fica vazio como previsto. Isso
  impede o controller de voltar a depender do corpo bruto.
- MOVs com `qt  ` em `major_brand` ou `compatible_brands`, `ftyp` após preenchimento e cabeçalhos
  QuickTime legados ficam cobertos por regressões; HEIC, caixa malformada e preenchimento genérico
  isolado permanecem rejeitados.
- Um vídeo de 250 MiB gera aproximadamente dois eventos por parte, além de início/conclusão,
  privilegiando diagnóstico de travamentos e falhas pontuais. O volume é aceito para este fluxo
  operacional e pode ser agregado em task posterior sem alterar o contrato público.
- A instrumentação não cria env, package, schema, migration ou dependência de serviço externo.

## Rollout e rollback

- Publicar backend e frontend pelo fluxo normal em `homolog`.
- Como o contrato é aditivo, frontend/backend em versões diferentes continuam funcionais para o
  caminho legado; fallback para backend antigo é restrito a arquivos de até 50 MB.
- Após deploy, validar `/health`, `/ready`, versões e repetir o upload com o vídeo real.
- No terminal, filtrar por `UPLOAD_MULTIPART` e acompanhar um único `traceId`; a sequência saudável é
  `INITIATE_SUCCESS`, pares `PART_START`/`PART_SUCCESS`, `COMPLETE_SUCCESS` e `PERSIST_SUCCESS`.
- Nenhuma ação Cloudflare é esperada para partes de 5 MiB. Se elas ainda retornarem `413`, a conta de
  homologação deverá ser verificada manualmente, pois ela é diferente da conta disponível no projeto.
- Rollback é somente de código e restaura o comportamento de 50 MB; não exige reversão de dados.

## Referências

- Cloudflare 413 e limites por plano:
  `https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/`.
- Cloudflare R2 multipart:
  `https://developers.cloudflare.com/r2/objects/upload-objects/`.
- Apple QuickTime File Format — File type compatibility atom:
  `https://developer.apple.com/documentation/quicktime-file-format/file_type_compatibility_atom`.
- MP4 Registration Authority — marcas registradas:
  `https://mp4ra.org/registered-types/brands`.
- W3C ISO BMFF byte stream format:
  `https://www.w3.org/TR/mse-byte-stream-format-isobmff/`.
- ADR-0452: upload multipart de mídia grande em respostas.
