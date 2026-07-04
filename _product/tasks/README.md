# Lectum Product Tasks

Fila sequencial de execução do produto Lectum.

Cada task é auto-suficiente e deve ser executada isoladamente por uma IA usando a skill de seu ambiente:

- Codex: `.codex/skills/execute-lectum-task/SKILL.md`
- Claude Code: `.claude/skills/execute-lectum-task/SKILL.md`
- GitHub/Copilot: `.github/prompts/execute-next-lectum-task.prompt.md`
- Cursor: `.cursor/mcp.json` + instruções do workspace

## Estado atual do produto

- Backend e frontend têm base inicial de autenticação.
- Backend usa Express 5, Prisma 7, Passport/JWT/Google OAuth e Biome.
- Frontend usa Next.js 16, React 19, Tailwind CSS 4, TanStack Query 5, Redux Toolkit, Biome e ESLint.
- A referência visual ativa é Builder Quick Copy + imagens exportadas em `_product/proto`.
- O Builder está autenticado no espaço `Lectum` e o Quick Copy foi validado via `builder.io code`.
- Existem 62 JPEGs exportados em `_product/proto`: 61 telas de produto e 1 ícone isolado.
- A fila operacional agora possui 49 tasks: `TASK-00` a `TASK-40`, `TASK-42` a `TASK-44`, incluindo complementos `TASK-18A`, `TASK-29A`/`TASK-29B` e `TASK-31A` a `TASK-31C`.

## Inventário visual ativo

- Inventário completo: `PROTO-INVENTORY.md`.
- Roadmap revalidado por tela/jornada: `ROADMAP-REVALIDADO.md`.
- Builder Quick Copy: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
- Imagens locais: `_product/proto`.

As imagens não representam a qualidade final do código nem autorizam recriar arquitetura. Elas são norte visual para layout, estados, hierarquia, copy e fluxo.

Quando uma task citar artefato `figma-design-frame-*.html`, leia como nome virtual preservado pelo Builder Quick Copy. Isso não torna Figma uma fonte ativa.

## Fluxo vigente de cadastro do psicologo

O fluxo operacional de cadastro profissional, atualizado em 2026-06-07, e:

1. Cadastro com Google ou e-mail/senha.
2. Se e-mail/senha, confirmar e-mail por codigo.
3. Entrar em `/app/professional/billing/plans`.
4. Se escolher **Plano Gratuito**:
   - persistir `professional_subscription` real com plano `gratuito` e status `ativa`;
   - seguir para `/app/professional/whatsapp/verify`;
   - depois ir para `/app/professional/profile/setup`.
5. Se escolher **Plano Profissional**:
   - seguir para `/app/professional/billing/checkout`;
   - so avancar com pagamento real Mercado Pago na TASK-32;
   - apos confirmacao real do pagamento/assinatura ativa, seguir para endereco de faturamento,
     telefone, CRP e perfil.

Bloqueios mantidos: o checkout pago nao pode ativar assinatura sem credenciais/webhook reais do
Mercado Pago; a configuracao final do perfil profissional completo continua bloqueada pela TASK-18
enquanto TASK-11 nao tiver armazenamento privado para documentos CRP. A TASK-19 foi revalidada em
2026-06-09 e nao depende mais desse upload documental: avaliacoes exigem Plano Profissional ativo
ou cortesia manual.

## Regras de execução

