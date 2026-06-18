# ADR-0119: Header secundário premium compartilhado

## Status

Accepted

## Task relacionada

TASK-14, TASK-18A, TASK-21, TASK-28, TASK-30, TASK-31B

## Contexto

Após os refinamentos de `Meus Analytics` e `Minhas Avaliações`, essas telas passaram a usar um header secundário mais premium: botão de voltar em círculo azul-claro à esquerda, título centralizado, terceiro slot vazio para manter o centro visual, superfície branca com borda suave e sombra discreta.

As telas `Minha assinatura`, `Email e senha`, `Meus posts e comentários`, `Salvos`, `Comunidades seguidas` e `Editar perfil` ainda usavam variações de header: link textual simples ou `SecondaryPageHeader` com título alinhado à esquerda. Isso gerava inconsistência visual entre áreas privadas próximas da mesma jornada de perfil/upgrade.

A referência visual ativa permanece o inventário local de protótipos em `_product/proto`; para este ajuste, a fonte imediata de verdade foi o layout já aprovado em `Meus Analytics` e `Minhas Avaliações`. Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.

## Decisão

Criar `frontend/src/components/ui/app-page-header.tsx` como componente compartilhado para headers secundários sem ações auxiliares, preservando exatamente a estrutura visual aplicada nas telas profissionais:

- `header` em grid `44px 1fr 44px` para manter o título centralizado mesmo com botão à esquerda;
- altura `h-14`, padding horizontal `px-2`, fundo `bg-surface`, borda `border-border`, radius `var(--lectum-card-radius)` e sombra `var(--lectum-shadow-soft)`;
- botão de voltar `h-10 w-10` em `bg-primary-soft`/`text-primary`;
- ícone `ArrowLeft` em `h-5 w-5`;
- título `text-base font-extrabold tracking-[-0.02em]`.

O componente foi aplicado em:

- `Meus Analytics` e `Minhas Avaliações`, removendo a duplicação local do header;
- `Minha assinatura`;
- `Email e senha`;
- `Meus posts e comentários`;
- `Salvos`;
- `Comunidades seguidas`.
- `Editar perfil` do paciente em `/app/profile/edit`;
- `Editar perfil` do psicólogo em `/app/professional/profile/setup`.

Na edição profissional, a ação `Ver perfil público` foi preservada fora do header, em uma linha própria, para manter o header sem ações auxiliares e visualmente idêntico às demais telas.

A tela de notificações e outras telas que precisam de ações no header continuam usando `SecondaryPageHeader` até haver uma decisão específica para headers com ações.

## Consequências

- As telas privadas listadas passam a compartilhar a mesma linguagem visual e navegação secundária.
- O título permanece centralizado no mobile e no desktop sem depender de compensações manuais por tela.
- O componente reduz duplicação e evita novas variações visuais em telas sem ações auxiliares.
- Não houve alteração de API, persistência, dados, permissões, pacotes ou schema Prisma.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP com usuário psicólogo temporário criado por endpoint real e removido do banco ao final:
  - mobile 390x844 e desktop 1024x768 nas rotas `/app/professional/analytics`, `/app/professional/reviews`, `/app/professional/billing/subscription`, `/app/settings/account`, `/app/posts/mine`, `/app/posts/saved` e `/app/following`;
  - confirmou título centralizado (`titleCenterDelta=0`), ausência de overflow horizontal, fundo branco, grid do header, botão/ícone proporcionais ao root font-size e largura alinhada ao conteúdo central.
- Browser local via Chrome/CDP com usuários temporários reais de paciente e psicólogo, removidos do banco ao final:
  - mobile 390x844 e desktop 1024x768 nas rotas `/app/profile/edit` e `/app/professional/profile/setup`;
  - confirmou título centralizado, ausência de overflow horizontal, fundo branco, altura/padding consistentes e largura alinhada ao conteúdo central.
