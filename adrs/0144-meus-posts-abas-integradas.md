# ADR-0144: Abas centralizadas fora do header em Meus posts e respostas

Data: 2026-06-21

## Contexto

A tela `Meus posts e respostas` chegou a integrar as abas `Posts` e `Respostas` dentro do card de header. Em revisao visual do produto, o comportamento desejado mudou: o header deve ficar limpo, apenas com voltar e titulo centralizado, enquanto a escolha entre posts e respostas deve aparecer abaixo, centralizada e com o mesmo layout compacto usado no bloco de publicacoes do perfil do psicologo.

Builder/Quick Copy nao ficou acessivel como ferramenta callable neste ambiente. A referencia visual aplicada foi o padrao ja implementado em `frontend/src/app/app/psychologist/[id]/logic.tsx`, no resumo de publicacoes do perfil do psicologo, e a validacao ocorreu no browser local.

## Decisao

- Remover `Posts` e `Respostas` de dentro do header de `/app/posts/mine`.
- Manter o header como superficie exclusiva para botao de voltar e titulo centralizado.
- Renderizar o filtro em um card separado logo abaixo do header, com linha centralizada, icones, contador antes do rotulo e divisor vertical entre opcoes em telas `sm+`.
- Reutilizar a linguagem visual da aba de publicacoes do perfil do psicologo: `FileText` para posts, seta de resposta para respostas/comentarios, texto forte e azul na opcao ativa, fundo branco e borda suave.
- Preservar a semantica de abas (`role="tablist"`, `role="tab"`, `aria-selected`) e o comportamento funcional de paginacao/filtro existente.

## Consequencias

- O header fica visualmente mais simples e alinhado aos headers secundarios premium ja usados no app.
- A navegacao entre posts e respostas passa a conversar diretamente com o padrao de metricas/publicacoes do perfil do psicologo.
- Nao ha alteracao de backend, DTO, endpoint, schema Prisma, packages, ordenacao, persistencia ou regra de dominio.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP local em `/app/posts/mine` com viewport mobile `390x844`, autenticado com usuario real de desenvolvimento, confirmando header sem abas (`headerContainsFilter=false`), filtro fora do header, centralizado (`filterCenterDelta=0`) e botoes `2 Posts` / `1 Respostas` no padrao de publicacoes.