- Execute uma task por vez.
- Não use mocks.
- Se faltar decisão externa, pare e registre a pendência.
- Antes de implementar UI, consulte `PROTO-INVENTORY.md`.
- Use o Quick Copy Builder para obter contexto visual quando a ferramenta estiver disponível.
- Use as imagens exportadas de `_product/proto` como fallback e como referência auditável da task.
- Ao concluir, marque critérios de aceite `[x]`, registre ADR, faça commit próprio e execute `git push` para publicar a branch/remoto correspondente. Se a branch ainda não tiver upstream, use `git push -u origin <branch>`.
- Não use referências externas ao workspace da task como atalho arquitetural.
- Antes de criar código novo, consulte `ARCHITECTURE.md`.
- Antes de criar/alterar modelo Prisma ou contrato de API, consulte `DATA-MODEL.md` e referencie a seção em vez de redefinir o schema.
- Toda task que alterar o banco (`backend/prisma/schema.prisma` ou `backend/prisma/migrations`) deve executar `pnpm --dir backend db:migrate` na própria execução. O usuário não-dev não deve ficar responsável por aplicar migrations.
- Se `prisma migrate dev` falhar por dados ou estado preexistente do banco de desenvolvimento, pare e pergunte ao usuário se pode resetar o banco antes de rodar qualquer comando destrutivo, como `pnpm --dir backend exec prisma migrate reset`.
- Antes de instalar pacote, consulte `PACKAGES.md`.
- Antes de qualquer tela com campo, edição, filtro avançado ou submit, execute/consulte `TASK-02` e use `frontend/src/hooks/form` + `frontend/src/components/controllers`.
- Nunca aceite código gerado pelo Builder CLI como final sem adequação aos padrões de front/back.

## Roadmap sequencial vigente

