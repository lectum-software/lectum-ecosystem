# TASK-160: Limites em duas etapas para vídeos no Safari Photos

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-160 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Operação e mídia pública |
| Status | Superseded |
| Dependências | TASK-157, TASK-158, TASK-159 |
| ADR alvo | ADR-0467 |

> **Substituída em 2026-09-03 pela TASK-164.** A adoção de Cloudflare Stream na TASK-163 tornou a
> transcodificação obrigatória no navegador desnecessária. A TASK-164 remove MediaBunny, Web Worker
> e temporários OPFS do caminho de upload. Os limites finais e a validação backend continuam
> válidos; processamento futuro ocorre fora do dispositivo, em serviço Node isolado.

## Contexto

Em um iPhone com Safari, um vídeo exibido pelo Fotos com aproximadamente 120 MB é recusado no
composer de comentário com a mensagem de limite de 200 MB quando escolhido por **Galeria**. O mesmo
conteúdo, salvo no app Arquivos e escolhido por **Choose File**, não é recusado. O erro ocorre antes
de o MediaBunny poder reduzir o vídeo.

Os dois caminhos não entregam necessariamente os mesmos bytes ao JavaScript. No WebKit do iOS,
**Photo Library** usa `PHPickerViewController`, enquanto **Choose File** usa
`UIDocumentPickerViewController`. A preferência padrão do primeiro é fornecer uma representação
compatível do asset. Um original HEVC/H.265 pode, portanto, ser materializado pelo sistema como uma
rendição H.264/MOV maior antes de gerar o `File` observado pela página. `File.size` descreve essa
rendição entregue pelo Safari, não o tamanho que o Fotos mostra para o original.

A validação atual aplica o teto final de upload ao `File` selecionado antes da preparação. Isso
confunde duas fronteiras diferentes: o maior arquivo transitório que o dispositivo pode preparar e
o maior arquivo final que o produto/backend aceita. Além de causar a recusa incorreta, o worker atual
usa `BufferTarget` e devolve a saída como `ArrayBuffer`, o que concentra a saída completa em RAM e
reduz a margem de segurança justamente nos dispositivos móveis afetados.

## Objetivo

Adotar limites em duas etapas para todos os vídeos públicos preparados no frontend: permitir uma
entrada transitória maior e limitada, preparar o vídeo em armazenamento temporário OPFS com
`StreamTarget` quando disponível e aplicar o limite público existente ao arquivo final. Preservar
fallback seguro, cancelamento, progresso, validação do backend e mensagens honestas quando o
dispositivo não puder produzir um arquivo aceito.

## Escopo global de vídeo

A correção deve ficar na fronteira compartilhada de preparação e ser consumida por todos os fluxos
abaixo, inclusive em criação e edição quando reutilizam o mesmo caller:

| Superfície | Finalidade | Limite final |
| --- | --- | --- |
| Vídeo de publicação | `community-post-video` / `community-post` | contrato atual de mídia da comunidade, 200 MiB |
| Vídeo de comentário/resposta | `post-reply-video` / `community-reply` | contrato atual de mídia da comunidade, 200 MiB |
| Vídeo de apresentação profissional | `profile-presentation-video` / `profile-presentation` | contrato atual do vídeo de apresentação, 300 MiB |

Imagens, thumbnails geradas, documentos e Admin não entram nesta alteração. A allowlist existente de
MP4/MOV/WebM e a validação de assinatura/MIME do backend permanecem obrigatórias.

## Política de limites em duas etapas

1. **Limite de entrada para preparação:** protege CPU, armazenamento, tempo e quota do dispositivo,
   mas não representa o limite público do upload. A política inicial deve ser vinculada à finalidade
   e calcular `max(limite final, min(2 × limite final, 500 MiB))`: 400 MiB para post/comentário e
   500 MiB para apresentação.
2. **Limite final de upload:** continua sendo o contrato atual de cada endpoint, 200 MiB para mídia
   de comunidade e 300 MiB para apresentação. Ele é aplicado somente ao `File` escolhido para o
   transporte, depois de bypass, otimização ou fallback.
3. MIME/extension são validados antes de gastar recursos. Um vídeo acima do limite transitório é
   recusado cedo com mensagem específica de entrada excessiva.
4. Um arquivo recebido acima do limite final pode seguir para análise/otimização se estiver dentro
   do limite transitório. Ele só inicia transporte se o resultado ficar dentro do teto final.
5. Fallback para o original continua permitido apenas quando o próprio original entregue ao site
   cabe no limite final. Nunca tentar enviar um fallback sabidamente maior nem depender do `413` do
   backend como controle de fluxo.
6. O backend continua repetindo todos os limites e validações. O teto transitório é uma política de
   capacidade do cliente e não amplia o contrato público.

Os limites são comparados em bytes/MiB de forma centralizada e com semântica inclusiva: exatamente o
teto é aceito e o primeiro byte acima é recusado. A decisão usa tamanho e capacidades reais; não há
branch de comportamento por user agent.

