# TASK-158: Otimização client-side do vídeo de apresentação

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-158 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Operação e mídia profissional |
| Status | Completed |
| Dependências | TASK-18A, TASK-146, TASK-157 |
| ADR alvo | ADR-0464 |

## Contexto

A TASK-157 tornou confiável o envio ao R2 de vídeos de apresentação de até 300 MB por partes de
5 MiB. O primeiro smoke completo em homologação enviou e persistiu um arquivo MOV de 222.553.640
bytes e aproximadamente 30 segundos em 43 partes. Embora o transporte agora funcione, esse volume é
desproporcional para um vídeo curto de apresentação: aumenta espera, consumo de banda, operações de
storage e a superfície para interrupções móveis.

O produto ainda não precisa adotar Cloudflare Stream para reduzir esse custo. A otimização pode ser
uma etapa client-side anterior ao transporte existente: o frontend produz um MP4 web compatível e o
envia pelas mesmas APIs simples/multipart já publicadas. Essa camada deve ser isolada para que uma
adoção futura de Stream/TUS possa trocar somente o destino do upload, sem reescrever seleção, estados
ou validação do vídeo.

Mediabunny oferece leitura lazy de `File`, inspeção de tracks, conversão, resize, rotação, limitação
de FPS, controle de qualidade e H.264/AAC usando WebCodecs. A disponibilidade de codecs varia por
navegador; portanto, otimização é best effort e nunca pode impedir o upload original quando o
ambiente não conseguir converter com segurança.

## Objetivo

Antes de enviar um vídeo de apresentação, otimizar no navegador arquivos grandes/ineficientes para
MP4 H.264/AAC, no máximo 1080p e 30 FPS, mostrando progresso separado de otimização e envio. Reduzir
substancialmente arquivos como o MOV de 222 MB sem mudar backend, banco, R2 ou contratos publicados,
com fallback automático e seguro para o arquivo original.

## Pré-requisitos e bloqueios

- TASK-157 concluída e endpoints multipart publicados.
- Referência visual: `_product/proto/Editar Perfil - Psicólogo.jpg` via
  `_product/tasks/PROTO-INVENTORY.md`.
- Builder Quick Copy ativo, mas não exposto como ferramenta neste cliente; usar o JPEG exportado e
  registrar a limitação.
- Validar `mediabunny` e, somente se necessário para compatibilidade AAC, o complemento
  `@mediabunny/aac-encoder` em `_product/tasks/PACKAGES.md` e ADR-0464 antes da instalação.
- Nenhuma credencial Cloudflare Stream é necessária nesta task.

## Escopo frontend

1. Criar módulo isolado de preparação de vídeo, sem acoplar MediaBunny ao componente visual ou ao
   cliente HTTP.
2. Ler `File` por `BlobSource`, sem carregar os 300 MB integralmente em `ArrayBuffer`.
3. Inspecionar duração, dimensões, rotação, codecs e FPS antes de decidir converter.
4. Não recomprimir arquivo já eficiente e web compatível.
5. Para arquivo que precisa de otimização:
   - saída MP4;
   - vídeo AVC/H.264;
   - áudio AAC quando houver;
   - maior dimensão limitada a 1920, preservando proporção/orientação;
   - FPS limitado a 30;
   - bitrate/qualidade com teto previsível para manter saída curta abaixo de 100 MB.
   - remoção de tags descritivas do arquivo original para não replicar nome, autor ou metadata
     desnecessária no objeto publicado.
6. Executar conversão fora da thread principal em Web Worker dedicado.
7. Verificar encodabilidade/decodabilidade real no runtime; não inferir suporte apenas pelo user
   agent.
8. Carregar o encoder AAC complementar somente dentro do worker e apenas quando o navegador não
   fornecer encoder nativo.
9. Expor progresso e cancelamento da otimização; abortar também requests de upload já iniciadas e
   encerrar a sessão multipart em best effort.