| Ordem | Task | Status | Depende |
|---|---|---|---|
| 00 | [TASK-00 - Setup do agente executor e governança](TASK-00-setup-agente-executor-governanca.md) | Completed | - |
| 01 | [TASK-01 - Design System Lectum Foundation](TASK-01-design-system-lectum-foundation.md) | Completed | 00 |
| 02 | [TASK-02 - Form Composition Foundation](TASK-02-form-composition-foundation.md) | Completed | 01 |
| 03 | [TASK-03 - Decisões externas e integrações obrigatórias](TASK-03-decisoes-externas-integracoes.md) | Completed | 00 |
| 04 | [TASK-04 - Seleção de perfil e login](TASK-04-selecao-perfil-login.md) | Completed | 01, 02, 03 |
| 05 | [TASK-05 - Recuperação de senha](TASK-05-recuperacao-senha.md) | Completed | 02, 04 |
| 06 | [TASK-06 - Verificação de e-mail por código](TASK-06-verificacao-email-codigo.md) | Completed | 02, 04 |
| 07 | [TASK-07 - Cadastro de paciente](TASK-07-cadastro-paciente.md) | Completed | 02, 04, 06 |
| 08 | [TASK-08 - Boas-vindas do paciente](TASK-08-boas-vindas-paciente.md) | Completed | 07 |
| 09 | [TASK-09 - Cadastro inicial de psicólogo](TASK-09-cadastro-inicial-psicologo.md) | Completed | 02, 04, 06 |
| 10 | [TASK-10 - Consulta CFP e resultado](TASK-10-consulta-cfp-resultado.md) | Completed | 02, 03, 09 |
| 11 | [TASK-11 - Envio e confirmação de CRP](TASK-11-envio-confirmacao-crp.md) | Blocked | 02, 03, 10 |
| 12 | [TASK-12 - Shell privado mobile](TASK-12-shell-privado-mobile.md) | Completed | 06, 08 ou 11 |
| 13 | [TASK-13 - Psicólogos: listagem e filtros](TASK-13-psicologos-listagem-filtros.md) | Completed | 02, 12 |
| 14 | [TASK-14 - Favoritos e seguindo](TASK-14-favoritos-seguindo.md) | Completed | 13 |
| 15 | [TASK-15 - Perfil profissional público](TASK-15-perfil-profissional-publico.md) | Completed | 13 |
| 16 | [TASK-16 - Contato por WhatsApp](TASK-16-contato-whatsapp.md) | Completed | 02, 03, 15 |
| 17 | [TASK-17 - Avaliações pelo paciente](TASK-17-avaliacoes-paciente.md) | Completed | 02, 15, 16 |
| 18 | [TASK-18 - Perfil privado do psicólogo](TASK-18-perfil-privado-psicologo.md) | Blocked | 02, 11, 12 |
| 18A | [TASK-18A - Perfil gratuito sem documento CRP](TASK-18A-perfil-gratuito-sem-crp.md) | Completed | 02, 12, 16, 31 |
| 19 | [TASK-19 - Avaliações do psicólogo](TASK-19-avaliacoes-psicologo.md) | Completed | 17, 18A, 31, 31A, 31B |
| 20 | [TASK-20 - Analytics do psicólogo](TASK-20-analytics-psicologo.md) | Completed | 16, 17, 18A, 19, 31 |
| 21 | [TASK-21 - Perfil privado do paciente](TASK-21-perfil-privado-paciente.md) | Completed | 02, 12 |
| 22 | [TASK-22 - Explorar e sugerir comunidades](TASK-22-explorar-sugerir-comunidades.md) | Completed | 02, 12 |
| 23 | [TASK-23 - Feed de comunidade](TASK-23-feed-comunidade.md) | Completed | 22 |
| 24 | [TASK-24 - Criar postagem](TASK-24-criar-postagem.md) | Completed | 02, 23 |
| 25 | [TASK-25 - Dentro da comunidade](TASK-25-dentro-comunidade.md) | Completed | 23 |
| 26 | [TASK-26 - Dentro do post](TASK-26-dentro-post.md) | Completed | 02, 24, 25 |
| 27 | [TASK-27 - Ranking Top Mentores](TASK-27-ranking-top-mentores.md) | Completed | 03, 23 |
| 28 | [TASK-28 - Meus posts e posts salvos](TASK-28-meus-posts-posts-salvos.md) | Completed | 24 |
| 29a | [TASK-29A - Notificações: fundação e recebimento](TASK-29a-notificacoes-fundacao.md) | Completed | 02, 12 |
| 29b | [TASK-29B - Notificações: eventos de domínio](TASK-29b-notificacoes-eventos.md) | Completed | 29a |
| 30 | [TASK-30 - Configurações de conta](TASK-30-configuracoes-conta.md) | Completed | 02, 12 |
| 31 | [TASK-31 - Planos de assinatura](TASK-31-planos-assinatura.md) | Completed | 03, 18 |
| 31A | [TASK-31A - Concessão administrativa de assinatura profissional](TASK-31A-concessao-administrativa-assinatura.md) | Completed | 31 |
| 31B | [TASK-31B - Cortesia profissional na assinatura e perfil](TASK-31B-assinatura-cortesia-ui-perfil-profissional.md) | Completed | 18A, 31A |
| 31C | [TASK-31C - Data de inscrição CRP para experiência em cortesia](TASK-31C-data-inscricao-crp-cortesia-experiencia.md) | Completed | 10, 13, 31A, 31B |
| 32 | [TASK-32 - Checkout de assinatura](TASK-32-checkout-assinatura.md) | Completed | 02, 03, 31 |
| 33 | [TASK-33 - Gestão de assinatura e cartão](TASK-33-gestao-assinatura-cartao.md) | Completed | 02, 32 |
| 34 | [TASK-34 - Qualidade, segurança, LGPD e operação](TASK-34-qualidade-seguranca-lgpd-operacao.md) | Completed | 13 a 33 |
| 35 | [TASK-35 - Ajustes mobile de regressão em login, perfil e descoberta](TASK-35-ajustes-mobile-regressao-login-perfil.md) | Completed | 12, 13, 14, 15, 18A, 20 |
| 36 | [TASK-36 - Refinos mobile de perfil público, analytics e edição profissional](TASK-36-refinos-mobile-perfil-analytics-edicao.md) | Completed | 14, 15, 18A, 20, 35 |
| 37 | [TASK-37 - Instalação da Lectum como app/atalho no celular](TASK-37-instalacao-lectum-app-atalho.md) | Completed | 01, 12 |
| 38 | [TASK-38 - Permissão contextual de notificações no navegador](TASK-38-permissao-contextual-notificacoes-navegador.md) | Completed | 12, 29A |
| 39 | [TASK-39 - SEO e descoberta por mecanismos de busca/IA](TASK-39-seo-ia-descoberta.md) | Completed | 01, 12 |
| 40 | [TASK-40 - Rotas publicas de psicologos e comunidades fora de /app](TASK-40-rotas-publicas-psicologos-comunidades.md) | Completed | 12, 13, 22, 23, 25, 26, 39 |
| 42 | [TASK-42 - Layout de compartilhamento social para video-resposta](TASK-42-layout-compartilhamento-video-resposta.md) | Completed | 23, 26, 28, 29B |
| 43 | [TASK-43 - Scrollbar mobile app-like em telas principais](TASK-43-scrollbar-mobile-telas-principais.md) | Completed | 12, 23, 25, 40 |
| 44 | [TASK-44 - Verificação de registro retomável no fluxo pago](TASK-44-verificacao-registro-assinatura-retomavel.md) | Completed | 10, 16, 18A, 31, 32 |

