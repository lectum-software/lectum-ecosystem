# ADR-0508 — Template de produção do backend no Dokploy

Data: 2026-09-16

## Status

Aceita.

## Contexto e decisão

O usuário solicitou `.env.production` com as envs necessárias ao backend no Dokploy e placeholders `YOUR_OWN_...` para o que precisa fornecer. O backend usa ambiente injetado no container e dotenv padrão (`.env`); o sufixo `.production` não é carregado automaticamente. Entregar arquivo local preenchível, ignorado, com modo 0600, e cópia versionada `.env.production.example` contendo somente defaults públicos e placeholders. Liberar no Git apenas esse nome de exemplo exato; não relaxar Dockerignore.

Separar defaults operacionais, credenciais necessárias aos fluxos e integrações opcionais. Manter URLs canônicas de produção, imagens no R2 e vídeos no Stream; preservar limites de 1000 MB/600s informados para o produto. Não incluir dev/reset, sandbox payer, migração R2 no start, envs legadas sem consumidor efetivo ou flags de limpeza. As envs de limites ainda consumidas em rotas compatíveis não reativam upload de vídeo no R2.

Banco, bucket, JWT, OAuth, pagamentos e vídeo exigem recursos/segredos apropriados de produção; não inventar nomes/hosts nem apontar automaticamente ao serviço privado usado em homolog. Filas/Redis continuam na aplicação video, não no backend. Schedulers de campanhas/dunning desligados até validação operacional.

O parser Sentry do backend ainda aceita somente Sentry SaaS, ao contrário dos apps Next ajustados na TASK-186. O modelo registra essa limitação e mantém observabilidade opcional comentada; preencher um DSN GlitchTip não resolve incompatibilidade de código. Corrigir o SDK exige execução separada; não afirmar prontidão de observabilidade de produção.

Cloudflare Stream permite um único webhook por conta. A decisão posterior ADR-0509 adota o roteador
explícito versionado antes de apontar a inscrição única; este template não configura o provider nem
autoriza a troca. Fonte: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#limitations (consultada em 16/09/2026).

## Consequências e validação

Modelo não é env funcional antes de substituir placeholders. Não executá-lo localmente nem usar DATABASE_URL real nos testes. Testes leem o template com dotenv, validam chaves, origens, limites, placeholders e proteção Git/Docker. Não há migrations, dependências novas ou nova env obrigatória. Rollback remove os artefatos documentais, sem alterar ambiente publicado. Preparar arquivo não autoriza configurar Dokploy, criar recursos de provider, habilitar pagamentos ou promover main.
