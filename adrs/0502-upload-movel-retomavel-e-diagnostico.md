# ADR-0502 — Upload móvel retomável e diagnóstico seguro

## Status

Aceito em 14/09/2026 para TASK-182; incidente encerrado após validação em homolog e
confirmação do usuário, respeitadas as limitações de evidência abaixo.

## Contexto

O tamanho abaixo de 200 MB não garante conexão estável. O POST básico envia o arquivo
inteiro sem retomada; falhas do transporte navegador→Stream não passam pelo backend.
Os logs atuais comprovam apenas emissão de contrato. Não há evidência para atribuir
o incidente específico a limite, rede, CORS ou suspensão do Safari.

## Decisão

Usar TUS, já instalado, com partes de 5 MiB para novos clientes. Conservar interpretação
de contratos básicos durante rollout e clientes legados. Não alterar bytes/formato,
compressão ou autorização, nem voltar ao R2. Retentativas são limitadas e mantêm a URL
temporária apenas em memória; abortar transporte nunca executa TUS DELETE.

Adicionar diagnóstico autenticado com vocabulário fechado e correlação derivada do
ativo. Validar proprietário e rate limit antes de registrar. Eventos são relatos
não confiáveis do cliente, sem efeito em estado, entitlement ou associação. Proibir
texto livre/URLs/credenciais/nomes de arquivos/PII. Reutilizar API client e middleware.

Diagnóstico best-effort, com timeout curto independente do cancelamento do upload;
falha não altera UX nem autenticação. Sem novos pacotes, envs ou banco. Este canal
não garante entrega se o aparelho perder rede ou encerrar/suspender a página.

## Consequências

Mais requisições pequenas e retomada na mesma sessão, sem prometer sobrevivência ao
fechamento da aba. Erros públicos permanecem simples em PT-BR. Teste desktop não é
certificação Safari/iPhone. A confirmação operacional do usuário não substitui uma
matriz completa de testes em aparelhos reais.

Referência: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/

## Validação

Checks das quatro apps, builds backend/frontend e 20 checks HTTP reais passaram em
0.1.385. Banco local isolado, sem mocks nem acesso ao banco publicado nesses checks.
Commit `579de8cd` publicado em homolog: três apps públicas em 0.1.385, health/ready200.
Uploads reais pequeno e de 59.633.289 bytes concluíram reprodução; o maior também
persistiu após recarregar. O usuário confirmou “funcionou” após a correção.

Isso encerra o incidente reportado, não a auditoria geral ou a causa histórica.
O agente não reproduziu o incidente no iPhone nem testou resposta com vídeo usando
a conta gratuita da auditoria; nenhuma cortesia foi concedida. Fechamento documental
sem nova alteração funcional ou env, e sem mudança em produção.