## Ordem operacional recomendada sem bloqueios

Esta secao e a fila pratica para continuar o MVP sem bater nas tasks bloqueadas por dependencias externas. A fonte de verdade de cada execucao continua sendo o arquivo da task, mas a ordem abaixo evita iniciar uma task que depende de outra ainda bloqueada.

### 0. Fechar inconsistencias documentais antes de nova feature

1. [TASK-29A - Notificacoes: fundacao e recebimento](TASK-29a-notificacoes-fundacao.md) fechada em 2026-06-15; TASK-29B foi iniciada na sequencia.
2. [TASK-29B - Notificacoes: eventos de dominio](TASK-29b-notificacoes-eventos.md) recebeu os produtores reais existentes em 2026-06-15 e foi concluida em 2026-06-29 com `profile_view_event` e `post_share` para `visualizacao_perfil` e `compartilhamento`.
3. A [TASK-10](TASK-10-consulta-cfp-resultado.md) foi concluida com InfoSimples (`DOCUMENT_TOKEN`). Manter como bloqueadas [TASK-11](TASK-11-envio-confirmacao-crp.md) e [TASK-18](TASK-18-perfil-privado-psicologo.md) para documento CRP/bucket privado. A [TASK-19](TASK-19-avaliacoes-psicologo.md) foi concluida apos decisao de produto que substituiu o upload documental deste fluxo por validacao InfoSimples/cortesia manual e entitlement de Plano Profissional.
4. [TASK-37 - Instalação da Lectum como app/atalho no celular](TASK-37-instalacao-lectum-app-atalho.md) foi adicionada em 2026-06-29 como feature frontend independente para experiência app-like; não mistura instalação com permissão de notificações e pode ser executada antes de novas evoluções de push.
5. [TASK-38 - Permissão contextual de notificações no navegador](TASK-38-permissao-contextual-notificacoes-navegador.md) foi adicionada em 2026-06-29 para substituir pedido automático de permissão push por consentimento contextual explícito antes do prompt nativo do navegador.
6. [TASK-39 - SEO e descoberta por mecanismos de busca/IA](TASK-39-seo-ia-descoberta.md) foi adicionada e concluída em 2026-06-29 para criar landing pública indexável, `robots.txt`, `sitemap.xml`, `llms.txt` informativo e política conservadora de crawlers de IA sem expor áreas privadas.
7. [TASK-40 - Rotas publicas de psicologos e comunidades fora de /app](TASK-40-rotas-publicas-psicologos-comunidades.md) foi adicionada e concluida em 2026-06-29 para tornar `/app` um namespace autenticado e expor leitura publica em `/psychologists` e `/community`.
8. [TASK-42 - Layout de compartilhamento social para video-resposta](TASK-42-layout-compartilhamento-video-resposta.md) foi adicionada e concluida em 2026-06-30 para padronizar o SHARE de video-respostas profissionais em formato social vertical e quadrado.
9. [TASK-43 - Scrollbar mobile app-like em telas principais](TASK-43-scrollbar-mobile-telas-principais.md) foi adicionada e concluida em 2026-07-01 para ocultar scrollbars visuais somente nos scrolls principais mobile/tablet de feed/comunidade e psicologos, preservando desktop e containers internos.
10. [TASK-44 - Verificação de registro retomável no fluxo pago](TASK-44-verificacao-registro-assinatura-retomavel.md) foi adicionada e concluída em 2026-07-04 para diferenciar assinatura paga ativa de verificação CFP concluída, retomando `/app/professional/cfp`, bloqueando edição do perfil profissional pago pendente e removendo selo de verificado baseado apenas em pagamento.

