# ADR-0680 - Legendas experimentais por video

Status: implementacao local parcial, nao aprovada para publicacao.

## Correcao de concorrencia descoberta na validacao (2026-11-06)

Player pode emitir eventos simultaneos para a mesma sessao de visualizacao.
O read/create anterior produzia P2002; read/update tambem podia perder maximos.
ProfileVideoWatchRepository agora serializa read/merge/write com advisory lock
transacional PostgreSQL, chave hash de namespace/profissional/sessao, e isolamento
ReadCommitted. Colisao de hash apenas serializa sessoes independentes; nao mistura
dados. Lock liberado no commit/rollback, sem dependencia de memoria do processo.
Sem migration ou mudanca de contrato. Teste de banco real com oito chamadas e
repeticao do perfil no navegador passaram; fixtures locais removidas.
Data: 2026-11-05.

## Decisao

Persistir os trechos com tempos, revisao otimista e data de revisao em uma
tabela aditiva ligada a video_asset. O usuario autorizou a migracao somente
no banco local isolado. Nenhuma migracao remota foi autorizada.

VIDEO_CAPTIONS_ASSET_IDS e uma allowlist explicita, vazia por padrao, sem
wildcard. Nao existe geracao global nem processamento em massa. O POST de
geracao nao e repetido automaticamente depois de resultado incerto.

Usar node-webvtt 1.9.4 para interpretar WebVTT, seguido de validacao Zod
de texto, quantidade, ordem, duracao e sobreposicao. Nao interpretar tags
como HTML. Chamadas Cloudflare ficam no backend, com timeout e limite de
1 MiB por resposta. Nenhum segredo e devolvido ao cliente.

Apenas o proprietario psicologo pode editar. Salvar incrementa a revisao e
marca como revisada automaticamente. O mesmo documento alimenta player e
HTML publico. Autorizacao anonima do video precede a transcricao publica;
dados profissionais sao incluidos apenas de perfil publicado e nao excluido.

O player reutiliza TextTrack/VTTCue para sincronizacao, sem loop de polling
por frame. CC controla uma camada visual. A faixa inferior do player e
medida para evitar sobreposicao com WhatsApp.

## Limites e pendencias

- Em 2026-11-05, usuario autorizou uma copia exclusiva de verification-v1.mp4,
  fez upload e geracao pt no painel e entregou pt.vtt. Parser e player local
  aceitaram os 7 trechos reais. API autenticada ainda nao testada.
- Precisao, custo efetivo e comportamento com audio ruim ainda nao medidos.
- O editor e o player precisam de validacao visual e funcional integrada.
- A exibicao publica atual usa details na pagina existente; integracao exata
  com menu e posicionamento abaixo do video ainda pendentes.
- Exportacao MP4 com tres opcoes implementada e testada via botao local;
  equivalencia sob carga e validacao externa continuam pendentes.
- Texto falado pode conter dados pessoais: revisar videos de teste antes de
  habilitar publicacao de transcricoes, mesmo que o autor do post seja anonimo.
- Licenca do PNG de CC para publicacao sem atribuicao ainda nao confirmada.

## Rollout

Complemento: o endpoint SEO do perfil inclui somente legendas autorizadas
do video de apresentacao. A pagina publica renderiza texto acessivel em
sr-only, sem nova aba visual; reels mantem CC e a transcricao canonica no
post/resposta. Nao se promete indexacao de texto oculto. Plano operacional
e gates pendentes em _product/tasks/VIDEO-CAPTIONS-ROLLOUT.md.

Nao publicar este lote como funcionalidade completa. Antes de qualquer
publicacao: concluir testes integrados, revisar privacidade, confirmar licenca,
aprovar um video de teste e testar exportacao equivalente. Aplicar migracao
aditiva antes de habilitar qualquer ID. Manter allowlist vazia permite rollback
funcional sem apagar dados ou alterar players sem legendas.

Referencias tecnicas: https://developers.cloudflare.com/api/resources/stream/subresources/captions/

## Complemento: exportacao e automacao isoladas

Reutilizar fila/worker e FFmpeg existentes. Metadados incluem modo e cues
validados do banco; ASS temporario e removido ao terminar, sem shell. Nao
aceitar legenda enviada pelo cliente nem retornar silenciosamente ao modo
de identificacao. Conferir revisao para evitar exportar texto obsoleto.
Manter os tres modos mutuamente exclusivos e preservar a arte superior.

Automacao depende de VIDEO_CAPTIONS_AUTO_ENABLED=true mais allowlist de ate
10 IDs; default off. Polling no backend, nunca durante navegacao. Estado do
banco permite retomada apos reinicio; POST tem lock unico e nao tem retry
automatico em falha ambigua. Polling para apos 24h para limitar chamadas;
operador deve investigar e sincronizar manualmente, sem regenerar cegamente.
Inicialmente este caminho nao havia sido testado contra a API real.

Variaveis opcionais de fonte VIDEO_SOCIAL_BOLD_FONT_PATH e
VIDEO_SOCIAL_REGULAR_FONT_PATH permitem Manrope no Windows local sem mudar
o fallback Linux. Redis e worker locais isolados, sem instalar servico no
sistema e sem reutilizar filas de producao. Evidencias/limites na task.

## Configuracao e evidencia real em 2026-11-06

Extrair getVideoStreamApiConfig da configuracao Stream existente para
operacoes REST de captions. Elas nao usam chave privada, customer code,
origens de playback ou segredo de webhook. getVideoStreamConfig preserva
todas essas exigencias para upload/playback; mesma habilitacao e timeout.
Allowlist e opt-in da automacao continuam obrigatorios e default off.

Uma copia remota foi criada com autorizacao explicita e recebeu um unico
POST de geracao pt. Sete cues validos, identicos ao original. Depois, teste
local de recuperacao usou scheduler, banco e adaptador reais para sincronizar
essa copia via GET e preservar revisao manual. Nenhum novo POST nesse teste.
Nao confundir essa evidencia com validacao de timer, novo evento automatico,
concorrencia ou rollout. Detalhes em VIDEO-CAPTIONS-ROLLOUT.md.

Reels: o player persistente mede o bloco de identidade em um escopo comum
para posicionar captions acima dele, com espaco lateral para controles no
mobile. O botao CC tem alvo explicito de 44px. Mascara do estado ativo usa
geometria inline de lucide, pois imagem PNG externa na mascara SVG nao
renderizava o simbolo no browser verificado; PNG do estado off preservado.
Validacao real em 390/1440px e 135 testes registrados no plano de rollout.
# Evidencia adicional de validacao local (2026-11-06)

Perfil sintetico temporario autorizado validou HTML inicial com transcricao
e controles CC em 390 e 1440 px, com API/banco/player reais. Dados de teste
removidos e runtime original restaurado. Erro de analytics de visualizacao
observado permanece pendente; nao declarar o fluxo inteiro pronto para producao.
Timer local de recuperacao passou em 64.4 s sem POST. Benchmark offline
indicou 14.5 s por exportacao isolada e 26.4 s por trabalho com dois paralelos;
isso nao substitui carga de fila nem medicao no servidor de producao.