## Saída em OPFS com MediaBunny

1. Manter a entrada lazy por `BlobSource` e a conversão no Web Worker dedicado.
2. Quando OPFS estiver disponível, criar um arquivo temporário de nome aleatório e não sensível via
   `navigator.storage.getDirectory()`. Preferir `createSyncAccessHandle()` dentro do worker e usar
   `FileSystemFileHandle.createWritable()` como alternativa assíncrona.
3. Adaptar a escrita posicional de qualquer um desses handles a um `WritableStream` consumido pelo
   `StreamTarget` do MediaBunny. Aplicar backpressure e recusar qualquer write que ultrapasse o teto
   de saída, evitando montar o MP4 final inteiro em `ArrayBuffer`.
4. Depois de `finalize`, obter um `File` disk-backed, normalizar nome e MIME públicos para MP4 e
   devolver ao orquestrador sem serializar os bytes completos na mensagem do worker.
5. Manter a entrada OPFS até o transporte terminar. A orquestração deve remover o artefato em todos
   os estados terminais: sucesso, falha, cancelamento, saída inválida e desmontagem.
6. Cancelamento deve interromper conversão e stream, fechar/abortar o writable e remover o arquivo
   parcial em best effort. Uma falha de cleanup não pode substituir a resposta principal nem expor
   nome/caminho interno ao usuário.
7. Falta de quota ou falha de storage segue o mesmo contrato de fallback seguro e nunca causa retry
   infinito. Temporários com mais de 24 horas são removidos em best effort na próxima preparação.

## Fallback e compatibilidade

- Se OPFS/`StreamTarget` não estiver disponível ou falhar antes de produzir saída, `BufferTarget`
  pode ser usado somente quando a entrada tiver até 64 MiB e a saída estimada até 16 MiB. Não
  carregar entradas grandes em `ArrayBuffer` para simular streaming.
- Se nenhuma conversão segura puder rodar e o original couber no limite final, manter o fallback
  original da TASK-159.
- Se o original entregue pelo Safari já exceder o limite final e a preparação não puder terminar,
  encerrar antes do transporte com copy controlada: explicar que o iPhone pode ter preparado uma
  cópia maior e orientar **Choose File** ou um vídeo menor. Não afirmar que o original do Fotos tem
  mais de 200/300 MB.
- Bypass de vídeo eficiente continua possível, mas a validação final ocorre depois da decisão. Um
  bypass acima do contrato final é inválido.
- Frontend antigo e backend atual continuam compatíveis. Não há endpoint, schema, migration, pacote
  ou env novos.
- Rollback volta ao output em memória e à validação anterior sem alterar objetos já persistidos; a
  mensagem específica de Safari pode ser mantida como melhoria de diagnóstico.

## Observabilidade segura

- Esta correção não adiciona telemetria client-side. Se o pipeline for instrumentado depois,
  registrar somente finalidade, classe de tamanho, estratégia de output
  (`opfs`, `memory`, `original`) e resultado (`optimized`, `bypassed`, `fallback`, `rejected`).
- Não registrar nome do arquivo, caminho OPFS, conteúdo, metadata descritiva, URL assinada ou erro
  cru do Photos/WebKit/MediaBunny.
- A causa não deve ser inferida apenas pelo user agent. A confirmação técnica usa os tamanhos
  efetivamente observados antes e depois da preparação.

## Fora do escopo

- Alterar os limites públicos de 200/300 MiB ou enfraquecer validações backend.
- Cloudflare Stream, HLS, DASH, TUS ou transcodificação no processo Express.
- Modificar vídeos existentes, executar backfill ou limpar o R2.
- Persistir OPFS entre sessões ou usar OPFS como biblioteca de mídia do usuário.
- Suportar formatos fora da allowlist pública da TASK-159.
- Corrigir comportamento interno do Safari/WebKit ou tentar controlar
  `PHPickerConfigurationAssetRepresentationMode` por HTML.

## Critérios de aceite

- [x] Posts, comentários/respostas e apresentação usam a mesma política de duas etapas por
  finalidade; nenhum deles aplica o teto final antes de dar ao vídeo elegível a chance de preparo.
- [x] Entradas de comunidade até 400 MiB e de apresentação até 500 MiB podem chegar ao preparador;
  o primeiro byte acima do teto transitório é recusado.
- [x] O transporte continua limitado a 200 MiB em comunidade e 300 MiB em apresentação, inclusive
  em bypass e fallback.
- [x] MediaBunny escreve a saída grande em OPFS via `StreamTarget`, sem retornar um `ArrayBuffer`
  completo no caminho principal.
- [x] Arquivos temporários OPFS são removidos após sucesso, falha e cancelamento; writable parcial é
  abortado quando possível.
- [x] Falta de OPFS/quota/codec usa memória somente com entrada até 64 MiB e saída estimada até
  16 MiB, e usa original somente se ele couber no contrato final.
