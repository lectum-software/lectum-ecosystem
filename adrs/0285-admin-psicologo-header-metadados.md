# ADR-0285: Metadados iconográficos no header Admin do psicólogo

## Status

Accepted

## Task relacionada

Ajuste complementar da TASK-55 por feedback direto de produto.

## Contexto

O header do detalhe administrativo do paciente foi aprovado visualmente pelo usuário por usar ícones leves e metadados em linha. No detalhe administrativo do psicólogo, a mesma região ainda priorizava tags de `Ativo`, `Plano de cortesia` e avaliação, criando peso visual maior e menor consistência com o novo piloto premium do Admin.

Após iterações de feedback, a direção final para o header do psicólogo ficou mais enxuta: e-mail, WhatsApp, plano e avaliação na mesma linha de metadados; sem gênero, localização, forma de cadastro ou data de cadastro no header. O WhatsApp deve omitir o DDI visual `+55`, usar o ícone canônico de WhatsApp já usado na Lectum e a avaliação deve usar estrela vazada azul, alinhada aos demais ícones.

O Builder/Quick Copy ativo não está exposto como ferramenta callable neste ambiente. A referência visual usada foi a captura fornecida pelo usuário e a implementação real já existente em `admin/src/app/(admin)/pacientes/[id]/client.tsx`, além do inventário local `_product/proto/admin`.

## Decisão

- Substituir, no header de `/psicologos/[id]`, a linha de tags de status/plano/avaliação por metadados iconográficos com peso visual leve.
- A linha principal do header passa a concentrar e-mail, WhatsApp sem DDI `+55`, plano e avaliação.
- Remover gênero, localização profissional e origem de cadastro do header para reduzir ruído visual; esses dados continuam disponíveis nas abas/cards próprios quando necessário.
- Usar o SVG canônico `WhatsAppIcon` já presente na base do Admin/Lectum, em vez do ícone genérico de conversa.
- Renderizar a estrela de avaliação vazada em azul (`text-primary`), sem preenchimento.
- Preservar nome, selo verificado, título profissional, CRP, link `Ver perfil público`, tabs e dados reais existentes.
- Manter somente `Último acesso: ...` como informação temporal secundária, removendo a data de cadastro do header.
- Usar somente dados já retornados pelo endpoint Admin de detalhe do psicólogo, sem alterar contrato HTTP, backend, schema Prisma ou migrations.
- Manter layout mobile-first: os metadados empilham/wrapam na base ~390px e usam espaçamento horizontal uniforme em telas maiores.

## Consequências

- O header do psicólogo fica visualmente mais limpo e mais leve dentro do piloto premium.
- Plano e avaliação permanecem no topo, mas como metadados de baixa fricção em vez de tags fortes.
- Status ativo/inativo, gênero, localização e cadastro deixam de competir no topo; continuam disponíveis em áreas específicas do detalhe/lista/abas quando relevante.
- Não há nova exposição de dados sensíveis: e-mail, WhatsApp, plano e avaliação já eram exibidos no detalhe Admin autenticado ou derivados do mesmo contrato administrativo.

## Validação

Executada nesta iteração:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=perfil` retornou `200`.

Observação: validação visual autenticada em browser local não foi executada por não haver ferramenta de browser interativa/sessão Admin disponível no ambiente desta execução.
