# ADR-0466: Preparação de mídia pública por finalidade

## Status

Accepted

Complemento: a decisão de preparação client-side permanece válida para imagens. O trecho de vídeo
foi substituído por Cloudflare Stream + ADR-0479; vídeo passa por passthrough validado no cliente.

## Task relacionada

TASK-159

## Contexto

O sistema possui upload de vídeos e imagens em perfil, comunidades, respostas e Admin. O primeiro
preparador com MediaBunny nasceu corretamente restrito ao vídeo de apresentação, enquanto os demais
fluxos enviam o original. Colocar compactação dentro de Axios, `FormData`, multipart ou Multer faria
todo `File` parecer equivalente e poderia transcodificar documentos futuros por acidente.

Frontend, Admin e backend têm deploys independentes. O cliente pode reduzir banda e armazenamento,
mas navegador, memória e codecs variam; portanto, a transformação local não pode ser requisito de
segurança nem garantia absoluta de normalização.

## Decisão

- Separar três responsabilidades: preparação no cliente, transporte simples/multipart e aceitação
  segura no backend.
- A preparação é acionada por `purpose` fechado e explícito no call site. Não existe interceptor
  universal baseado apenas em `file.type` ou extensão.
- Dentro do domínio já fixado pelo endpoint, uma allowlist resolve JPEG/PNG/WebP e MP4/MOV/WebM por
  MIME declarado ou extensão conhecida. Isso cobre `File.type` vazio em dispositivos móveis sem
  transformar extensão em política global; combinação desconhecida, PDF e documento são recusados.
- Vídeo usa MediaBunny/WebCodecs em worker, com políticas por finalidade, bypass de entrada eficiente,
  saída MP4 H.264/AAC menor e fallback original.
- Imagem usa APIs nativas do navegador, respeita orientação, não amplia fonte pequena, preserva alpha
  em PNG/WebP e só troca o arquivo por candidato válido e menor. APNG/WebP animado é detectado antes
  do canvas e preserva o original para não perder frames.
- Crop obrigatório continua sendo uma transformação de domínio anterior à otimização de tamanho.
- Thumbnails geradas pelo próprio produto usam um adapter passthrough explícito e não passam por
  segunda recompressão. Esse adapter nunca é escolhido por inferência e, mesmo com a finalidade
  explícita, só aceita imagem allowlisted; vídeo, documento e tipo desconhecido são recusados.
- Frontend e Admin mantêm adapters locais equivalentes; compartilhar decisão/contrato não une seus
  bundles, manifests ou ciclos de deploy.
- Documento/PDF não pertence ao registry de mídia pública. Upload privado futuro exige pipeline,
  scan e regras próprias.
- O endpoint fixa finalidade, autorização, bucket/prefixo e limite. O cliente nunca escolhe escopo de
  segurança por meio de um campo genérico.
- O backend mantém allowlist de MIME, verificação de assinatura, limite, autorização e entitlement
  para original e candidato preparado.
- O transporte continua funcional com o original. O post raiz recebe multipart aditivo antes de
  depender da otimização para atravessar proxies com arquivos grandes.
- O gate global de concorrência R2 é compartilhado entre o storage simples e as partes multipart de
  post, resposta e vídeo de apresentação. Uma request desconectada enquanto espera é removida da
  fila e não retém o slot.
- Preparação é best effort. Falha de execução em formato allowlisted segue com original; tipo fora
  da allowlist é recusado. Cancelamento explícito interrompe preparação/request e aborta multipart
  em best effort.
- Garantia de normalização de 100% exigiria processamento assíncrono no servidor e fica para decisão
  futura.

## Consequências

- Toda superfície atual de mídia pública pode reduzir bytes antes do R2 sem trocar seus contratos.
- Vídeos e imagens usam algoritmos adequados ao formato, evitando um “compressor universal” inseguro.
- Aplicações mantêm pequena duplicação intencional do adapter de imagem para preservar independência
  de build/deploy.
- Alguns dispositivos continuarão enviando originais; métricas de redução precisam distinguir
  `optimized`, `bypassed` e `fallback` sem transportar nome/conteúdo do arquivo.
- Arquivo mobile com MIME vazio continua elegível quando a extensão está na allowlist do endpoint;
  arquivo desconhecido falha cedo, antes de consumir CPU de preparação ou iniciar transporte.
- Preparar mídia consome CPU, memória e bateria. Concorrência de carrossel deve ser limitada e todo
  adapter precisa liberar bitmaps, canvases, URLs e workers.
- Preservar APNG/WebP animado nos adapters sem transformação obrigatória evita perda silenciosa de
  frames; o avatar profissional recusa animação antes do crop obrigatório. Esses arquivos continuam
  sujeitos aos limites e à validação do backend.
- Não há mudança de banco, migration ou objetos existentes. O limite total multipart do post raiz
  recebe env opcional com fallback seguro; a parte permanece fixa em 5 MiB pelo contrato comum.
- `UPLOAD_MAX_CONCURRENCY` e `UPLOAD_MAX_QUEUE_SIZE` mantêm os fallbacks atuais e passam a cobrir
  também as partes multipart, sem variável obrigatória nova.

## Rollout

- Publicar contratos multipart aditivos junto com clientes tolerantes a endpoint ausente.
- Migrar primeiro apresentação já validada, depois respostas, posts e imagens.
- Validar mobile/desktop com mídia real, alpha/orientação, bypass, fallback e cancelamento.
- Rollback desliga preparação e mantém endpoints simples; objetos já preparados permanecem válidos.

## Validação

- A validação automatizada deve cobrir registry/allowlist, políticas de imagem/vídeo, passthrough de
  thumbnail, bypass de APNG/WebP animado, ganho mínimo, MIME/extensão e limites de concorrência.
- A validação backend deve cobrir sessão/partes vinculadas ao contexto, assinatura da primeira parte,
  integração do parser/validator e cancelamento da fila global.
- Canvas, orientação/alpha, MediaBunny/WebCodecs, fallback original, cancelamento e seleção
  simples/multipart foram validados com fixtures reais em harness público local efêmero, removido
  após o smoke. MIME mobile vazio, MIME canônico, formatos animados e tipos recusados permanecem
  cobertos também por testes puros reproduzíveis.