### 1. Trilha executavel agora apos TASK-10

Execute uma por vez, sempre validando, marcando criterios, ADR e commit/push:

1. [TASK-21 - Perfil privado do paciente](TASK-21-perfil-privado-paciente.md)
2. [TASK-22 - Explorar e sugerir comunidades](TASK-22-explorar-sugerir-comunidades.md)
3. [TASK-23 - Feed de comunidade](TASK-23-feed-comunidade.md)
4. [TASK-25 - Dentro da comunidade](TASK-25-dentro-comunidade.md)
5. [TASK-24 - Criar postagem](TASK-24-criar-postagem.md)
6. [TASK-26 - Dentro do post](TASK-26-dentro-post.md)
7. [TASK-27 - Ranking Top Mentores](TASK-27-ranking-top-mentores.md)
8. [TASK-28 - Meus posts e posts salvos](TASK-28-meus-posts-posts-salvos.md)
9. [TASK-29B - Notificacoes: eventos de dominio](TASK-29b-notificacoes-eventos.md), somente depois de TASK-29A estar fechada e das tasks produtoras de eventos usadas no escopo estarem prontas.
10. [TASK-30 - Configuracoes de conta](TASK-30-configuracoes-conta.md)
11. [TASK-37 - Instalação da Lectum como app/atalho no celular](TASK-37-instalacao-lectum-app-atalho.md), feature frontend independente para aproximar a experiência mobile de aplicativo instalado.
12. [TASK-38 - Permissão contextual de notificações no navegador](TASK-38-permissao-contextual-notificacoes-navegador.md), melhoria independente da fundação de notificações para pedir consentimento push somente após contexto e gesto explícito.

### 2. Trilha condicional de pagamento

1. [TASK-32 - Checkout de assinatura](TASK-32-checkout-assinatura.md), apenas se as credenciais/contrato Mercado Pago necessarios estiverem disponiveis; se nao estiverem, registrar bloqueio especifico e nao simular checkout.
2. [TASK-33 - Gestao de assinatura e cartao](TASK-33-gestao-assinatura-cartao.md), somente depois da TASK-32.

### 3. Voltar nas bloqueadas para concluir o produto

Quando os requisitos externos estiverem resolvidos, retomar nesta ordem:

1. [TASK-11 - Envio e confirmacao de CRP](TASK-11-envio-confirmacao-crp.md), depois de provisionar bucket R2 privado para documentos profissionais e definir env como `CLOUDFLARE_R2_PRIVATE_BUCKET_NAME` ou equivalente.
2. [TASK-18 - Perfil privado do psicologo](TASK-18-perfil-privado-psicologo.md), depois de TASK-11.
3. [TASK-20 - Analytics do psicologo](TASK-20-analytics-psicologo.md) foi concluida em 2026-06-09 com dados reais de contato/avaliacao/posts, gate por Plano Profissional/cortesia e omissao honesta de visualizacoes de perfil por falta de `profile_view_event`.
4. [TASK-19 - Avaliacoes do psicologo](TASK-19-avaliacoes-psicologo.md) ja foi concluida em 2026-06-09; nao retomar salvo regressao.
5. Reavaliar dependencias de billing ([TASK-31](TASK-31-planos-assinatura.md), [TASK-32](TASK-32-checkout-assinatura.md), [TASK-33](TASK-33-gestao-assinatura-cartao.md)) se alguma tiver sido bloqueada por credenciais.
6. [TASK-34 - Qualidade, seguranca, LGPD e operacao](TASK-34-qualidade-seguranca-lgpd-operacao.md), concluida em 2026-06-29 com a TASK-41 explicitamente aceita para fora do MVP por enquanto.

