# TASK-182 — Upload móvel retomável e diagnóstico seguro

| Campo | Valor |
|---|---|
| Status | In Progress |

Dependências: TASK-179, TASK-180 e TASK-181. Incidente Safari informado em 14/09/2026.

## Escopo e evidência

Resposta com vídeo de 62.270.424 bytes recebeu contrato `basic` duas vezes, mas falhou
no cliente. Provisionamento bem-sucedido não comprova transferência nem processamento.
O erro histórico não contém status/etapa suficientes para determinar a causa exata.

- Priorizar TUS em partes de 5 MiB também para vídeos pequenos; retentativas limitadas.
- Conservar bytes originais, limites backend, autorização, assinatura e Stream exclusivo.
- Registrar eventos do transporte direto por endpoint autenticado, somente do dono do
  ativo, com vocabulário fechado, números limitados e rate limit. Nunca registrar texto
  livre, nome de arquivo, URL, token, PII ou resposta bruta do provider.
- Diagnóstico é relato do cliente, não prova de conclusão nem permissão de associação.
- Falha de diagnóstico não deve quebrar o upload, exibir toast ou desconectar o usuário.
- Manter cancelamento autenticado sem TUS DELETE e retenção de vídeo pronto.

## Deploy

Backend e frontend. Sem schema, migration, env obrigatória ou pacote novo. Endpoint
aditivo e diagnóstico best-effort: frontend novo funciona com backend antigo (TUS já
suportado), e backend novo aceita clientes antigos. Rollback não modifica dados.
Nada é migrado/excluído no R2; servidor de vídeo/fila e qualidade não são alterados.
Sem mudança de layout; preservar composer mobile existente. Builder indisponível neste
cliente, captura do incidente usada apenas como evidência de estado, não arquitetura.

## Aceite

- [x] TUS prioritário e retentativas limitadas sem reenvio básico/R2.
- [x] Status/etapa de falha preservados somente em diagnóstico fechado e seguro.
- [x] Endpoint exige autenticação/propriedade, valida payload e limita chamadas.
- [x] Diagnóstico não altera estado do ativo nem o resultado do fluxo principal.
- [x] Checks, builds e testes HTTP reais com banco local isolado, sem mocks.
- [ ] Upload real pelo navegador e smoke do deploy em homologação registrados.
- [x] Limitação de Safari/iPhone real explicitada sem alegar reprodução inexistente.
- [ ] ADR, versão, commit e push em homolog.

## Diagnóstico após deploy

O provisionamento e os eventos de cliente compartilham `uploadRef`. Procurar no terminal
por `VIDEO_STREAM_UPLOAD_PROVISION` e `VIDEO_STREAM_UPLOAD_CLIENT_EVENT`. Este último
informa `event`, `phase`, `method`, `httpStatus`, progresso, retentativas, tempo e se a
página ficou oculta. Status 0 significa ausência de resposta HTTP acessível, **não**
comprova falha de internet: CORS, suspensão e transporte podem produzir o mesmo sinal.
Sem eventos após o início, investigar fechamento/suspensão/perda de rede; não presumir
sucesso nem falha do provider. Endpoint antigo/indisponível é ignorado pelo frontend.
Eventos não publicam conteúdo nem tornam um ativo pronto. A conclusão válida continua
sendo consultada no backend e confirmada no fluxo de associação do produto.

## Validação da implementação 0.1.385

- `pnpm check`: aprovado, incluindo Prisma, TypeScript, Biome e checks das quatro apps.
  Seis testes de integração opcionais do serviço de vídeo permanecem skipped no baseline;
  não são evidência nova do servidor privado, cujo código não mudou nesta task.
- Builds frontend/backend aprovados. Imagem Docker real linux/amd64 0.1.385 construída.
- Probe HTTP: 20/20 checks com router/autenticação/JWT/cookie/validator/repository reais e
  PostgreSQL local descartável. Cobre owner, sessão revogada/inativa, foreign/deleted404,
  payload fechado422, rate429 e nenhuma alteração de estado/associação. Sem provider
  simulado: o provider está ausente e o endpoint não depende dele.
- A primeira execução do probe encontrou campo incorreto na preparação do registro
  excluído (`deleted_at`); corrigido para o atributo Prisma `deletedAt` e reexecutado.
- Browser local 390x844: estado de indisponibilidade de sessão apresentado corretamente.
  O backend local configurado no tunnel não respondeu; isso não valida upload local.
- Sessão real da conta profissional da auditoria recuperada em homolog. Está no plano
  gratuito: solicitada autorização para cortesia temporária, sem cobrança, antes de
  testar resposta com vídeo. Não alterar entitlement para contornar essa restrição.
- Safari/iPhone real não disponível ao agente; o relato identifica Safari, mas não
  informa tempo até falha nem se houve suspensão. Causa histórica permanece não provada.
- Evidências externas: diretório `task182-upload-movel` na área de artefatos do Codex.
