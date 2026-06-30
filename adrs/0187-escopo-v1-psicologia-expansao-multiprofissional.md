# ADR-0187: Escopo V1 focado em psicologia e expansão multiprofissional futura

## Status

Accepted

## Task relacionada

Decisão de produto/arquitetura solicitada fora da fila sequencial de tasks em 2026-06-30.

## Contexto

A V1 da Lectum será lançada somente com profissionais psicólogos. O produto, as rotas públicas, a validação documental e o modelo atual foram construídos ao redor desse recorte:

- `user.role` aceita apenas `"paciente"` e `"psicologo"`;
- o perfil profissional persistido é `psychologist_profile`;
- a descoberta pública usa `/psychologists` e contratos de listagem/detalhe de psicólogos;
- a validação profissional vigente usa CFP/CRP via provider isolado;
- taxonomias, copy, favoritos, avaliações, analytics e notificações citam psicólogos em diversos pontos.

Ao mesmo tempo, existe intenção de abrir versões futuras para outras áreas da saúde, como nutrição, cardiologia e demais categorias com conselhos e regras próprias.

## Decisão

Manter a V1 explicitamente **psicologia-only** e não antecipar uma refatoração completa para modelo multiprofissional antes do lançamento.

Para a V1:

- não adicionar categorias profissionais além de psicologia;
- não alterar `user.role` para valores genéricos como `"profissional"`;
- não renomear em massa `psychologist_profile`, rotas `/psychologists` ou tabelas `psychologist_*`;
- não simular validações de CRM, CRN, CREFITO ou outros conselhos;
- preservar CFP/CRP como integração real específica de psicologia.

Para versões futuras, a expansão multiprofissional deve entrar como task própria, com ADR e migração planejada. O desenho provável deverá introduzir uma camada profissional genérica, por exemplo:

- `professional_profile` ou equivalente como perfil comum;
- `professional_category`/`profession` para psicólogo, nutricionista, médico, fisioterapeuta etc.;
- registros profissionais por categoria/conselho;
- providers de validação por conselho, isolados por interface;
- taxonomias e filtros segmentados por profissão;
- rotas públicas compatíveis com a nova navegação, mantendo redirects/canonicalização para URLs legadas de psicólogos quando necessário.

Novas features ainda dentro da V1 devem evitar acoplamento adicional desnecessário: quando um conceito for realmente transversal, como assinatura, billing, LGPD, analytics operacional ou avaliação de profissional, a documentação e os nomes novos podem preferir termos genéricos (`professional`) sem refatorar contratos já existentes.

## Consequências

- Reduz risco e escopo antes da V1.
- Evita migrations prematuras em áreas já validadas de descoberta, perfil, comunidade, notificações, assinatura e analytics.
- Mantém clareza de produto: a experiência pública atual continua prometendo psicólogos, não uma plataforma genérica de saúde.
- Cria uma dívida arquitetural consciente: a migração multiprofissional futura exigirá planejamento de dados, compatibilidade de URLs, regras de validação documental e revisão de copy.
- Evita que futuras tasks implementem suporte incompleto ou fake para outras categorias profissionais.

## Validação

- Revisão documental de `ARCHITECTURE.md`, `DATA-MODEL.md` e `schema.prisma`.
- Não houve alteração de código, schema Prisma, migrations, rotas ou UI.
- Checks/builds não foram executados porque a mudança é exclusivamente documental.

## Pendências

- Criar uma task específica de expansão multiprofissional quando essa versão entrar no roadmap.
- Definir categorias iniciais, conselhos profissionais, provedores de validação documental e política comercial por profissão.
- Planejar estratégia de migração/compatibilidade para dados e URLs já publicados de psicólogos.
