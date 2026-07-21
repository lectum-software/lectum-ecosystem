# ADR-0296: Denuncias do paciente no Admin usando post_report real

Status: Accepted

Data: 2026-07-21

## Contexto

O produto solicitou que a aba **Denúncias** do detalhe administrativo de paciente replicasse o layout já usado na aba **Denúncias** do detalhe de psicólogo, incluindo cards, filtros, lista de denúncias e o ícone de alerta no menu quando houver denúncia vinculada ao paciente.

A V1 anterior do detalhe de paciente exibia apenas um placeholder honesto, pois ainda não havia contrato dedicado para denúncias de conteúdo autorado pelo paciente.

## Decisão

- Criar o endpoint admin privado `GET /api/admin/private/patients/:id/reports`.
- Ler somente dados reais de `post_report`, vinculando denúncias a conteúdo autorado pelo paciente:
  - `community_post.author_id = patientId` para posts;
  - `post_reply.author_id = patientId` para comentários/respostas.
- Reutilizar no Admin o layout operacional do psicólogo: cards de total/pendentes/improcedentes/procedentes, filtros de Tipo/Status/Período/De/Até e lista de conteúdos denunciados.
- Manter a aba de paciente como **leitura operacional** nesta V1: sem botões de resolução, remoção de conteúdo, sanções de conta, silenciamento ou moderação parcial.
- Exibir `AlertTriangle` na aba **Denúncias** do menu do paciente quando o total real retornado por `post_report` for maior que zero.

## Consequências

- O Admin passa a investigar denúncias de conteúdo de paciente sem simular dados nem duplicar a moderação existente.
- Ações de resolução continuam centralizadas nos fluxos de moderação/psicólogo/comunidades já existentes até haver contrato explícito para paciente.
- Não houve alteração de schema Prisma, migration, package novo, seed, backfill ou mock.
- A UI segue mobile-first e usa `next/image` para mídias renderizáveis; vídeos usam player nativo com fonte real.
