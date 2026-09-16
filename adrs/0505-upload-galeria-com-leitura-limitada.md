# ADR-0505: Upload da galeria com leitura limitada por parte

## Status
Accepted

## Task relacionada
TASK-184

## Contexto

O mesmo vídeo de 250.743.537 bytes concluiu no desktop e falhou na resposta em Chrome Android
(galeria), após cinco retries sem resposta HTTP acessível. O erro genérico de rede escondia a
etapa. O SDK instalado entrega File.slice diretamente ao XHR, mantendo dependência do arquivo
externo no corpo da requisição. Isso é compatível com uma classe de falhas relatada em
https://github.com/tus/tus-js-client/issues/255, mas não comprova a causa histórica deste aparelho.

## Decisão

- Usar fileReader documentado do tus-js-client 4.3.1 já instalado, não criar cliente TUS paralelo.
- File.slice → ArrayBuffer → Blob de memória por parte <=5 MiB; preservar exatamente os bytes.
- Cache de uma parte por intervalo, sem reter vídeo inteiro. Pico de memória pode incluir cópias
  do ArrayBuffer/Blob/XHR; é limitado por parte, não uma promessa de apenas 5 MiB de heap.
- close idempotente descarta cache e rejeita leitura pendente; resultado tardio de arrayBuffer
  não é enviado. Verificar cancelamento também antes de enviar a requisição.
- Não fazer retry de leitura definitivamente recusada. Retentativas de transporte continuam
  limitadas por sequência sem progresso conforme SDK; não são um orçamento global de upload.
- Eventos opcionais com enums fechados distinguem HEAD/PATCH/POST e leitura local. Nunca serializar
  DetailedError do SDK, causa, request, response ou mensagem do provider. Status zero permanece
  ausência de resposta acessível, não diagnóstico de internet.
- Na primeira entrega, não alterar seletores, preview, permissões, limites ou qualidade por uma hipótese não provada. O seguimento abaixo atualiza somente o ciclo de seleção e a recuperação.

## Produção e rollout

Sem banco/migration/env/package novo. Backend primeiro preferível; aceita eventos antigos.
Frontend com backend anterior usa diagnóstico legado após 422; falha do diagnóstico é best-effort.
Sem alteração de inicialização, bucket, filas ou processamento do vídeo dedicado.
Push somente homolog; rollback de código preserva mídia e dados. Nada em main.

## Validação

`pnpm check` passou nas quatro apps, incluindo regressões de leitura/contrato;
os seis testes condicionais de integração do serviço de vídeo continuam skipped.
Builds das quatro apps aprovados. O reader executado em Node e browser local
leu o arquivo original em 48 partes (maior 5.242.880 bytes, última 4.328.177), com
SHA-256 idêntico. Testes usam Blob e arquivo de disco real, incluindo alteração da
origem após cache, cancelamento pendente e retomada não alinhada; sem endpoint simulado.
Revisão independente somente leitura não identificou novo bug concreto após os ajustes.
Upload Stream pós-deploy e Chrome Android físico ainda precisam ser validados.

## Pendências

Validação no Android físico pela galeria necessária. Materialização elimina referência ao provider
no corpo do XHR, mas não recupera acesso a um arquivo que o próprio sistema já recusa ler, nem
corrige falha de HEAD/rede/CORS. Não alegar que a causa foi reproduzida com setFiles no desktop.

## Referências

- https://github.com/tus/tus-js-client/blob/main/docs/api.md#filereader
- https://www.w3.org/TR/FileAPI/
- https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/

## Seguimento de 15/09/2026 — recuperação da seleção

A instrumentação da 0.1.394 retornou leitura `unreadable` no Chrome Android, em ~865 ms,
sem retry. Isso localiza a falha no File, não identifica se veio de snapshot, permissão,
provider virtual ou outra condição. Nenhuma alteração de configuração Cloudflare é indicada
por essa evidência. Sucesso anterior de upload/reprodução desktop não encerrou o incidente.

O composer limpava input.value imediatamente e desmontava o input no preview. Passamos a
mantê-lo com FileList enquanto a seleção é útil; limpar somente no descarte/sucesso/nova
escolha. O editor compartilha a política. Não há evidência de que limpar o input revogue o
File retido: esta é mitigação conservadora, não causa raiz comprovada.

Após falha tipada de leitura, o usuário pode abrir explicitamente o mesmo input com
`accept="*/*"`: no Chromium consultado, isso não satisfaz o ramo Photo Picker exclusivo
de mídia. Não garante provider local/legível em toda versão do Android. A validação de
conteúdo, tamanho e autorização permanece intacta; accept nunca é controle de segurança.
A próxima abertura normal restaura accept de mídia. Rascunho preservado, envio do File
já recusado bloqueado; cancelar ou escolher tipo inválido não remove esse bloqueio.