- [x] Quando a rendição do Photos excede o limite final e não pode ser otimizada, a mensagem explica
  a cópia preparada pelo iPhone e orienta **Choose File**, sem erro técnico.
- [x] Imagens, thumbnails, documentos, contratos HTTP, backend, banco, R2 e envs permanecem
  inalterados.
- [ ] Testes automatizados cobrem fronteiras inclusivas dos dois limites, as três finalidades,
  bypass/fallback, ausência de OPFS, quota insuficiente, cancelamento e cleanup.
- [ ] Browser local valida OPFS/`StreamTarget`, output MP4 menor, progresso e cancelamento em mobile
  e desktop sem regressão de UI.
- [ ] Um iPhone real com Safari reproduz o mesmo vídeo via **Galeria** e **Choose File** em post,
  comentário e apresentação; tamanhos antes/depois e resultado final são registrados sem PII.
- [x] `pnpm --dir frontend audit --prod`, check, build e `pnpm check` passam sem warnings.
- [x] ADR-0467 permanece alinhado à implementação disponível; o resultado do dispositivo real será
  anexado antes de concluir a task.
- [ ] Versão, commit, push, deploy e smoke só são executados no fechamento da implementação.

## Validação pendente

- Testar no mesmo iPhone/Safari o mesmo asset por **Galeria** e **Choose File**, registrando
  `File.size`, `File.type`, codec detectado e tamanho preparado.
- Repetir a jornada em comentário/resposta, post e vídeo de apresentação.
- Confirmar que uma entrada superior a 200 MiB produz MP4 até 80 MiB pelo policy atual e atravessa o
  multipart sem `413`.
- Medir pico de memória, quota OPFS e tempo de preparação; o teste não pode depender apenas de
  simulador.
- Validar cancelamento durante análise, encoding e upload, seguido de ausência do temporário OPFS.
- Validar Safari iOS, Safari macOS e Chromium com OPFS; validar também um runtime sem OPFS.
- Reexecutar checks/build/audit depois do versionamento final antes do commit.

## Evidências parciais de execução (2026-08-21)

- Auditoria estática confirmou que criação/edição de post convergem em
  `useUploadCommunityPostMedia`, criação/edição de comentário convergem em
  `useUploadPostReplyMedia` e apresentação passa por `useProfileVideoUpload`. Os três caminhos
  executam `source -> prepareUpload -> final -> transporte -> cleanup`; não restou guard cru de
  200 MiB antes da preparação de vídeo.
- Os testes do frontend aprovam 82 casos. Os novos casos cobrem os limites inclusivos de
  200/300/400/500 MiB, preservação do limite de imagem, classificação exata de erro remoto,
  protocolo do worker, fallback de memória 64/16 MiB, fallback OPFS síncrono para assíncrono,
  escrita posicional com short writes, hard cap antes de gravar o byte excedente e watchdog com
  cleanup do temporário após inatividade.
- Criação e edição de post e comentário exibem os estados acessíveis **Analisando vídeo**,
  **Otimizando vídeo** e **Enviando vídeo**. A mesma operação cancelável cobre preparação,
  multipart e upload da thumbnail; desmontagem aborta sem produzir toast falso de falha.
- `pnpm --dir frontend audit --prod`, `pnpm --dir frontend check`,
  `pnpm --dir frontend build`, `pnpm check` e `git diff --check` passaram. O build emitiu o worker
  dedicado com `StreamTarget`, OPFS e `fastStart: false`, sem source map de produção.
- O build de produção respondeu `200` em `/version`, `/auth/register/psychologist`, `/community` e
  `/app/community` em `localhost:3000`; as duas rotas de comunidade completaram seus redirects
  públicos esperados.
- Um harness público efêmero, sem login, foi servido em `localhost:3000` com receiver local em
  `3100`; ambos responderam por HTTP e o receiver confirmou leitura integral de um MP4 real. A
  conexão de automação não expôs nenhum browser disponível, portanto o harness foi removido sem
  atribuir evidência falsa a WebCodecs/OPFS. O smoke interativo e o iPhone real continuam pendentes.

## Referências oficiais

- WebKit, seleção distinta de Photo Library e Choose File:
  `https://github.com/WebKit/WebKit/blob/32377c7c9a09a52407a72c927fcf6e909207018e/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L736-L753`
- WebKit, preferência de representação compatível:
  `https://github.com/WebKit/WebKit/blob/32377c7c9a09a52407a72c927fcf6e909207018e/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L682-L698`
- Apple, representações `current` e `compatible`:
  `https://developer.apple.com/documentation/photosui/phpickerconfiguration/assetrepresentationmode`
- Apple, transcodificação automática do Photos Picker:
  `https://developer.apple.com/videos/play/wwdc2023/10107/`
- Apple, eficiência HEVC e conversão compatível H.264:
  `https://support.apple.com/pt-br/116944`
- MediaBunny, escrita de arquivos:
  `https://mediabunny.dev/guide/writing-media-files`
- MDN, OPFS:
  `https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system`
