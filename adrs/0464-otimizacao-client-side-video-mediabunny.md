# ADR-0464: Otimização client-side do vídeo de apresentação com MediaBunny

## Status

Superseded by ADR-0479

## Task relacionada

TASK-158

## Contexto

A TASK-157 resolveu o transporte de vídeos grandes, mas um arquivo real de aproximadamente 30
segundos ocupou 222 MB e exigiu 43 requests de parte. Para um vídeo curto, enviar e entregar sempre
o original mantém custo de banda, latência móvel e risco de interrupção desnecessários.

Cloudflare Stream continua uma opção futura para ingestão, transcodificação centralizada e entrega
adaptativa, mas não é pré-requisito para diminuir o arquivo antes do upload. A etapa de preparação e
o destino do upload são responsabilidades independentes.

Compressão exclusiva no cliente não é uma barreira confiável de segurança nem pode ser obrigatória:
WebCodecs e os codecs disponíveis dependem do navegador/dispositivo, e o processamento pode falhar
por memória, energia ou capacidade. O backend deve continuar validando todo upload e o arquivo
original precisa permanecer como fallback operacional.

## Decisão

- Adotar `mediabunny` no frontend para análise e conversão best effort antes do uploader existente.
- Adotar `@mediabunny/aac-encoder` como fallback carregado no worker somente quando AAC nativo não
  estiver disponível; não incluí-lo no caminho inicial da página.
- Isolar a biblioteca em um módulo de preparação com contrato `File -> resultado de preparação`.
  Componentes, TanStack Query e API não importam MediaBunny diretamente.
- Executar análise/conversão em Web Worker de módulo para preservar responsividade da tela.
- Usar `BlobSource` para ler o arquivo escolhido de forma lazy. Não converter o original para um
  `ArrayBuffer` completo.
- Produzir MP4 AVC/H.264 com áudio AAC quando houver, maior dimensão até 1920, no máximo 30 FPS e
  qualidade/bitrate voltado a saída previsível abaixo de 100 MB.
- Não copiar tags descritivas do arquivo de origem para o MP4; manter apenas metadata estrutural
  indispensável à reprodução, incluindo orientação quando necessária.
- Usar buffer apenas para a saída já comprimida e monitorar seu tamanho. Se o teto for ultrapassado,
  cancelar a conversão e seguir com o original.
- Pular recompressão quando metadata indicar arquivo já web compatível, dentro dos limites de
  dimensão, FPS, bitrate/tamanho e duração do produto.
- Consultar suporte efetivo com as APIs `canDecode*`/`canEncode*`; não usar user agent como decisão.
- Em incompatibilidade ou falha local, liberar recursos e enviar o original sem expor mensagem
  técnica. Cancelamento explícito é diferente de fallback: ele encerra todo o fluxo.
- Manter MediaBunny no chunk dedicado do worker e carregar o chunk adicional do encoder AAC somente
  após falhar a detecção de encoder nativo.
- Propagar `AbortSignal` ao upload simples e às partes multipart. O abort do multipart usa request
  independente em best effort para não ser cancelado pelo mesmo signal.
- Manter o endpoint e o multipart atuais como única camada de transporte. Não criar uploader
  paralelo, endpoint ou contrato específico para MediaBunny.
- Não gerar HLS/rendições no dispositivo. Se Cloudflare Stream for adotado, decidir em task futura
  se a preparação local será removida ou usada somente para originais excessivamente grandes.

## Consequências

- Novos vídeos grandes podem consumir uma fração da banda e muito menos partes no R2/API.
- O usuário aguarda uma etapa local antes do envio; progresso, cancelamento e copy clara são
  obrigatórios.
- Dispositivos sem capacidade continuam funcionais pelo caminho atual, mas seus arquivos podem
  permanecer grandes.
- Existe reencodificação com perda; parâmetros conservadores e smoke com conteúdo real devem
  preservar qualidade perceptível adequada para vídeo de apresentação.
- O pacote principal usa MPL-2.0 e permite uso comercial. A Lectum consome a dependência sem
  modificar seus arquivos; qualquer alteração futura no código MPL deve ser reavaliada.
- A implementação não elimina a necessidade futura de Stream caso o produto exija bitrate
  adaptativo, analytics de entrega, URLs assinadas ou padronização garantida no servidor.

## Produção e rollout

- **Dados/banco:** sem schema, migration, backfill ou alteração dos vídeos existentes.
- **Envs:** nenhuma nova variável; não há ALERTA DE DEPLOY.
- **Aplicações:** somente frontend recebe dependências/código. Backend e admin permanecem separados.
- **Compatibilidade:** API e DTOs permanecem iguais; versões antigas e novas do frontend enviam um
  `File` aceito pelo backend atual.
- **Ordem:** deploy normal do frontend em `homolog`; não depende de ação manual na Cloudflare.
- **Smoke:** validar bypass, otimização, cancelamento, fallback e reprodução do objeto final.
- **Rollback:** voltar o frontend para enviar o original. Objetos MP4 já gravados continuam válidos.

## Validação

- Audit de dependências de produção do frontend: zero vulnerabilidades conhecidas.
- Check do frontend: Biome, ESLint, TypeScript e 34 testes passaram sem warnings.
- Build Next/Webpack passou e isolou MediaBunny no worker; o encoder AAC ficou em chunk dinâmico.
- Check integral da raiz passou também para backend e admin.
- Servidor de produção local respondeu `200` para o worker e para os chunks MediaBunny/AAC sob a
  CSP vigente.
- Validação visual e transcodificação real no navegador permanecem pendentes porque nenhum browser
  estava conectado ao cliente de execução; a task não deve ser concluída antes desse smoke.

## Pendências

- Avaliar Cloudflare Stream/TUS somente em task futura, com ambientes e credenciais separados.
- Medir em dispositivos reais iOS/Android o tempo, a redução e a qualidade antes de promover para
  produção.