O erro RHF é lido por render, sem useMemo baseado na identidade do objeto errors; seleção
inválida não pode ser escondida pelo erro anterior de upload. Editor possui scroll vertical
para não cortar recuperação. Componentes existentes e PT-BR, sem biblioteca nova.

Teste local real: cópia temporária alterada após seleção provoca falha de leitura, botão
aparece, TXT é recusado, original reselecionado é lido integralmente em 48 partes. Não
simula API nem prova correção física Android. Nenhuma alteração no arquivo do usuário.
Sem env, banco, alteração de provider, permissão, qualidade ou transporte TUS. Rollback
somente frontend; backend atual/anterior continua compatível.

Referências primárias da decisão:
- https://chromium.googlesource.com/chromium/src/+/HEAD/ui/android/java/src/org/chromium/ui/base/SelectFileDialog.java
- https://w3c.github.io/FileAPI/#errorsAndExceptions
- https://html.spec.whatwg.org/multipage/input.html#attr-input-accept
- https://issuetracker.google.com/issues/41452449

Validação do seguimento 0.1.395: `pnpm check` completo e build frontend passaram;
cinco regressões novas, browser real com recuperação e rejeição de tipo inválido.
Seis testes condicionais de integração vídeo skipped, sem afirmar validação externa.
Confirmação Android afetado continua necessária para encerrar o incidente.

## Revisão estrutural — preparar a origem antes do preview

Usuário autorizou reorganizar a aquisição, não forçar Android/OEM ao explorador. Fonte
confirmada: Redmi Note 10 5G/MIUI 14 via galeria falha; mesmo arquivo no Samsung e seleção
pelo explorador do Redmi funcionam. Não temos a versão do Chrome nem reprodução física.

Experimento real com cópia do vídeo original: todos os cinco leitores testados falham após
recusa de snapshot (arrayBuffer, FileReader, stream, fetch blob URL, Blob composto). Uma cópia
privada preparada antes permaneceu íntegra. Não adicionar cadeia de leitores/retries como
suposta cura de permissão ou snapshot já inválido.

Decisão: aquisição compartilhada começa na seleção, precede thumbnail e provisionamento.
Uma passagem sequencial por slices de até 1 MiB copia bytes para OPFS em worker; escrita sync access
permite Safari sem createWritable. Cada leitura só começa após a escrita anterior e o loop
cede uma task real para receber cancelamento. Não redimensiona, não reencoda, não altera container.
A memória de trabalho da aplicação é proporcional à parte, não ao arquivo completo;
isso não estabelece teto para caches do navegador/SO. Stream do Blob inteiro foi rejeitado
na revisão: o WebKit pode antecipar buffers, mesmo com backpressure no consumidor.
O transporte TUS permanece no SDK e usa a cópia, não reabre a galeria a cada PATCH.

A seleção é dona da cópia: submit usa a mesma fonte, retry mantém bytes, troca/cancelamento/
sucesso/unmount dispõem worker e arquivo. Lock por UUID protege contra janitor de outra aba.
Resíduos de crash com mais de 24h são removidos somente do namespace privado próprio e sem
lock ativo. Não tocar em outros dados da origem, IndexedDB/cookies/buckets ou banco remoto.

Por capacidade: ausência de OPFS/worker/sync access usa origem direta com leitura limitada
inicial/final validada, sem exigir navegador novo nem dizer que criou cópia independente.
Não aplicar fallback para uma origem recusada, nem mascarar falta de espaço. A validação
não promete que o arquivo direto seguirá legível para sempre. Leitura recusada imediatamente
continua exigindo diagnóstico no aparelho; web não recupera bytes negados pelo provider.

Riscos: uso temporário de disco equivalente ao tamanho do vídeo, latência adicional local,
evicção/política de armazenamento e suspensão do browser. UI mostra preparação e permite
cancelar. Encerrar aba não significa upload em background suportado. Nenhuma mudança em
CF/R2/API principal/serviço de vídeo, plano/assinatura, dados ou qualidade.

Referências primárias adicionais:
- https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/
- https://web.dev/articles/origin-private-file-system
- https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/base/files/file_posix.cc

Revisão independente: capability fallback apenas antes da escrita (SecurityError/NotSupportedError),
nunca em quota, falha na escrita ou fonte inacessível. Coleta após 24h é oportunista, não prazo
garantido de remoção após crash. Implementação consultada: https://github.com/WebKit/WebKit/blob/main/Source/WebCore/fileapi/Blob.cpp

Validação 0.1.396: 48 hashes da fonte preparada coincidem com o original de 250.743.537 bytes,
mesmo após a origem de teste tornar-se ilegível. Browser real confirmou cancelamento por mensagem,
reuso e descarte, integridade e falha inicial segura; composer real preserva rascunho e bloqueia
submit durante preparo. Não reproduz o provider Redmi, nem valida Safari físico. Sem mocks HTTP.
