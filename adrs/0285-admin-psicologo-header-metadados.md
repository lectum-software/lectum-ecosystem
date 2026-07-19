# ADR-0285: Metadados iconográficos no header Admin do psicólogo

## Status

Accepted

## Task relacionada

Ajuste complementar da TASK-55 por feedback direto de produto.

## Contexto

O header do detalhe administrativo do paciente foi aprovado visualmente pelo usuário por usar ícones leves e metadados em linha. No detalhe administrativo do psicólogo, a mesma região ainda priorizava tags de `Ativo`, `Plano de cortesia` e avaliação, criando peso visual maior e menor consistência com o novo piloto premium do Admin.

Após iterações de feedback, a direção final para o header do psicólogo ficou mais enxuta: e-mail, WhatsApp, status da conta, plano e avaliação na mesma linha de metadados; sem gênero, localização, forma de cadastro ou data de cadastro no header. O WhatsApp deve omitir o DDI visual `+55`, usar o ícone canônico de WhatsApp já usado na Lectum e a avaliação deve usar estrela vazada azul, alinhada aos demais ícones.

Em 2026-07-19, o usuário esclareceu que "status do perfil" no header significava o status de acesso da conta: se o e-mail está confirmado e se o usuário consegue fazer login. Esse status não deve reutilizar o status público do perfil (`verified`, `free`, `unpublished`, `pending`), porque ele responde outra pergunta de produto.

O Builder/Quick Copy ativo não está exposto como ferramenta callable neste ambiente. A referência visual usada foi a captura fornecida pelo usuário e a implementação real já existente em `admin/src/app/(admin)/pacientes/[id]/client.tsx`, além do inventário local `_product/proto/admin`.

## Decisão

- Substituir, no header de `/psicologos/[id]`, a linha de tags de status/plano/avaliação por metadados iconográficos com peso visual leve.
- A linha principal do header passa a concentrar e-mail, WhatsApp sem DDI `+55`, status da conta, plano e avaliação.
- O status da conta no header usa o endpoint real já existente `GET /api/admin/private/psychologists/:id/account`, compartilhando a query `useAdminPsychologistAccount` com a aba **Conta** para obter `confirmed`, `active`, `account_status` e `account_status_label`.
- A leitura visual do status segue a regra:
  - `Conta ativa` somente quando a conta está ativa e o e-mail está confirmado;
  - `E-mail pendente` quando a conta está ativa, mas o e-mail ainda não foi confirmado;
  - `Conta suspensa`/`Conta desativada` quando o status operacional bloqueia login;
  - `Login bloqueado` como fallback se `active=false` vier sem status operacional coerente;
  - `Conta indisponível` apenas quando o endpoint real falhar.
- Remover gênero, localização profissional e origem de cadastro do header para reduzir ruído visual; esses dados continuam disponíveis nas abas/cards próprios quando necessário.
- Usar o SVG canônico `WhatsAppIcon` já presente na base do Admin/Lectum, em vez do ícone genérico de conversa.
- Renderizar a estrela de avaliação vazada em azul (`text-primary`), sem preenchimento.
- Preservar nome, selo verificado, título profissional, CRP, link `Ver perfil público`, tabs e dados reais existentes.
- Manter somente `Último acesso: ...` como informação temporal secundária, removendo a data de cadastro do header.
- Usar dados reais do contrato Admin de detalhe e, para status de conta, do contrato Admin de conta existente, sem alterar backend, schema Prisma, migrations ou packages.
- Manter layout mobile-first e sem nova linha na faixa de metadados: e-mail, WhatsApp, status da conta, plano e avaliação ficam em uma única linha flex sem wrap; em larguras estreitas a linha pode rolar horizontalmente em vez de quebrar.

## Consequências

- O header do psicólogo fica visualmente mais limpo e mais leve dentro do piloto premium.
- Plano, status da conta e avaliação permanecem no topo, mas como metadados de baixa fricção em vez de tags fortes.
- Status público do perfil, gênero, localização e cadastro deixam de competir no topo; continuam disponíveis em áreas específicas do detalhe/lista/abas quando relevante.
- Há uma chamada real adicional ao endpoint de conta no header, mas ela reutiliza TanStack Query e o mesmo contrato da aba **Conta**; quando a aba for aberta, o cache já estará aquecido.
- Não há nova exposição pública de dados: o status de conta fica apenas no Admin autenticado e deriva de campos que a aba **Conta** já exibe.

## Validação

Executada nesta iteração:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=perfil` retornou `200`.

Observação: validação visual autenticada em browser local não foi executada por não haver ferramenta de browser interativa/sessão Admin disponível no ambiente desta execução.

Atualização de 2026-07-19:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=perfil` retornou `200`.

Bloqueios externos ao ajuste:

- `pnpm --dir admin check` ficou bloqueado por lint/format preexistente em `admin/src/app/(admin)/comunidades/client.tsx`.
- `pnpm --dir admin build` ficou bloqueado por alteração local preexistente em `admin/src/app/(admin)/comunidades/client.tsx` (`charts.hourly_activity` fora do contrato TypeScript atual).
- `pnpm check` passou pelo frontend, mas ficou bloqueado em `backend check` por `prisma generate` com `EBUSY` no diretório gerado `backend/src/external/generated/prisma/models`.
