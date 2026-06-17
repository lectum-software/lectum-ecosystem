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
