# Pesquisa e Regras de Ouro

Pesquisa inicial feita em 02/06/2026 e reavaliada em 03/06/2026 para orientar o workspace Lectum.

## Fontes consultadas

- OpenAI Developers: Codex use cases e workflows de produção, documentação e frontend com validação visual.
  - https://developers.openai.com/codex/explore/
  - https://developers.openai.com/codex/use-cases
- OpenAI Developers: página de recursos Codex, skills e workflows.
  - https://developers.openai.com/
- VS Code: custom instructions, `AGENTS.md`, prompt files e customizações de agente.
  - https://code.visualstudio.com/docs/copilot/customization/custom-instructions
  - https://code.visualstudio.com/docs/copilot/customization/overview
- GitHub Docs: repository custom instructions e prompt files.
  - https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide
- OpenAI Codex / AGENTS.md:
  - https://github.com/openai/codex/blob/main/docs/agents_md.md
- Claude Code: commands, project MCP configuration and custom skills/commands.
  - https://code.claude.com/docs/en/commands
  - https://code.claude.com/docs/en/mcp
  - https://code.claude.com/docs/en/agent-sdk/slash-commands
- Builder.io: Builder MCP setup and CLI code generation guardrails.
  - https://www.builder.io/c/docs/builder-mcp/
  - https://www.builder.io/c/docs/cli-code-generation-best-practices
- TanStack Query, Form, Router, Table and Virtual official docs.
  - https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates
  - https://tanstack.com/form/latest/docs/framework/react/quick-start
  - https://tanstack.com/form/v1/docs/framework/react/guides/validation
  - https://tanstack.com/router/latest/docs/framework/react/guide/search-params
  - https://tanstack.com/table/latest/docs/overview
  - https://tanstack.com/virtual/latest/docs/introduction
- React Hook Form resolvers and Zod official docs.
  - https://github.com/react-hook-form/resolvers
  - https://zod.dev/ERROR_HANDLING?id=schema-bound-error-map
  - https://zod.dev/json-schema?id=registries
- Next.js App Router official docs for forms and search params.
  - https://nextjs.org/docs/app/api-reference/functions/use-search-params
  - https://nextjs.org/docs/app/guides/forms

## Achados da reavaliação de 03/06/2026

- VS Code reconhece instruções always-on por `.github/copilot-instructions.md` e também `AGENTS.md`; quando há múltiplas instruções, elas podem ser combinadas sem ordem garantida, então regras precisam ser curtas e não contraditórias.
- VS Code suporta `.instructions.md` com `applyTo`, útil para separar regras de frontend, backend e documentação.
- Prompt files permitem salvar prompts reutilizáveis para tarefas recorrentes; por isso o workspace agora tem um prompt em `.github/prompts`.
- A documentação do Codex sobre `AGENTS.md` reforça que há escopo e precedência hierárquica quando o recurso correspondente está habilitado.
- Para o Lectum, a melhor configuração é manter `AGENTS.md` como contrato comum, `.github/copilot-instructions.md` como resumo sempre-on para VS Code/Copilot, `.github/instructions` para regras por área e `.codex/skills` para a execução operacional completa.
- Claude Code usa `.mcp.json` como configuração MCP compartilhável em projeto e `CLAUDE.md` como memória de projeto; `.claude/skills/<nome>/SKILL.md` é o formato recomendado para comandos/skills customizados, enquanto `.claude/commands` segue suportado como legado.
- Builder recomenda autenticação via `npx @builder.io/dev-tools@latest auth`, configuração MCP por cliente e uso de `.builderignore`/regras para proteger arquivos críticos durante geração.
- TanStack Query continua adequado como padrão de server state; mutations devem invalidar queries relevantes e optimistic UI deve ser usada apenas quando houver rollback claro.
- TanStack Form é moderno e suporta Standard Schema/Zod, mas não deve substituir React Hook Form agora porque o projeto já tem RHF instalado e o sample possui uma arquitetura de controllers portável.
- React Hook Form resolvers inferem tipos a partir de schemas como Zod e suportam `useForm<Input, Context, Output>()`, o que combina melhor com a fundação tipada de forms.
- Zod 4 tem locales e customização de erros; como o Lectum não terá i18n no primeiro momento, mensagens visíveis devem ser escritas em PT-BR nos schemas ou configuradas globalmente.
- TanStack Router oferece search params validados/tipados, mas não deve ser instalado porque o projeto usa Next App Router; para filtros avançados no Next, considerar `nuqs` com ADR.
- TanStack Table e TanStack Virtual são headless, preservam controle visual e são bons candidatos para listas densas, datagrids ou feeds longos.

## Regras de ouro adotadas

1. Instruções persistentes devem viver no repositório, não apenas no chat.
2. `AGENTS.md` deve concentrar as regras gerais para múltiplos agentes.
3. Prompt files devem transformar ações recorrentes em comandos reutilizáveis.
4. Tasks devem ter critérios de aceite objetivos e marcáveis.
5. O agente deve executar uma task por vez para preservar foco, validação e commit limpo.
6. Implementação sem validação não é entrega.
7. Design-to-code deve ter inspeção visual real, não apenas inferência textual.
8. Decisões importantes devem virar ADR para evitar perda de contexto em sessões futuras.
9. Integrações externas devem ser tratadas como pré-requisito explícito, nunca como mock.
10. Cada task deve conter contexto suficiente para ser executada isoladamente.
11. Instruções de agente devem ser curtas, verificáveis e sem conflito entre arquivos.
12. Regras específicas de frontend, backend e docs devem viver em arquivos específicos para reduzir ruído.
13. Prompt recorrente deve virar prompt file, não depender de memória do usuário.
14. Ferramentas diferentes precisam de pontos de entrada próprios, mas as regras devem convergir para as mesmas fontes de verdade.
15. Geração visual deve ter arquivos protegidos por ignore/rules, especialmente package manifests, auth, API, store, backend, ADRs e instruções de agente.
16. Formulários/campos de produto devem usar a fundação da `TASK-02`: React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`.
17. TanStack Form e TanStack Router ficam fora do stack ativo enquanto React Hook Form e Next App Router forem as bases do projeto.
18. TanStack Table/Virtual entram somente por necessidade concreta, não como padrão para toda lista visual.

## Aplicação no Lectum

- Criar tasks grandes por jornada/tela, não microtarefas técnicas.
- Nomear tasks com base no protótipo/imagem exportada quando a tela estiver disponível.
- Manter uma task específica para decisões pendentes de gateway, bucket, WhatsApp, CFP, e-mail/SMS e compliance.
- Configurar skill de execução que valida, registra ADR e commita.
- Configurar entradas equivalentes para Codex, Claude Code, GitHub/Copilot, Cursor e VS Code.
- Evitar referências arquiteturais externas ao workspace da task, porque elas não estarão disponíveis como contexto do executor.
- Manter templates de task e ADR para preservar consistência nas próximas expansões.