10. Impedir dois uploads concorrentes do mesmo campo.
11. Exibir estados mobile-first `Analisando`, `Otimizando` e `Enviando`, percentual acessível,
    tamanho reduzido quando aplicável e ação `Cancelar`.
12. Se a conversão for incompatível ou falhar por capacidade local, enviar o arquivo original sem
    toast técnico. Cancelamento explícito não deve iniciar fallback nem mostrar erro.
13. Reutilizar `useProfileVideoUpload`, `uploadPsychologistFreeProfileVideo`, TanStack Mutation,
    `multipart-upload.ts` e o card atual; não criar API client, store ou uploader paralelo.

## Escopo backend

- Sem alteração. O backend continua validando MIME, assinatura, limites, autorização, entitlement e
  persistência; nunca confia na otimização client-side como barreira de segurança.

## Fora do escopo

- Cloudflare Stream, TUS, HLS, DASH ou múltiplas rendições.
- Transcodificação no processo Express ou novo worker de servidor.
- Alterar vídeos já armazenados ou executar backfill/limpeza no R2.
- Alterar limite de 300 MB, endpoints, schema Prisma ou envs.
- Corrigir por compressão o `400` sem correlação observado no smoke da TASK-157; observabilidade de
  requests permanece assunto separado.

## Impacto em produção e plano de rollout

- **Dados existentes:** permanecem intactos; somente novos uploads podem chegar menores e em MP4.
- **Banco:** sem schema, migration, backfill ou reset.
- **Envs:** nenhuma nova variável.
- **Packages:** novos apenas no `frontend/`; backend e admin continuam independentes.
- **Contratos:** nenhuma mudança de API. Frontend novo funciona com backend atual; backend novo não é
  necessário. Um frontend antigo continua enviando o original normalmente.
- **Provider/jobs:** nenhum provider novo e nenhum job. MediaBunny roda no dispositivo do usuário.
- **Ordem:** publicar somente frontend. Não existe ALERTA DE DEPLOY de configuração.
- **Rollback:** remover a etapa de preparação e voltar a enviar o `File` original; nenhum dado ou
  objeto já persistido precisa ser revertido.
- **Smoke em homologação:** abrir `/app/profissional/perfil/configurar`, selecionar MOV grande,
  observar otimização e envio, cancelar uma tentativa, repetir até sucesso e validar a reprodução do
  MP4 persistido. Repetir com arquivo pequeno/compatível para confirmar bypass.

## Contrato técnico detalhado

### Arquitetura obrigatória

- `ARCHITECTURE.md` › Frontend, limites arquiteturais, regras de UI, estado e anti-recriação.
- `PACKAGES.md` › política de dependências e frontend instalado.
- Entrada de UI existente:
  `frontend/src/app/app/professional/profile/setup/views/professional-profile-setup.tsx`.
- Orquestração existente:
  `frontend/src/app/app/professional/profile/setup/hooks/use-profile-video-upload.ts`.
- Transporte existente:
  `frontend/src/api/req/psychologist-free-profile/index.ts` e
  `frontend/src/utils/multipart-upload.ts`.

### Packages usados

- `mediabunny`: parsing/conversão e abstrações sobre WebCodecs.
- `@mediabunny/aac-encoder`: fallback AAC carregado dinamicamente somente quando necessário.
- React/TanStack Query/Axios existentes para estado e transporte.
- Não adotar `ffmpeg.wasm`, biblioteca de upload paralela ou Cloudflare SDK nesta task.

### Regras anti-recriação

- O módulo novo recebe e devolve `File`; não conhece React Query, Axios, R2 ou perfil profissional.
- O bundle pesado de conversão permanece no chunk do worker; o fallback AAC é um segundo chunk
  dinâmico e não entra no carregamento inicial da tela.
- O hook existente continua dono da seleção, fases, cancelamento e início da mutation.
- O uploader multipart existente continua dono de retry, partes, complete e abort.
- Mensagens públicas são controladas em PT-BR; erros MediaBunny/WebCodecs não chegam a toast/log.

