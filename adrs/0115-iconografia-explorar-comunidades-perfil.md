# ADR 0115 - Iconografia de Explorar comunidades no menu de perfil

Data: 2026-06-17

Status: Aprovado

## Contexto

O menu privado de Perfil usava o ícone `HeartHandshake` no item `Explorar comunidades`, enquanto a
navegação do feed/comunidades já representa a ação `Explorar` com o ícone `Compass`.

Essa diferença reduzia a consistência visual entre os pontos de acesso à exploração de comunidades,
especialmente porque o menu de Perfil é compartilhado por pacientes e psicólogos.

## Decisão

- Substituir o ícone do item `Explorar comunidades` em `/app/profile` pelo mesmo componente `Compass`
  de `lucide-react` já empregado no botão `Explorar` da navegação de comunidades.
- Manter o componente `Row` e as classes existentes do menu privado, preservando tamanho, alinhamento,
  espaçamento, cores, hover, foco e seleção dos demais itens.
- Aplicar a alteração no menu compartilhado de Perfil, cobrindo pacientes e psicólogos sem criar
  implementação paralela.

## Consequências

- A ação `Explorar comunidades` passa a ter o mesmo símbolo nos contextos de feed/comunidades e perfil.
- A mudança fica restrita ao frontend e não altera rotas, dados, backend, Prisma, migrations ou packages.
- Builder/Quick Copy não estava exposto como ferramenta direta neste ambiente; a referência auditável foi
  o próprio botão `Explorar` existente em `frontend/src/app/app/community/[slug]/logic.tsx`.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Chrome/CDP local autenticado em `/app/profile` confirmou o item `Explorar comunidades` com:
  - `href="/app/community"`;
  - classe SVG `lucide lucide-compass h-5 w-5`;
  - renderização válida para usuário paciente e usuário psicólogo.

## Pendências

- Nenhuma.

## Complemento 2026-06-17 - Ordem da seção Comunidade

### Contexto

A seção `Comunidade` do menu de Perfil é compartilhada por pacientes e psicólogos. A ordem anterior
colocava `Comunidades seguidas` antes de `Salvos`, enquanto a jornada de acompanhamento e biblioteca
de conteúdo pede que os itens pessoais apareçam antes das áreas de descoberta/seguimento.

### Decisão

- Reordenar apenas o array `communityRows` em `/app/profile`.
- Manter os mesmos ícones, `hrefs`, divisórias, setas e classes do componente `Row`.
- Definir a ordem oficial da seção como:
  1. `Meus posts e comentários`;
  2. `Salvos`;
  3. `Comunidades seguidas`;
  4. `Explorar comunidades`.

### Consequências

- A mudança vale simultaneamente para pacientes e psicólogos por usar o menu compartilhado.
- Não há alteração de backend, schema Prisma, rotas ou comportamento de navegação.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile 390x844 em `/app/profile` confirmou, para paciente e psicólogo, a ordem dos
  `hrefs`: `/app/posts/mine`, `/app/posts/saved`, `/app/following`, `/app/community`, sem overflow
  horizontal.
