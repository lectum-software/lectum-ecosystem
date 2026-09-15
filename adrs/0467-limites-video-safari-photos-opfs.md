# ADR-0467: Limites de vídeo após preparação e saída temporária em OPFS

## Status

Superseded by ADR-0479

## Task relacionada

TASK-160

## Contexto

No Safari do iPhone, selecionar um vídeo pelo Fotos e selecionar o mesmo conteúdo pelo app Arquivos
podem produzir objetos `File` diferentes. O WebKit encaminha **Photo Library** ao Photos Picker com
representação compatível por padrão, enquanto **Choose File** usa o document picker. Um asset HEVC
compacto pode ser entregue ao site como H.264/MOV maior.

O produto validava o teto final de 200 MiB da comunidade antes da preparação. Assim, uma rendição
transitória criada pelo iOS era recusada como se fosse o arquivo final, embora o pipeline já pudesse
produzir MP4 de até 80 MiB. A mensagem também atribuía ao vídeo original um tamanho que, na prática,
pertencia à cópia compatível materializada pelo Safari.

Permitir qualquer tamanho até a conversão não é seguro. Ao mesmo tempo, o output atual em
`BufferTarget` mantém o MP4 final inteiro em memória e o transfere do worker como `ArrayBuffer`, o
que aumenta o pico de RAM em dispositivos móveis. É necessário separar limite de capacidade local,
limite público final e estratégia de armazenamento temporário.

## Decisão

- Vídeos passam a ter duas fronteiras de tamanho por finalidade:
  - `maxPreparationInputBytes`, calculado como
    `max(limite final, min(2 × limite final, 500 MiB))`: 400 MiB para post/comentário e 500 MiB
    para apresentação;
  - `maxUploadBytes`, preservando 200 MiB para comunidade e 300 MiB para apresentação.
- Formato/allowlist e o limite de preparação são validados antes do worker. O limite final é
  aplicado somente depois da decisão entre candidato otimizado, bypass e original.
- A política é comum às finalidades `community-post`, `community-reply` e
  `profile-presentation`; componentes não mantêm números próprios nem ramificam por user agent.
- Um original acima do limite final pode ser preparado se couber no limite transitório. Ele nunca é
  enviado como fallback se continuar acima do contrato final.
- O caminho principal de conversão usa OPFS dentro do worker:
  - entrada continua em `BlobSource`;
  - `navigator.storage.getDirectory()` cria um arquivo temporário de nome aleatório;
  - `createSyncAccessHandle()` é preferido no worker e `createWritable()` é a alternativa
    assíncrona; ambos são adaptados ao `WritableStream` consumido pelo `StreamTarget`;
  - escrita posicional e backpressure substituem o MP4 completo em `ArrayBuffer`;
  - após `finalize`, o pipeline entrega um `File` disk-backed com nome/MIME públicos normalizados.
- O ciclo de vida do temporário cobre preparação e transporte. Sucesso, erro, cancelamento e
  desmontagem fecham/abortam streams e removem a entrada OPFS em best effort.
- Falta de OPFS ou quota pode recorrer ao `BufferTarget` somente quando a entrada tiver até 64 MiB
  e a saída estimada até 16 MiB; entradas maiores não são materializadas integralmente em RAM como
  fallback. Temporários com mais de 24 horas recebem cleanup best effort na preparação seguinte.
- Falha de preparação usa o original somente quando ele já satisfaz `maxUploadBytes`. Caso contrário,
  o fluxo termina antes da request e informa que o iPhone pode ter preparado uma cópia maior,
  orientando **Choose File** ou um vídeo menor.
- Backend, multipart, MIME, assinatura, autorização, entitlement e limites permanecem fonte de
  verdade e repetem a validação final. O limite transitório não amplia nenhum endpoint.
- Imagens e documentos não adotam essa política por inferência; o escopo permanece fechado às três
  finalidades de vídeo público.

## Alternativas consideradas

### Manter a validação de 200/300 MiB antes do MediaBunny

Rejeitada porque mede a representação intermediária fornecida pelo Photos Picker e impede a própria
etapa capaz de reduzi-la.

### Elevar os limites do backend

Rejeitada porque aumenta banda, storage e superfície operacional sem corrigir a confusão entre
entrada transitória e arquivo final.

### Detectar Safari/iPhone pelo user agent

Rejeitada porque a transcodificação depende do asset, da representação e da versão do sistema. A
política correta é baseada em tamanho, formato e capacidades reais.

### Continuar usando apenas `BufferTarget`

Rejeitada para arquivos grandes por manter a saída inteira em RAM e criar transferência adicional
entre worker e thread principal. Permanece somente como fallback limitado.

### Exigir Choose File

Rejeitada como fluxo principal porque Galeria é a ação natural no iPhone. **Choose File** permanece
workaround quando o runtime não consegue preparar a rendição compatível com segurança.

## Consequências

- O vídeo de 120 MB que chega maior que 200 MB pela Galeria pode ser reduzido antes da validação
  final, em vez de receber erro imediato.
- Posts, comentários e apresentação passam a compartilhar a mesma semântica, reduzindo regressões
  divergentes entre call sites.
- OPFS reduz pressão de memória, mas consome quota temporária e exige cleanup rigoroso.
- Dispositivos sem OPFS continuam funcionais para arquivos seguros em memória ou originais já
  aceitos; alguns casos grandes terminarão com orientação explícita, sem fallback enganoso.
- O usuário pode esperar mais tempo entre seleção e upload. Progresso e cancelamento continuam
  obrigatórios durante as duas etapas.
- Nenhum dado existente, contrato, banco, objeto R2, package ou env é alterado por esta decisão.

## Rollout e rollback

- Implementar primeiro o registry compartilhado dos dois limites e testes de fronteira.
- Substituir o output do worker por OPFS/`StreamTarget` com fallback limitado e cleanup observável.
- Migrar os três call sites sem alterar endpoints e validar localmente.
- Executar smoke em iPhone real pelo Photos e Files antes de concluir TASK-160 ou promover produção.
- Rollback restaura a saída em memória e a seleção original, sem migration ou reversão de dados.
  Objetos MP4 já enviados continuam válidos.

## Validação pendente

- Confirmar em dispositivo real que Galeria entrega uma rendição maior e Choose File preserva o
  tamanho esperado para o mesmo vídeo.
- Validar post, comentário/resposta e apresentação com arquivo acima do teto final mas abaixo do
  teto transitório.
- Medir pico de RAM, quota OPFS, tempo, redução e qualidade do MP4 final.
- Exercitar ausência de OPFS, quota insuficiente, codec indisponível, cancelamento e cleanup.
- Confirmar os limites exatos no frontend e backend e executar check, build e audit.

Nenhuma evidência de implementação ou dispositivo real é considerada concluída na criação deste
ADR.

## Referências

- `https://github.com/WebKit/WebKit/blob/32377c7c9a09a52407a72c927fcf6e909207018e/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L682-L698`
- `https://github.com/WebKit/WebKit/blob/32377c7c9a09a52407a72c927fcf6e909207018e/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L736-L753`
- `https://developer.apple.com/documentation/photosui/phpickerconfiguration/assetrepresentationmode`
- `https://developer.apple.com/videos/play/wwdc2023/10107/`
- `https://support.apple.com/pt-br/116944`
- `https://mediabunny.dev/guide/writing-media-files`
- `https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system`