## Critérios de aceite

- [x] Arquivo grande compatível é preparado em Web Worker antes do upload, sem bloquear a UI.
- [x] Saída otimizada é MP4 com AVC/H.264 e áudio AAC quando houver, até 1080p e 30 FPS.
- [x] Arquivo já eficiente não sofre recompressão desnecessária.
- [x] Entrada grande é lida por `BlobSource`; saída possui teto defensivo e não mantém o original
  inteiro em um segundo `ArrayBuffer`.
- [x] Navegador sem decoder/encoder necessário usa fallback automático para o original.
- [x] Falha local de otimização usa fallback original sem expor erro técnico.
- [x] Cancelamento interrompe worker/request, não inicia fallback e aborta multipart em best effort.
- [x] Dois uploads concorrentes pelo mesmo campo são impedidos.
- [x] UI diferencia análise, otimização e envio, com percentual acessível e sem layout quebrado em
  mobile (~390 px), desktop e temas claro/escuro.
- [x] Backend, banco, R2, endpoints e envs permanecem inalterados.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Dados e contratos publicados continuam compatíveis durante rollout independente.
- [x] Referência local `_product/proto/Editar Perfil - Psicólogo.jpg` foi usada; Builder indisponível
  foi registrado.
- [x] Dependências foram auditadas e documentadas em `PACKAGES.md` e ADR-0464.
- [x] Testes cobrem política de bypass/conversão, mensagens do worker, cancelamento e fallback.
- [x] `pnpm --dir frontend check`, audit de produção, build e `pnpm check` passam sem warnings.
- [x] Browser local valida a jornada real sem substituir evidência por mock.
- [x] ADR-0464 criado e indexado.
- [x] Versão dos quatro manifests incrementada uma vez e sincronizada.
- [x] Commit e push ocorrem em `homolog`, com deploy e smoke reportados.

## Validação mínima

- `pnpm --dir frontend audit --prod`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em viewport mobile e desktop.

## Referências

- `https://mediabunny.dev/guide/converting-media-files`
- `https://mediabunny.dev/guide/supported-formats-and-codecs`
- `https://mediabunny.dev/guide/reading-media-files`
- `https://mediabunny.dev/guide/writing-media-files`
- `https://mediabunny.dev/guide/extensions/aac-encoder`

## Evidências parciais de execução (2026-08-20)

- `pnpm --dir frontend audit --prod`: zero vulnerabilidades conhecidas.
- `pnpm --dir frontend check`: passou sem warning; 34 testes aprovados.
- `pnpm --dir frontend build`: passou; MediaBunny foi emitido em chunk dedicado do worker e o
  encoder AAC em chunk dinâmico separado.
- `pnpm check`: passou nos escopos raiz, frontend, backend e admin.
- Servidor de produção local entregou com `200` o worker e seus chunks MediaBunny/AAC sob a CSP
  atual (`worker-src 'self' blob:`).
- Na execução inicial de 2026-08-20, a validação visual/interativa ficou pendente porque nenhum
  navegador estava conectado ao cliente de execução. O fechamento complementar abaixo registra a
  evidência real que resolveu essa pendência, sem substituir o browser por simulação.

## Fechamento complementar (2026-08-21)

- O commit `7751bbc1` publicou a preparação MediaBunny em `homolog`; a TASK-159 generalizou o mesmo
  adapter para todos os vídeos públicos e validou os módulos reais em harness local efêmero, com
  MOV convertido para MP4, progresso, cancelamento, upload multipart e reprodução em viewports
  mobile e desktop.
- A TASK-160 separa o limite transitório do limite final e substitui a saída grande em memória por
  OPFS/`StreamTarget`. Essa correção pós-smoke não reabre o escopo entregue nesta task; a validação
  específica do seletor Fotos no iPhone permanece registrada na TASK-160.