### 4. Regra para escolher a proxima task

- Se a proxima task da trilha estiver `Pending` e todas as dependencias estiverem `Completed`, execute.
- Se alguma dependencia estiver `Blocked`, nao implemente parcialmente: registre bloqueio na task/ADR e avance para a proxima task independente da trilha acima.
- Se houver requisito externo sem credencial/decisao real, registre bloqueio e nao use mock.

## Validacao base por task

Toda task deve rodar os comandos relevantes:

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm check`
- `pnpm --dir backend db:migrate` quando a task alterar banco/schema/migrations
- `pnpm --dir backend build` quando backend estrutural mudar
- `pnpm --dir frontend build` quando frontend visual/rota mudar

## Definition of Done obrigatória

Uma task só pode ser marcada como concluída quando:

- todos os critérios de aceite aplicáveis estiverem marcados com `[x]`;
- não houver mock, dado fake permanente ou endpoint simulado;
- decisões externas pendentes estiverem registradas como bloqueio;
- formulários/campos usarem a fundação da `TASK-02` quando aplicável;
- ADR relevante existir ou a task justificar por que não precisou de ADR novo;
- migrations terem sido aplicadas com `pnpm --dir backend db:migrate` quando a task alterar banco/schema/migrations;
- checks/builds relevantes estiverem verdes;
- UI tiver sido validada com Builder/Quick Copy quando disponível ou com imagem local registrada em `PROTO-INVENTORY.md`;
- UI tiver sido validada no browser local quando houver tela;
- houver commit próprio da task;
- o commit tiver sido publicado com `git push`, ou o bloqueio de push tiver sido registrado explicitamente quando houver falha de credenciais, rede ou permissão.

## Templates

- Nova task: `TASK-TEMPLATE.md`.
- Novo ADR: `../../adrs/TEMPLATE.md`.

## Documentos técnicos obrigatórios

- `ARCHITECTURE.md`: padrões reais de front/back e regras anti-recriação.
- `DATA-MODEL.md`: modelos Prisma e contratos de API ainda não implementados (fonte única de schema/DTO/papel do usuário).
- `PACKAGES.md`: libs instaladas, candidatas e política de dependências.
- `PROTO-INVENTORY.md`: telas exportadas, Builder Quick Copy e status do MCP.
- `ROADMAP-REVALIDADO.md`: fila visual granular.
- `RESEARCH.md`: pesquisa e regras de ouro.
- `QUALITY-REVIEW.md`: auditorias de qualidade dos documentos.

## Fontes de produto

- `_product/Lectum PRD.pdf`
- `_product/Fluxogramas do Produto.pdf`
- Builder Quick Copy: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`
- Protótipos exportados: `_product/proto`

## Atualiza��o de fluxo em 2026-06-07

- A etapa de WhatsApp profissional deixa de ser verifica��o por SMS/OTP e passa a ser apenas cadastro do n�mero para gera��o interna do link `wa.me` ap�s inten��o de contato.
- O fluxo visual ainda usa `/app/professional/whatsapp/verify` por compatibilidade de rota, mas a c�pia e a regra de dom�nio tratam a tela como inser��o/salvamento do WhatsApp.

## Atualizacao de fluxo em 2026-06-07: gratuito sem CRP API

- Psicologos no plano gratuito seguem da escolha do plano para `/app/professional/whatsapp/verify` e depois para `/app/professional/profile/setup`.
- O plano gratuito exige apenas insercao do WhatsApp antes do perfil; nao exige consulta/validacao CFP/CRP via API.
