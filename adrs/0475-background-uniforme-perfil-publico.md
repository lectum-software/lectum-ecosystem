# ADR-0475: Background uniforme no perfil público

## Status

Accepted

## Task relacionada

TASK-15 — correção visual pós-feedback em 2026-08-28

## Contexto

O perfil público de psicólogo em `/psicologos/[id]` usava `bg-surface-muted` no conteúdo interno, enquanto o `PageShell`, o `body` e a home/feed público usam `bg-background`. Em desktop, especialmente com a sidebar recolhida/expandida, essa diferença criava faixas visuais com dois tons próximos de background, perceptíveis atrás da área de expansão do menu.

A referência visual usada foi a home em homologação enviada pelo usuário, os screenshots da divergência e as imagens exportadas `_product/proto/Feed Comunidade.jpg` e `_product/proto/Perfil Profissional - Sobre.jpg`. O Builder Quick Copy foi tentado apenas para inspeção, mas o `npx` local falhou no cache antes de acessar o artefato; por isso a execução seguiu com as imagens locais/provas do navegador, sem gerar código por Builder.

## Decisão

Padronizar o background externo do perfil público com o mesmo token da home: `bg-background`.

As áreas de conteúdo/card continuam usando seus próprios tokens de superfície (`bg-surface`, `bg-surface-muted`) quando representam cartões ou blocos internos. A decisão vale apenas para a base visual da página, evitando uma camada de fundo diferente no wrapper do perfil.

## Consequências

- O perfil público deixa de exibir faixas de fundo com tons diferentes no desktop.
- A implementação permanece compatível com tema claro/escuro, porque usa token (`bg-background`) em vez de cor crua.
- O ajuste é visual e isolado; não muda contratos, navegação, dados ou componentes compartilhados.
- Trade-off: blocos que antes pareciam levemente destacados por causa do fundo `surface-muted` passam a depender dos cards e espaçamentos próprios para hierarquia.

## Produção e rollout

- Compatibilidade com dados existentes: sem alteração de dados.
- Banco/migration: sem alteração.
- Envs: nenhuma env nova ou alterada; sem **ALERTA DE DEPLOY**.
- Packages: nenhum pacote novo.
- Compatibilidade entre apps: frontend-only; backend e admin podem permanecer em versões diferentes.
- Ordem de deploy: push em `homolog` publica o frontend de homologação automaticamente.
- Rollback: reverter o commit restaura o background anterior.
- Smoke esperado em homologação: abrir `/` e `/psicologos/[id]` em desktop, expandir/recolher a sidebar e confirmar fundo uniforme fora dos cards.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local do frontend (`pnpm --dir frontend dev` + Chrome headless em viewport desktop 1440x1100) validando `/` e `/psicologos/cmtalxtu5008d01k9ytfde95n` com sidebar recolhida (`88px`) e expandida (`240px`).
- Evidência CSS do perfil expandido: `body`, `main`, content, wrapper e section em `rgb(246, 247, 248)`, igual ao `bg-background` da home. Os dados do perfil não carregaram no smoke local porque a API/backend local não estava disponível; a validação foi focada no background da página.

## Pendências

- Nenhuma pendência externa.
