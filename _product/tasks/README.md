# Lectum Product Tasks

Fila sequencial de execução do produto Lectum.

Cada task é auto-suficiente e deve ser executada isoladamente por uma IA usando a skill de seu ambiente:

- Codex: `.codex/skills/execute-lectum-task/SKILL.md`
- Claude Code: `.claude/skills/execute-lectum-task/SKILL.md`
- GitHub/Copilot: `.github/prompts/execute-next-lectum-task.prompt.md`
- Cursor: `.cursor/mcp.json` + instruções do workspace

## Estado atual do produto

- Desde **2026-08-07**, frontend, backend e admin são aplicações publicadas; homologação e produção podem conter dados reais.
- Backend usa Express 5, Prisma 7, Passport/JWT/Google OAuth e Biome.
- Frontend usa Next.js 16, React 19, Tailwind CSS 4, TanStack Query 5, Redux Toolkit, Biome e ESLint.
- Admin usa Next.js 16 e é publicado separadamente.
- A referência visual ativa é Builder Quick Copy + imagens exportadas em `_product/proto`.
- O Builder está autenticado no espaço `Lectum` e o Quick Copy foi validado via `builder.io code`.
- Existem 63 JPEGs exportados em `_product/proto`: 61 telas de produto, 1 referência social e 1 ícone isolado.
- A fila operacional agora possui 167 tasks: `TASK-00` a `TASK-160`, incluindo complementos `TASK-18A`, `TASK-29A`/`TASK-29B`, `TASK-31A` a `TASK-31C` e `TASK-101A`.

## Gate obrigatório de publicação

1. Confirmar `git branch --show-current` antes de editar. O desenvolvimento acontece em `homolog`; se estiver em `main`, parar e orientar a troca de branch.
2. Lembrar que push em `homolog` publica homologação e push/merge em `main` publica produção.
3. Nunca commitar ou fazer push direto em `main`. Produção só recebe merge revisado depois de checks, builds e smoke test do deploy em homologação.
4. Tratar dados, pagamentos, uploads, notificações e integrações dos ambientes publicados como persistentes. Reset, seed destrutivo, `db push`, exclusão em massa e limpeza de bucket são proibidos nesses ambientes.
5. Toda mudança de banco deve descrever compatibilidade com dados existentes, ordem expandir → backfill retomável → contrair e rollback. Migration aplicada é imutável.
6. Toda env nova obrigatória deve gerar um **ALERTA DE DEPLOY** com chave, aplicação, ordem de cadastro em homologação/produção e impacto se ausente, sem mostrar o valor. Preferir implantação em duas etapas com fallback seguro.
7. Contratos de API devem continuar funcionando durante o período em que frontend, backend e admin estiverem em versões diferentes.
8. Depois do deploy em homologação, validar os fluxos afetados e, para backend, `/health` e `/ready`. Só então recomendar promoção para `main`.
9. Quando o usuário pedir explicitamente produção, o agente cria/reutiliza PR `homolog` → `main` com `gh`, aguarda checks, faz merge sem excluir `homolog` e valida produção. Nunca delegar push direto ou commit em `main`.

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
3. Entrar em `/app/profissional/assinatura/planos`.
4. Se escolher **Plano Gratuito**:
   - persistir `professional_subscription` real com plano `gratuito` e status `ativa`;
   - seguir para `/app/profissional/whatsapp/verificar`;
   - depois ir para `/app/profissional/perfil/configurar`.
5. Se escolher **Plano Profissional**:
   - seguir para `/app/profissional/assinatura/pagamento`;
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
- Commit e push da task devem ocorrer em `homolog`; o executor deve informar que o push iniciou o deploy automático de homologação.
- Antes de cada novo commit do agente, executar uma única vez `pnpm version:bump`, incluir os quatro `package.json` sincronizados e validar `pnpm check:version`. Não repetir o bump ao apenas tentar novamente um commit que falhou.
- Não use referências externas ao workspace da task como atalho arquitetural.
- Antes de criar código novo, consulte `ARCHITECTURE.md`.
- Antes de criar/alterar modelo Prisma ou contrato de API, consulte `DATA-MODEL.md` e referencie a seção em vez de redefinir o schema.
- Toda task que alterar o banco (`backend/prisma/schema.prisma` ou `backend/prisma/migrations`) deve executar `pnpm --dir backend db:migrate` na própria execução. O usuário não-dev não deve ficar responsável por aplicar migrations.
- Uma migration local aprovada não autoriza alteração destrutiva em dados publicados. Colunas inicialmente obrigatórias devem entrar nullable ou com default compatível, receber backfill seguro e ser endurecidas somente em deploy posterior.
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
| 41 | [TASK-41 - Páginas legais públicas: Termos de Serviço e Política de Privacidade](TASK-41-paginas-legais-termos-privacidade.md) | Blocked | 39, 40 |
| 42 | [TASK-42 - Layout de compartilhamento social para vídeo-resposta](TASK-42-layout-compartilhamento-video-resposta.md) | Completed | 23, 26, 28, 29B |
| 43 | [TASK-43 - Scrollbar mobile app-like em telas principais](TASK-43-scrollbar-mobile-telas-principais.md) | Completed | 12, 23, 25, 40 |
| 44 | [TASK-44 - Verificação de registro retomável no fluxo pago](TASK-44-verificacao-registro-assinatura-retomavel.md) | Completed | 10, 16, 18A, 31, 32 |
| 45 | [TASK-45 - Fundação backend do Admin](TASK-45-fundacao-backend-admin.md) | Completed | 34, 44 |
| 46 | [TASK-46 - Aplicação Admin separada e shell lateral](TASK-46-app-admin-shell-lateral.md) | Completed | 45 |
| 47 | [TASK-47 - Captura de sessão e tipo de dispositivo para analytics admin](TASK-47-captura-sessao-tipo-dispositivo.md) | Completed | 39 |
| 48 | [TASK-48 - Dashboard administrativo](TASK-48-dashboard-administrativo.md) | Completed | 45, 46, 47 |
| 49 | [TASK-49 - Tracking de pageviews e origem de tráfego](TASK-49-tracking-pageviews-origem-trafego.md) | Completed | 39, 40, 47 |
| 50 | [TASK-50 - Tela Tráfego administrativo](TASK-50-tela-trafego-administrativo.md) | Completed | 45, 46, 47, 49 |
| 51 | [TASK-51 - Dashboard administrativo de comunidades](TASK-51-dashboard-administrativo-comunidades.md) | Completed | 45, 46 |
| 52 | [TASK-52 - Detalhe e edição de comunidade no Admin](TASK-52-detalhe-edicao-comunidade-admin.md) | Completed | 45, 46, 51 |
| 53 | [TASK-53 - Dashboard administrativo de psicólogos](TASK-53-dashboard-administrativo-psicologos.md) | Completed | 45, 46 |
| 54 | [TASK-54 - Lista administrativa de psicólogos](TASK-54-lista-administrativa-psicologos.md) | Completed | 45, 46, 53 |
| 55 | [TASK-55 - Detalhe administrativo do psicólogo: Geral e Perfil/Cadastro](TASK-55-detalhe-psicologo-geral-perfil-admin.md) | Completed | 45, 46, 54 |
| 56 | [TASK-56 - Detalhe administrativo do psicólogo: Plano, pagamentos e cortesia](TASK-56-detalhe-psicologo-plano-pagamentos-admin.md) | Completed | 45, 46, 55, 31A, 31C, 32, 33 |
| 57 | [TASK-57 - Detalhe administrativo do psicólogo: Estatísticas e publicações](TASK-57-detalhe-psicologo-estatisticas-publicacoes-admin.md) | Completed | 45, 46, 55 |
| 58 | [TASK-58 - Detalhe administrativo do psicólogo: Avaliações e denúncias](TASK-58-detalhe-psicologo-avaliacoes-denuncias-admin.md) | Completed | 45, 46, 55 |
| 59 | [TASK-59 - Detalhe administrativo do psicólogo: Atividades simples](TASK-59-detalhe-psicologo-atividades-admin.md) | Completed | 45, 46, 55, 57, 58 |
| 60 | [TASK-60 - Dashboard administrativo de pacientes](TASK-60-dashboard-administrativo-pacientes.md) | Completed | 45, 46 |
| 61 | [TASK-61 - Detalhe administrativo do paciente](TASK-61-detalhe-administrativo-paciente.md) | Completed | 45, 46, 60 |
| 62 | [TASK-62 - Financeiro administrativo](TASK-62-financeiro-administrativo.md) | Completed | 45, 46, 31, 32, 33 |
| 63 | [TASK-63 - Fundação de campanhas e logs de notificações Admin](TASK-63-fundacao-campanhas-logs-notificacoes-admin.md) | Completed | 29A, 29B, 38, 45 |
| 64 | [TASK-64 - Tela administrativa de notificações](TASK-64-tela-administrativa-notificacoes.md) | Completed | 45, 46, 63 |
| 65 | [TASK-65 - Configurações administrativas de catálogos e filtros](TASK-65-configuracoes-admin-catalogos-filtros.md) | Completed | 45, 46, 13, 18A |
| 66 | [TASK-66 - Verificação manual de CRP e origem genérica de verificação profissional](TASK-66-verificacao-manual-crp-admin.md) | Completed | 10, 44, 45, 46, 54, 55 |
| 67 | [TASK-67 - Edição administrativa auditada de dados pessoais e profissionais do psicólogo](TASK-67-edicao-admin-dados-pessoais-profissionais-psicologo.md) | Completed | 45, 46, 55, 59, 65, 66 |
| 68 | [TASK-68 - Conta e acesso do psicólogo no Admin](TASK-68-conta-acesso-psicologo-admin.md) | Completed | 05, 06, 30, 45, 46, 55, 58, 59, 67 |
| 69 | [TASK-69 - Nome profissional separado para WhatsApp do psicólogo](TASK-69-nome-profissional-whatsapp-psicologo.md) | Completed | 09, 16, 18A, 30 |
| 70 | [TASK-70 - Resolução administrativa de denúncias recebidas](TASK-70-resolucao-denuncias-recebidas-admin.md) | Completed | 23, 24, 26, 45, 46, 55, 58, 59, 67 |
| 71 | [TASK-71 - Abas administrativas da comunidade, conteúdo e ranking completo](TASK-71-admin-comunidade-abas-conteudo-ranking.md) | Completed | 23, 24, 26, 27, 45, 46, 51, 52, 67, 70 |
| 72 | [TASK-72 - Métricas de conversão e uso da plataforma por psicólogos no Admin](TASK-72-metricas-conversao-uso-plataforma-psicologos-admin.md) | Completed | 09, 31, 32, 33, 45, 46, 47, 49, 53, 55, 56, 57, 62 |
| 73 | [TASK-73 - Ações administrativas de conta do psicólogo](TASK-73-acoes-conta-psicologo-admin.md) | Completed | 45, 46, 55, 68 |
| 74 | [TASK-74 - Moderação textual simples e alertas Admin para conteúdo sensível de pacientes](TASK-74-moderacao-textual-alertas-admin-conteudo-sensivel-pacientes.md) | Completed | 24, 26, 45, 46, 51, 63, 64, 70, 71 |
| 75 | [TASK-75 - Detalhe analítico administrativo de conteúdo e retenção de vídeo](TASK-75-detalhe-analytics-conteudo-admin.md) | Completed | 23, 24, 26, 40, 42, 45, 46, 49, 51, 57, 71, 72, 74 |
| 76 | [TASK-76 - Ajuste dos filtros de periodo do Admin](TASK-76-ajuste-filtros-periodo-admin.md) | Completed | 46, 48, 51, 53, 57, 58, 59, 60, 61, 71 |
| 77 | [TASK-77 - Central de moderação e alertas operacionais Admin](TASK-77-central-moderacao-alertas-operacionais-admin.md) | Completed | 45, 46, 57, 70, 74 |
| 78 | [TASK-78 - Indicador de urgência no menu lateral da moderação Admin](TASK-78-indicador-urgencia-menu-moderacao-admin.md) | Completed | 46, 77 |
| 79 | [TASK-79 - Sessões por device no detalhe administrativo](TASK-79-sessoes-por-device-detalhe-admin.md) | Completed | 47, 57, 61, 72 |
| 80 | [TASK-80 - Confiabilidade do pagamento nas assinaturas Admin](TASK-80-saude-pagamento-assinaturas-admin.md) | Completed | 45, 46, 56, 62 |
| 81 | [TASK-81 - Sistema operacional nos analytics Admin](TASK-81-sistema-operacional-analytics-admin.md) | Completed | 47, 53, 57, 60, 61, 79 |
| 82 | [TASK-82 - Filtro Cortesia no dashboard Admin de psicologos](TASK-82-filtro-cortesia-dashboard-psicologos-admin.md) | Completed | 53, 72, 81 |
| 83 | [TASK-83 - Erro no cadastro em Operacionais Admin](TASK-83-erro-cadastro-operacionais-admin.md) | Completed | 45, 46, 77, 78 |
| 84 | [TASK-84 - Conversão no dashboard Admin de psicologos](TASK-84-conversao-dashboard-psicologos-admin.md) | Completed | 53, 72, 76, 82 |
| 85 | [TASK-85 - Trilha pre-cadastro dos pacientes no dashboard Admin](TASK-85-conversao-uso-anonimo-cadastro-pacientes-admin.md) | Completed | 45, 46, 47, 49, 60, 76, 81 |
| 86 | [TASK-86 - Trilha pre-cadastro dos psicologos no dashboard Admin](TASK-86-trilha-pre-cadastro-psicologos-admin.md) | Completed | 45, 46, 47, 49, 53, 72, 76, 81, 85 |
| 87 | [TASK-87 - Padronizar graficos de donut no Admin](TASK-87-admin-graficos-donut.md) | Completed | 46, 51, 53, 60, 61, 79, 84 |
| 88 | [TASK-88 - Seletor de conversao no titulo e filtro de plano na trilha pre-cadastro dos psicologos Admin](TASK-88-seletor-conversao-titulo-filtro-plano-psicologos-admin.md) | Completed | 53, 72, 82, 86 |
| 89 | [TASK-89 - Comparativo Conversão x Engajamento no dashboard Admin de psicologos](TASK-89-conversao-engajamento-dashboard-psicologos-admin.md) | Completed | 53, 72, 84, 88 |
| 90 | [TASK-90 - Engajamento ponderado no Admin](TASK-90-engajamento-ponderado-admin.md) | Completed | 53, 54, 60, 89 |
| 91 | [TASK-91 - Fluxo de intenção e conversão cruzada no Admin](TASK-91-fluxo-intencao-conversao-admin.md) | Completed | 48, 57, 60, 84, 89, 90 |
| 92 | [TASK-92 - Simplificação visual do fluxo de intenção e conversão no Dashboard Admin](TASK-92-simplificacao-fluxo-intencao-conversao-admin.md) | Completed | 91 |
| 93 | [TASK-93 - Refinamento do alinhamento visual do fluxo de intencao e conversao no Dashboard Admin](TASK-93-refino-alinhamento-exemplo-fluxo-intencao-conversao-admin.md) | Completed | 92 |
| 94 | [TASK-94 - Remocao do bloco Fluxo de intencao e conversao no Dashboard Admin](TASK-94-remocao-bloco-fluxo-intencao-conversao-dashboard-admin.md) | Completed | 93 |
| 95 | [TASK-95 - Análise de qualidade da conversão no perfil Admin do psicólogo](TASK-95-analise-qualidade-conversao-perfil-psicologo-admin.md) | Completed | 57, 84, 89 |
| 96 | [TASK-96 - Engajamento e Favoritos no dashboard Admin de psicólogos](TASK-96-engajamento-favoritos-dashboard-psicologos-admin.md) | Completed | 53, 84, 89, 90 |
| 97 | [TASK-97 - Visibilidade Comunidade x Video no dashboard Admin de psicologos](TASK-97-visibilidade-comunidade-video-dashboard-psicologos-admin.md) | Completed | 53, 84, 87, 89, 96 |
| 98 | [TASK-98 - Ajuste de tamanho dos graficos e matriz no dashboard Admin de psicologos](TASK-98-ajuste-tamanho-graficos-matriz-dashboard-psicologos-admin.md) | Completed | 53, 87, 89, 96, 97 |
| 99 | [TASK-99 - Manter tres graficos lado a lado no funil Admin de psicologos](TASK-99-tres-graficos-lado-a-lado-funil-psicologos-admin.md) | Completed | 53, 87, 96, 97, 98 |
| 100 | [TASK-100 - Matrizes Conversao x Engajamentos/Favoritos e Visibilidade no Admin de psicologos](TASK-100-matrizes-conversao-engajamentos-favoritos-visibilidade-admin.md) | Completed | 53, 84, 96, 97, 99 |
| 101 | [TASK-101 - Label Video sem view na matriz Conversao x Visibilidade do Admin](TASK-101-label-video-sem-view-visibilidade-admin.md) | Completed | 53, 97, 100 |
| 101A | [TASK-101A - Centralizacao dos textos nos blocos da matriz de conversao Admin](TASK-101A-centralizacao-textos-blocos-matriz-conversao-admin.md) | Completed | 53, 100, 101 |
| 102 | [TASK-102 - Distribuicao de cliques WhatsApp por psicologo no Dashboard Admin](TASK-102-distribuicao-cliques-whatsapp-dashboard-admin.md) | Completed | 16, 48, 76, 94 |
| 103 | [TASK-103 - Funil comportamental por conversao no Admin de psicologos](TASK-103-funil-comportamental-conversao-admin-psicologos.md) | Completed | 53, 100, 101A |
| 104 | [TASK-104 - Reorganizacao segura da aba Estatisticas do psicologo no Admin](TASK-104-reorganizacao-estatisticas-psicologo-admin.md) | Completed | 57, 72, 75, 76 |
| 105 | [TASK-105 - Seletor global de periodo nas estatisticas do psicologo Admin](TASK-105-seletor-global-periodo-estatisticas-psicologo-admin.md) | Completed | 57, 76, 104 |
| 106 | [TASK-106 - Visibilidade temporal no contador principal do psicologo Admin](TASK-106-visibilidade-temporal-contador-psicologo-admin.md) | Completed | 57, 75, 104, 105 |
| 107 | [TASK-107 - Eixo direito de visibilidade e comparativos dos scores no psicologo Admin](TASK-107-eixo-direito-visibilidade-comparativos-scores-psicologo-admin.md) | Completed | 57, 104, 105, 106 |
| 108 | [TASK-108 - Bloco Visibilidade nas estatisticas do psicologo Admin](TASK-108-bloco-visibilidade-estatisticas-psicologo-admin.md) | Completed | 57, 75, 104, 105, 106, 107 |
| 109 | [TASK-109 - Copy dos contadores de Visibilidade do psicologo Admin](TASK-109-copy-contadores-visibilidade-psicologo-admin.md) | Completed | 108 |
| 110 | [TASK-110 - Formula de atividade por cobertura e video no psicologo Admin](TASK-110-formula-atividade-cobertura-video-psicologo-admin.md) | Completed | 57, 104, 105, 107, 108, 109 |
| 111 | [TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin](TASK-111-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md) | Completed | 57, 104, 105, 106, 107, 108, 109, 110 |
| 112 | [TASK-112 - Posicao media do video no Explorar no psicologo Admin](TASK-112-posicao-media-video-explorar-psicologo-admin.md) | Completed | 57, 104, 105, 111 |
| 113 | [TASK-113 - Tag de resultado no titulo de Visibilidade do psicologo Admin](TASK-113-tag-resultado-titulo-visibilidade-psicologo-admin.md) | Completed | 57, 95, 104, 105, 106, 108, 111, 112 |
| 114 | [TASK-114 - Tabela de trafego por WhatsApp no dashboard Admin de psicologos](TASK-114-tabela-trafego-whatsapp-dashboard-psicologos-admin.md) | Completed | 16, 27, 49, 53, 76 |
| 115 | [TASK-115 - Grupo Comunidades na tabela de trafego WhatsApp do Admin de psicologos](TASK-115-grupo-comunidades-tabela-trafego-whatsapp-psicologos-admin.md) | Completed | 53, 76, 114 |
| 116 | [TASK-116 - Grupos expansiveis na tabela de trafego WhatsApp do Admin de psicologos](TASK-116-grupos-expansiveis-trafego-whatsapp-psicologos-admin.md) | Completed | 53, 76, 114, 115 |
| 117 | [TASK-117 - Medias reais de analises das comunidades no trafego WhatsApp Admin](TASK-117-medias-reais-comunidades-trafego-whatsapp-psicologos-admin.md) | Completed | 53, 75, 76, 97, 108, 111, 114, 115, 116 |
| 118 | [TASK-118 - Copy de medias de engajamento nas sublinhas de Comunidades do trafego WhatsApp Admin](TASK-118-copy-medias-engajamento-comunidades-trafego-whatsapp-admin.md) | Completed | 53, 114, 115, 116, 117 |
| 119 | [TASK-119 - Label Tempo de permanencia nas metricas de Comunidades do trafego WhatsApp Admin](TASK-119-label-tempo-permanencia-comunidades-trafego-whatsapp-admin.md) | Completed | 53, 114, 115, 116, 117, 118 |
| 120 | [TASK-120 - Expansivo de Perfil com medias de engajamento no trafego WhatsApp Admin](TASK-120-expansivo-perfil-medias-engajamento-trafego-whatsapp-admin.md) | Completed | 53, 76, 114, 115, 116, 117, 118, 119 |
| 121 | [TASK-121 - Medias de engajamento no Video de apresentacao do trafego WhatsApp Admin](TASK-121-medias-engajamento-video-apresentacao-trafego-whatsapp-admin.md) | Completed | 53, 75, 76, 97, 114, 115, 116, 117, 118, 119, 120 |
| 122 | [TASK-122 - Quantidade considerada e carrossel dos donuts no Admin de psicologos](TASK-122-quantidade-considerada-titulos-trafego-whatsapp-admin.md) | Completed | 53, 75, 76, 114, 115, 116, 117, 118, 119, 120, 121 |
| 123 | [TASK-123 - Donut de Atividade no dashboard Admin de psicologos](TASK-123-donut-atividade-dashboard-psicologos-admin.md) | Completed | 53, 76, 87, 111, 122 |
| 124 | [TASK-124 - Reposicionamento da matriz no dashboard Admin de psicologos](TASK-124-reposicionamento-matriz-dashboard-psicologos-admin.md) | Completed | 53, 100, 101A, 103, 123 |
| 125 | [TASK-125 - Tabela comportamental por conversao no Admin de psicologos](TASK-125-tabela-comportamental-conversao-admin-psicologos.md) | Completed | 53, 100, 103, 123, 124 |
| 126 | [TASK-126 - Tags na tabela comportamental por conversao do Admin de psicologos](TASK-126-tags-tabela-comportamental-conversao-admin-psicologos.md) | Completed | 53, 100, 103, 123, 124, 125 |
| 127 | [TASK-127 - Matriz expansivel no funil comportamental por conversao do Admin de psicologos](TASK-127-matriz-expansivel-funil-comportamental-conversao-admin-psicologos.md) | Completed | 53, 100, 103, 124, 125, 126 |
| 128 | [TASK-128 - Ajustes de largura e copy da tabela comportamental por conversao Admin](TASK-128-ajustes-largura-copy-tabela-comportamental-conversao-admin.md) | Completed | 53, 103, 126, 127 |
| 129 | [TASK-129 - Eixos independentes na matriz de cruzamento de dados Admin](TASK-129-eixos-independentes-matriz-cruzamento-dados-admin-psicologos.md) | Completed | 53, 100, 123, 125, 127, 128 |
| 130 | [TASK-130 - Eixos adicionais na matriz de cruzamento de dados Admin](TASK-130-eixos-adicionais-matriz-cruzamento-dados-admin-psicologos.md) | Completed | 53, 100, 123, 125, 127, 128, 129 |
| 131 | [TASK-131 - Media de WhatsApp por linha no trafego Admin de psicologos](TASK-131-media-whatsapp-linhas-trafego-admin-psicologos.md) | Completed | 53, 76, 114, 115, 116, 117, 118, 119, 120, 121, 130 |
| 132 | [TASK-132 - Tags medias e cores na tabela comportamental Admin](TASK-132-tags-medias-cores-tabela-comportamental-admin-psicologos.md) | Completed | 53, 103, 126, 128, 130 |
| 133 | [TASK-133 - Tags de Perfil na tabela comportamental Admin](TASK-133-tags-perfil-tabela-comportamental-admin-psicologos.md) | Completed | 53, 103, 126, 128, 132 |
| 134 | [TASK-134 - Cobertura no dashboard e matriz Admin de psicologos](TASK-134-cobertura-dashboard-matriz-admin-psicologos.md) | Completed | 53, 123, 129, 130, 132 |
| 135 | [TASK-135 - Refino de medias e autoria nos cliques WhatsApp do trafego Admin](TASK-135-refino-medias-autoria-whatsapp-trafego-admin-psicologos.md) | Completed | 53, 76, 114, 115, 116, 117, 118, 119, 120, 121, 131, 134 |
| 136 | [TASK-136 - Ajustes finais da tabela comportamental Admin](TASK-136-copy-tags-video-perfil-tabela-comportamental-admin-psicologos.md) | Completed | 53, 103, 126, 132, 133 |
| 137 | [TASK-137 - Refino de layout dos donuts de indicadores Admin](TASK-137-refino-layout-donuts-indicadores-admin-psicologos.md) | Completed | 53, 87, 122, 123, 134 |
| 138 | [TASK-138 - Range de posição do vídeo na tabela comportamental Admin](TASK-138-range-posicao-video-tabela-comportamental-admin-psicologos.md) | Completed | 53, 103, 125, 126, 132, 136 |
| 139 | [TASK-139 - Meta de conversão no dashboard e matriz Admin de psicólogos](TASK-139-meta-conversao-dashboard-matriz-admin-psicologos.md) | Completed | 53, 95, 129, 137 |
| 140 | [TASK-140 - Visualização administrativa como usuário](TASK-140-visualizar-como-usuario-admin.md) | Completed | 45, 46, 61, 68, 73 |
| 141 | [TASK-141 - Configurações Admin de SEO e Metadados](TASK-141-configuracoes-admin-seo-metadados.md) | Completed | 39, 40, 45, 46, 65 |
| 142 | [TASK-142 - Visualização do valor atual do plano em Configurações Admin](TASK-142-visualizacao-plano-assinatura-admin.md) | Completed | 31, 45, 46, 62, 141 |
| 143 | [TASK-143 - Previa Open Graph Admin e SEO dinamico de posts](TASK-143-preview-og-admin-seo-dinamico-posts.md) | Completed | 39, 40, 42, 141 |
| 144 | [TASK-144 - Upload de imagem Open Graph no Admin](TASK-144-upload-imagem-open-graph-admin.md) | Completed | 141, 143 |
| 145 | [TASK-145 - Rotas em PT-BR e SEO canônico](TASK-145-rotas-publicas-pt-br-seo.md) | Completed | 40, 141, 143, 144 |
| 146 | [TASK-146 - Versionamento rastreável e promoção de produção por PR](TASK-146-versionamento-rastreavel-promocao-producao.md) | Completed | 34, 45, 145 |
| 147 | [TASK-147 - Confirmação antes de excluir post ou comentário](TASK-147-confirmacao-exclusao-post-comentario.md) | Completed | 26, 28, 145 |
| 148 | [TASK-148 - Safe area iOS/PWA para elementos inferiores](TASK-148-safe-area-ios-pwa-elementos-inferiores.md) | Completed | 12, 37, 43 |
| 149 | [TASK-149 - Sugestões de comunidades no Admin com blocos de demanda](TASK-149-admin-sugestoes-comunidades-blocos-demanda.md) | Completed | 22, 45, 46, 51, 77 |
| 150 | [TASK-150 - Localizacao declarada do paciente para proximidade](TASK-150-localizacao-declarada-paciente.md) | Completed | 02, 21, 60, 61 |
| 151 | [TASK-151 - Remover banner de localizacao opcional no perfil do paciente](TASK-151-remover-banner-localizacao-paciente.md) | Completed | 02, 21, 150 |
| 152 | [TASK-152 - Instalar aplicativo no perfil](TASK-152-instalar-aplicativo-no-perfil.md) | Completed | 12, 21, 37 |
| 153 | [TASK-153 - Permissao nativa direta de notificacoes](TASK-153-permissao-nativa-direta-notificacoes.md) | Completed | 12, 29A, 38 |
| 154 | [TASK-154 - Digests temporais para push de notificacoes](TASK-154-digests-temporais-push-notificacoes.md) | Completed | 29A, 29B, 38, 63 |
| 155 | [TASK-155 - Ocultar instalar aplicativo no desktop](TASK-155-ocultar-instalar-aplicativo-desktop.md) | Completed | 12, 21, 37, 152 |
| 156 | [TASK-156 - Regua de cobranca e regularizacao da assinatura](TASK-156-regua-cobranca-assinatura.md) | Completed | 32, 33, 63, 64, 80 |
| 157 | [TASK-157 - Upload multipart do vídeo de apresentação](TASK-157-upload-multipart-video-apresentacao.md) | Completed | 03, 18A, 26, 146 |
| 158 | [TASK-158 - Otimização client-side do vídeo de apresentação](TASK-158-otimizacao-video-apresentacao-mediabunny.md) | Completed | 18A, 146, 157 |
| 159 | [TASK-159 - Preparação transversal de mídia antes dos uploads](TASK-159-preparacao-transversal-midia-uploads.md) | Completed | 26, 144, 157, 158 |
| 160 | [TASK-160 - Limites em duas etapas para vídeos no Safari Photos](TASK-160-limites-video-safari-photos-opfs.md) | In Progress | 157, 158, 159 |

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
8. [TASK-41 - Páginas legais públicas: Termos de Serviço e Política de Privacidade](TASK-41-paginas-legais-termos-privacidade.md) foi adicionada em 2026-06-29 para publicar rotas legais públicas indexáveis com minutas em `_product/legal`, pendentes de aprovação do fundador e revisão jurídica antes da implementação.
9. [TASK-42 - Layout de compartilhamento social para vídeo-resposta](TASK-42-layout-compartilhamento-video-resposta.md) foi adicionada e concluída em 2026-06-30 para padronizar o SHARE de vídeo-respostas profissionais em formato social vertical e quadrado.
10. [TASK-43 - Scrollbar mobile app-like em telas principais](TASK-43-scrollbar-mobile-telas-principais.md) foi adicionada e concluída em 2026-07-01 para ocultar scrollbars visuais somente nos scrolls principais mobile/tablet de feed/comunidade e psicólogos, preservando desktop e containers internos.
11. [TASK-44 - Verificação de registro retomável no fluxo pago](TASK-44-verificacao-registro-assinatura-retomavel.md) foi adicionada e concluída em 2026-07-04 para diferenciar assinatura paga ativa de verificação CFP concluída, retomando `/app/profissional/cfp`, bloqueando edição do perfil profissional pago pendente e removendo selo de verificado baseado apenas em pagamento.
12. [TASK-45 - Fundação backend do Admin](TASK-45-fundacao-backend-admin.md) foi adicionada em 2026-07-08 para criar admin como audiência separada, sem `user.role="admin"`.
13. [TASK-46 - Aplicação Admin separada e shell lateral](TASK-46-app-admin-shell-lateral.md) foi adicionada em 2026-07-08 para iniciar o app `admin/` com login real e menu lateral.
14. [TASK-47 - Captura de sessão e tipo de dispositivo para analytics admin](TASK-47-captura-sessao-tipo-dispositivo.md) foi adicionada em 2026-07-08 porque o produto já tem `x-device`/localização, mas ainda não persiste `mobile`/`desktop`/`tablet`.
15. [TASK-48 - Dashboard administrativo](TASK-48-dashboard-administrativo.md) foi adicionada em 2026-07-08 para implementar o primeiro painel de visão geral com dados reais.
16. [TASK-49 - Tracking de pageviews e origem de tráfego](TASK-49-tracking-pageviews-origem-trafego.md) foi adicionada em 2026-07-08 para capturar origem, páginas de entrada e navegação real antes da tela Tráfego.
17. [TASK-50 - Tela Tráfego administrativo](TASK-50-tela-trafego-administrativo.md) foi adicionada em 2026-07-08 para implementar a aba Tráfego com dados reais, período e exportação honesta.
18. [TASK-51 - Dashboard administrativo de comunidades](TASK-51-dashboard-administrativo-comunidades.md) foi adicionada em 2026-07-08 para implementar a visão geral de atividade/alertas de comunidades com dados reais.
19. [TASK-52 - Detalhe e edição de comunidade no Admin](TASK-52-detalhe-edicao-comunidade-admin.md) foi adicionada em 2026-07-08 para editar nome, avatar, descrição, cores e regras persistidas de comunidades.
20. [TASK-53 - Dashboard administrativo de psicólogos](TASK-53-dashboard-administrativo-psicologos.md) foi adicionada em 2026-07-08 para implementar a visão executiva dos profissionais, sem botão de adicionar novo psicólogo e reutilizando o ranking público da descoberta.
21. [TASK-54 - Lista administrativa de psicólogos](TASK-54-lista-administrativa-psicologos.md) foi adicionada em 2026-07-08 para busca, filtros, paginação e ordenação administrativa com dados reais.
22. [TASK-55 - Detalhe administrativo do psicólogo: Geral e Perfil/Cadastro](TASK-55-detalhe-psicologo-geral-perfil-admin.md) foi adicionada em 2026-07-08 para criar o shell de detalhe e as abas iniciais somente leitura com cuidado LGPD.
23. [TASK-56 - Detalhe administrativo do psicólogo: Plano, pagamentos e cortesia](TASK-56-detalhe-psicologo-plano-pagamentos-admin.md) foi adicionada em 2026-07-08 para plano, histórico financeiro real e concessão de cortesia via Admin, sem simular gateway.
24. [TASK-57 - Detalhe administrativo do psicólogo: Estatísticas e publicações](TASK-57-detalhe-psicologo-estatisticas-publicacoes-admin.md) foi adicionada em 2026-07-08 para consolidar métricas reais de negócio, vídeo e publicações.
25. [TASK-58 - Detalhe administrativo do psicólogo: Avaliações e denúncias](TASK-58-detalhe-psicologo-avaliacoes-denuncias-admin.md) foi adicionada em 2026-07-08 com avaliações somente leitura e denúncias também somente leitura na V1.
26. [TASK-59 - Detalhe administrativo do psicólogo: Atividades simples](TASK-59-detalhe-psicologo-atividades-admin.md) foi adicionada em 2026-07-08 para um histórico simples e honesto dos principais eventos registrados do psicólogo.
27. [TASK-60 - Dashboard administrativo de pacientes](TASK-60-dashboard-administrativo-pacientes.md) foi adicionada em 2026-07-08 para visão geral simples de pacientes, sem bloqueio/silenciamento e sem retenção na V1.
28. [TASK-61 - Detalhe administrativo do paciente](TASK-61-detalhe-administrativo-paciente.md) foi adicionada em 2026-07-08 para detalhe somente leitura de engajamento e atividades do paciente, sem ações destrutivas.
29. [TASK-62 - Financeiro administrativo](TASK-62-financeiro-administrativo.md) foi adicionada em 2026-07-08 para visão financeira baseada em assinaturas pagas reais, com lista "Novas assinaturas de psicólogos" e exportação CSV.
30. [TASK-63 - Fundação de campanhas e logs de notificações Admin](TASK-63-fundacao-campanhas-logs-notificacoes-admin.md) foi adicionada em 2026-07-08 para sustentar campanhas manuais e logs automáticos com canais in-app/push, sem e-mail na V1.
31. [TASK-64 - Tela administrativa de notificações](TASK-64-tela-administrativa-notificacoes.md) foi adicionada em 2026-07-08 para o Admin criar notificações e acompanhar logs automáticos reais.
32. [TASK-65 - Configurações administrativas de catálogos e filtros](TASK-65-configuracoes-admin-catalogos-filtros.md) foi adicionada em 2026-07-08 para gerenciar filtros da busca/perfil, incluindo especialidades segmentadas por categorias persistidas.
33. [TASK-66 - Verificação manual de CRP e origem genérica de verificação profissional](TASK-66-verificacao-manual-crp-admin.md) foi adicionada em 2026-07-11 para permitir aprovação/rejeição manual auditada quando a API automática estiver instável, mantendo `cfp_verified_at` como evidência automática e `crp_status="aprovado"` como aprovação canônica de produto.
34. [TASK-67 - Edição administrativa auditada de dados pessoais e profissionais do psicólogo](TASK-67-edicao-admin-dados-pessoais-profissionais-psicologo.md) foi adicionada em 2026-07-11 para permitir correções administrativas em Dados pessoais (exceto e-mail) e Dados profissionais, com auditoria real e eventos visíveis na aba Atividades.
35. [TASK-68 - Conta e acesso do psicólogo no Admin](TASK-68-conta-acesso-psicologo-admin.md) foi adicionada em 2026-07-11 para centralizar suporte de conta após Denúncias, incluindo alteração administrativa de e-mail, reenvio de confirmação, link de redefinição e senha temporária auditada para contas com login por e-mail e senha.
36. [TASK-71 - Abas administrativas da comunidade, conteúdo e ranking completo](TASK-71-admin-comunidade-abas-conteudo-ranking.md) foi adicionada em 2026-07-13 para organizar o detalhe de comunidade em abas contextuais, permitir moderação auditada de posts/comentários e listar ranking completo de psicólogos participantes.
37. [TASK-72 - Métricas de conversão e uso da plataforma por psicólogos no Admin](TASK-72-metricas-conversao-uso-plataforma-psicologos-admin.md) foi adicionada em 2026-07-13 para medir conversão de cadastro até primeira assinatura paga, modo de cadastro Google/e-mail e uso first-party da plataforma por psicólogos no dashboard e no detalhe administrativo.
38. [TASK-73 - Ações administrativas de conta do psicólogo](TASK-73-acoes-conta-psicologo-admin.md) foi adicionada em 2026-07-14 para incluir, na aba **Conta** do detalhe administrativo do psicólogo, as ações auditadas **Suspender conta**, **Desativar conta** e **Excluir conta**, sem criar a opção rejeitada de restrição parcial.
39. [TASK-74 - Moderação textual simples e alertas Admin para conteúdo sensível de pacientes](TASK-74-moderacao-textual-alertas-admin-conteudo-sensivel-pacientes.md) foi adicionada em 2026-07-14 para bloquear links e padrões de alto risco em textos de pacientes, permitir relatos sensíveis legítimos e notificar o Admin sobre conteúdos sensíveis, bloqueados ou segurados por segurança.
40. [TASK-75 - Detalhe analítico administrativo de conteúdo e retenção de vídeo](TASK-75-detalhe-analytics-conteudo-admin.md) foi adicionada em 2026-07-18 para criar uma página Admin de detalhe por post/resposta com métricas reais, gráficos de evolução e retenção first-party de vídeo de conteúdo sem backfill ou estimativas falsas.
41. [TASK-76 - Ajuste dos filtros de periodo do Admin](TASK-76-ajuste-filtros-periodo-admin.md) foi adicionada e concluida em 2026-07-20 para remover `Personalizado` das opcoes selecionaveis de periodo, manter `Todo o periodo` como padrao e acionar o estado customizado apenas pela digitacao nos campos de data.
42. [TASK-77 - Central de moderação e alertas operacionais Admin](TASK-77-central-moderacao-alertas-operacionais-admin.md) foi adicionada e concluída em 2026-07-21 para reunir denúncias, CRP profissional pendente, WhatsApp inválido, perfis não publicados por configurações obrigatórias, posts de pacientes sem cobertura após 48h e psicólogos profissionais sem conversão após adaptação na central `/moderacao`, sem implementar dimensões de região/preço/horário que não se aplicam no momento.
43. [TASK-78 - Indicador de urgência no menu lateral da moderação Admin](TASK-78-indicador-urgencia-menu-moderacao-admin.md) foi adicionada e concluída em 2026-07-21 para trocar o badge neutro da opção **Moderação** por um indicador com ícone de alerta vermelho quando houver urgência e laranja quando houver apenas pendências menos urgentes.
44. [TASK-79 - Sessões por device no detalhe administrativo](TASK-79-sessoes-por-device-detalhe-admin.md) foi concluída em 2026-07-22 para levar aos detalhes individuais de psicólogo e paciente a mesma lógica real dos dashboards: distribuição de sessões autenticadas por `visitor_session.device_type` no período, sem medir device principal por usuário, com **Páginas mais acessadas** e **Devices** em duas colunas no desktop e pie chart em **Devices**.
45. [TASK-80 - Confiabilidade do pagamento nas assinaturas Admin](TASK-80-saude-pagamento-assinaturas-admin.md) foi concluída em 2026-07-22 para adicionar uma coluna resumida de **Confiabilidade do pagamento** em `/financeiro/assinaturas` e dropdown por assinatura com histórico real de `payment_event`, mantendo a tag em uma linha e sem simular cobranças.
45A. [TASK-62 - Financeiro administrativo](TASK-62-financeiro-administrativo.md) recebeu ajuste pós-feedback em 2026-08-13 para conciliar `/financeiro/cobrancas`, cards/série e LTV médio com o resumo real de assinaturas do Mercado Pago quando o webhook local `payment_event` não foi gravado, sem criar cobranças artificiais e evitando interpretar IDs do gateway como valores.
46. [TASK-81 - Sistema operacional nos analytics Admin](TASK-81-sistema-operacional-analytics-admin.md) foi adicionada e concluida em 2026-07-25 para exibir graficos de pizza de OS nos dashboards de psicologos/pacientes e detalhar os sistemas operacionais dentro de cada device nas abas de estatisticas individuais, usando `visitor_session.os` + `visitor_session.device_type`, sem versao exata, user-agent bruto, backfill ou estimativas.
47. [TASK-82 - Filtro Cortesia no dashboard Admin de psicologos](TASK-82-filtro-cortesia-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-25 para separar nos filtros por plano dos blocos de `/psicologos` o recorte de cortesia administrativa (`professional_subscription.source="admin_grant"`), mantendo **Assinantes** restrito a pagamentos Mercado Pago e **Todos** como agregado completo.
48. [TASK-83 - Erro no cadastro em Operacionais Admin](TASK-83-erro-cadastro-operacionais-admin.md) foi adicionada e concluida em 2026-07-25 para listar em `/moderacao/operacionais` cadastros de pacientes e psicologos ativos ainda nao confirmados (`user.confirmed=false`), exibindo modo de cadastro e e-mail, com remocao automatica quando a confirmacao real conclui.
49. [TASK-84 - Conversão no dashboard Admin de psicologos](TASK-84-conversao-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-25 para exibir no dashboard `/psicologos` a classificacao agregada **Conversão** com grafico de pizza, usando WhatsApp, aberturas de perfil e favoritos reais na janela temporal selecionada, sem ranking publico ou punicao.
50. [TASK-85 - Trilha pre-cadastro dos pacientes no dashboard Admin](TASK-85-conversao-uso-anonimo-cadastro-pacientes-admin.md) foi revisada e concluida em 2026-07-27 para exibir no dashboard `/pacientes` uma leitura backward dos pacientes cadastrados no periodo, buscando trilha anonima previa pelo mesmo `visitor_id`, sem incluir psicologos ou visitantes que nunca viraram paciente e sem mock, backfill, tracking novo ou identificacao cross-device.
51. [TASK-86 - Trilha pre-cadastro dos psicologos no dashboard Admin](TASK-86-trilha-pre-cadastro-psicologos-admin.md) foi adicionada e concluida em 2026-07-27 para permitir alternar o card **Conversao do cadastro ate assinatura** em `/psicologos` para **Conversao ate o cadastro**, medindo a trilha anonima previa do psicologo ate criar conta pelo `visitor_id` persistido no cadastro.
52. [TASK-88 - Seletor de conversao no titulo e filtro de plano na trilha pre-cadastro dos psicologos Admin](TASK-88-seletor-conversao-titulo-filtro-plano-psicologos-admin.md) foi adicionada e concluida em 2026-07-27 para mover o seletor de jornada para o proprio titulo do card e reservar o canto superior direito da visualizacao **Conversao ate o cadastro** para o filtro por plano **Todos / Assinantes / Gratuitos / Cortesia**.
53. [TASK-89 - Comparativo Conversão x Engajamento no dashboard Admin de psicologos](TASK-89-conversao-engajamento-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-28 para cruzar, de forma observacional, conversão agregada com envolvimento real dos psicologos nas comunidades.
54. [TASK-60 - Dashboard administrativo de pacientes](TASK-60-dashboard-administrativo-pacientes.md) recebeu ajuste complementar em 2026-07-29 para tornar os quadrantes de **Intencao x Engajamento** acionaveis, navegando para `/pacientes/lista?intent_engagement=...` com filtro composto real.
55. [TASK-93 - Refinamento do alinhamento visual do fluxo de intencao e conversao no Dashboard Admin](TASK-93-refino-alinhamento-exemplo-fluxo-intencao-conversao-admin.md) foi adicionada e concluida em 2026-07-29 para reordenar pacientes de Qualificados a Frios, alinhar pontas das setas aos blocos e permitir numeros de exemplo somente em localhost quando a API nao retorna pares reais.
56. [TASK-94 - Remocao do bloco Fluxo de intencao e conversao no Dashboard Admin](TASK-94-remocao-bloco-fluxo-intencao-conversao-dashboard-admin.md) foi adicionada e concluida em 2026-07-29 para remover o bloco de `/dashboard`, mantendo o contrato backend por compatibilidade e a tela executiva sem exemplo visual local.
57. [TASK-95 - Análise de qualidade da conversão no perfil Admin do psicólogo](TASK-95-analise-qualidade-conversao-perfil-psicologo-admin.md) foi adicionada e concluida em 2026-07-29 para separar, no perfil individual, qualidade absoluta normalizada para 30 dias e posição relativa contra a mediana da plataforma, mantendo o dashboard `/psicologos` simples.
58. [TASK-96 - Engajamento e Favoritos no dashboard Admin de psicologos](TASK-96-engajamento-favoritos-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-29 para classificar psicologos em 16 combinacoes entre relacionamento comunitario recebido e favoritos, mantendo o donut executivo resumido e expansivel.
59. [TASK-97 - Visibilidade Comunidade x Video no dashboard Admin de psicologos](TASK-97-visibilidade-comunidade-video-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-30 para classificar psicologos em 16 combinacoes entre visibilidade comunitaria e video de apresentacao, mantendo o donut executivo resumido e expansivel.
60. [TASK-98 - Ajuste de tamanho dos graficos e matriz no dashboard Admin de psicologos](TASK-98-ajuste-tamanho-graficos-matriz-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-30 para conter os donuts executivos e restaurar a grade compacta da matriz Conversao x Engajamento.
61. [TASK-99 - Manter tres graficos lado a lado no funil Admin de psicologos](TASK-99-tres-graficos-lado-a-lado-funil-psicologos-admin.md) foi adicionada e concluida em 2026-07-30 para restaurar o formato desktop com Visibilidade, Engajamento/Favoritos e Conversao na mesma linha.
62. [TASK-100 - Matrizes Conversao x Engajamentos/Favoritos e Visibilidade no Admin de psicologos](TASK-100-matrizes-conversao-engajamentos-favoritos-visibilidade-admin.md) foi adicionada e concluida em 2026-07-30 para trocar o bloco Conversao x Engajamento por uma matriz alternavel entre Conversao x Engajamentos/Favoritos e Conversao x Visibilidade, ambas com 16 colunas e sem contadores laterais.
63. [TASK-101 - Label Video sem view na matriz Conversao x Visibilidade do Admin](TASK-101-label-video-sem-view-visibilidade-admin.md) foi adicionada e concluida em 2026-07-30 para trocar **Sem Video** por **Vídeo sem view** na categoria `no_video`, mantendo o contrato tecnico e a regra de calculo.
64. [TASK-101A - Centralizacao dos textos nos blocos da matriz de conversao Admin](TASK-101A-centralizacao-textos-blocos-matriz-conversao-admin.md) foi adicionada e concluida em 2026-07-30 para centralizar os valores e descricoes dentro das celulas das matrizes Conversao x Engajamentos/Favoritos e Conversao x Visibilidade.
65. [TASK-27 - Ranking Top Mentores](TASK-27-ranking-top-mentores.md) recebeu complemento em 2026-07-30 para recalibrar a formula de score: upvotes `x2`, comentarios `x5`, compartilhamentos `x8`, salvamentos `x2`, cobertura de respostas `x3`, exclusao de autointeracoes no proprio conteudo e manutencao da penalidade progressiva.
65. [TASK-102 - Distribuicao de cliques WhatsApp por psicologo no Dashboard Admin](TASK-102-distribuicao-cliques-whatsapp-dashboard-admin.md) foi adicionada e concluida em 2026-07-30 para exibir em `/dashboard`, abaixo da **Visao geral**, a curva acumulada e os shares de Top 10%/Top 20% dos cliques reais de WhatsApp entre psicologos ativos e publicados.
66. [TASK-103 - Funil comportamental por conversao no Admin de psicologos](TASK-103-funil-comportamental-conversao-admin-psicologos.md) foi adicionada e concluida em 2026-07-30 para sintetizar as matrizes Conversao x Visibilidade e Conversao x Engajamentos/Favoritos em um funil observacional por categoria de conversao.
67. [TASK-96 - Engajamento e Favoritos no dashboard Admin de psicologos](TASK-96-engajamento-favoritos-dashboard-psicologos-admin.md) recebeu ajuste complementar em 2026-07-30 para manter voto positivo com peso `1` e elevar compartilhamento recebido para peso `8` no score comunitario do Admin.
68. [TASK-102 - Distribuicao de cliques WhatsApp por psicologo no Dashboard Admin](TASK-102-distribuicao-cliques-whatsapp-dashboard-admin.md) recebeu ajuste complementar em 2026-07-30 para separar titulos e numeros dos eixos, remover o resumo textual visivel do card de WhatsApp e posicionar os contadores a direita do grafico em desktop.
69. [TASK-103 - Funil comportamental por conversao no Admin de psicologos](TASK-103-funil-comportamental-conversao-admin-psicologos.md) recebeu ajuste complementar em 2026-07-30 para ficar abaixo da **Visao geral**, remover o filtro local de plano, remover o texto explicativo longo e trocar o icone do titulo por funil.
70. [TASK-104 - Reorganizacao segura da aba Estatisticas do psicologo no Admin](TASK-104-reorganizacao-estatisticas-psicologo-admin.md) foi adicionada e concluida em 2026-07-30 para reorganizar a aba Estatisticas do detalhe do psicologo preservando blocos existentes e trocando as opcoes principais para Conversao, Visibilidade, Engajamento e Atividade sem backend novo.
71. [TASK-105 - Seletor global de periodo nas estatisticas do psicologo Admin](TASK-105-seletor-global-periodo-estatisticas-psicologo-admin.md) foi adicionada e concluida em 2026-07-30 para aplicar uma unica janela de periodo a todos os blocos da aba Estatisticas do detalhe do psicologo.
72. [TASK-106 - Visibilidade temporal no contador principal do psicologo Admin](TASK-106-visibilidade-temporal-contador-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para trocar o contador Visibilidade do detalhe Admin do psicologo de eventos para duracao temporal real em segundos.
73. [TASK-107 - Eixo direito de visibilidade e comparativos dos scores no psicologo Admin](TASK-107-eixo-direito-visibilidade-comparativos-scores-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para separar Visibilidade temporal em eixo direito no grafico principal e completar os comparativos dos scores de Engajamento e Atividade.
74. [TASK-108 - Bloco Visibilidade nas estatisticas do psicologo Admin](TASK-108-bloco-visibilidade-estatisticas-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para inserir, apos Conversao, um bloco de visibilidade com barras empilhadas temporais, curva da soma e contadores reais de visualizacoes/aberturas.
75. [TASK-109 - Copy dos contadores de Visibilidade do psicologo Admin](TASK-109-copy-contadores-visibilidade-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para refinar os labels dos contadores de views de video e conteudo na comunidade no bloco Visibilidade.
76. [TASK-110 - Formula de atividade por cobertura e video no psicologo Admin](TASK-110-formula-atividade-cobertura-video-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para trocar o score de Atividade para posts criados mais cobertura de posts de pacientes respondidos, com peso maior para respostas em video.
77. [TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin](TASK-111-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para incluir Visibilidade temporal, Taxa de cobertura, periodo selecionado, tags de atividade/engajamento e trocar Atividade de score ponderado para acoes brutas.
78. [TASK-112 - Posicao media do video no Explorar no psicologo Admin](TASK-112-posicao-media-video-explorar-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para mover o bloco de video apos Atividade e engajamento e exibir a posicao media real no Explorar com comparativo de subida/descida.
79. [TASK-113 - Tag de resultado no titulo de Visibilidade do psicologo Admin](TASK-113-tag-resultado-titulo-visibilidade-psicologo-admin.md) foi adicionada e concluida em 2026-07-31 para trocar a tag fixa Unidade: tempo pelo diagnostico real Alta/Baixa/Sem/Padrao Visibilidade no titulo do bloco Visibilidade.
80. [TASK-114 - Tabela de trafego por WhatsApp no dashboard Admin de psicologos](TASK-114-tabela-trafego-whatsapp-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-31 para transformar a tabela Origem do trafego em uma leitura de cliques WhatsApp por superficie, com Perfil como linha, sem Link direto e Comunidades detalhadas.
81. [TASK-115 - Grupo Comunidades na tabela de trafego WhatsApp do Admin de psicologos](TASK-115-grupo-comunidades-tabela-trafego-whatsapp-psicologos-admin.md) foi adicionada e concluida em 2026-07-31 para agrupar Comunidades em um bloco unico com somatorio e detalhes subordinados na tabela de trafego dos psicologos.
82. [TASK-116 - Grupos expansiveis na tabela de trafego WhatsApp do Admin de psicologos](TASK-116-grupos-expansiveis-trafego-whatsapp-psicologos-admin.md) foi adicionada e concluida em 2026-07-31 para recolher/expandir Comunidades e Video de apresentacao, agrupando Explorar e Busca e filtros sob o novo bloco agregado.
83. [TASK-117 - Medias reais de analises das comunidades no trafego WhatsApp Admin](TASK-117-medias-reais-comunidades-trafego-whatsapp-psicologos-admin.md) foi adicionada e concluida em 2026-07-31 para exibir medias reais por conteudo nas sublinhas de Comunidades, trocar Tempo total assistido por Visibilidade media e preservar Ranking Top Mentores como descricao.
84. [TASK-118 - Copy de medias de engajamento nas sublinhas de Comunidades do trafego WhatsApp Admin](TASK-118-copy-medias-engajamento-comunidades-trafego-whatsapp-admin.md) foi adicionada e concluida em 2026-07-31 para explicar os valores medios de engajamento abaixo dos titulos e encurtar os chips Retencao/Visibilidade.
85. [TASK-119 - Label Tempo de permanencia nas metricas de Comunidades do trafego WhatsApp Admin](TASK-119-label-tempo-permanencia-comunidades-trafego-whatsapp-admin.md) foi adicionada e concluida em 2026-07-31 para trocar o chip Visibilidade por Tempo de permanencia nas metricas de Comunidades, mantendo calculos e ids tecnicos.
86. [TASK-120 - Expansivo de Perfil com medias de engajamento no trafego WhatsApp Admin](TASK-120-expansivo-perfil-medias-engajamento-trafego-whatsapp-admin.md) foi adicionada e concluida em 2026-07-31 para transformar Perfil em expansivo com medias reais de engajamento dentro do perfil e tracking futuro das abas Publicacoes/Avaliacoes.
87. [TASK-121 - Medias de engajamento no Video de apresentacao do trafego WhatsApp Admin](TASK-121-medias-engajamento-video-apresentacao-trafego-whatsapp-admin.md) foi adicionada e concluida em 2026-07-31 para exibir medias reais de engajamento nas sublinhas Explorar e Busca e filtros do grupo Video de apresentacao.
88. [TASK-122 - Quantidade considerada e carrossel dos donuts no Admin de psicologos](TASK-122-quantidade-considerada-titulos-trafego-whatsapp-admin.md) foi adicionada e concluida em 2026-07-31 para exibir, ao lado dos titulos das categorias com medias, quantos conteudos, perfis ou videos foram considerados e ajustar os donuts para carrossel com setas laterais, padrao da plataforma e espacamento equilibrado.
89. [TASK-123 - Donut de Atividade no dashboard Admin de psicologos](TASK-123-donut-atividade-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-31 para incluir Atividade como primeiro donut do carrossel de sinais agregados dos psicologos, usando acoes reais de posts e respostas no periodo.
90. [TASK-124 - Reposicionamento da matriz no dashboard Admin de psicologos](TASK-124-reposicionamento-matriz-dashboard-psicologos-admin.md) foi adicionada e concluida em 2026-07-31 para mover a matriz do funil para o bloco de sinais agregados dos psicologos, mantendo dados reais e filtro de plano do bloco.
91. [TASK-125 - Tabela comportamental por conversao no Admin de psicologos](TASK-125-tabela-comportamental-conversao-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para substituir o funil comportamental por uma tabela Conversao x comportamento com colunas de Video de apresentacao, Comunidades, Atividades, Engajamento e Favoritado usando dados reais.
92. [TASK-126 - Tags na tabela comportamental por conversao do Admin de psicologos](TASK-126-tags-tabela-comportamental-conversao-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para transformar as celulas em tags comportamentais, adicionar Perfil, consolidar Atividades/Engajamento dentro de Comunidade e tratar Tela de favoritos como origem de cliques WhatsApp por psicologo.
93. [TASK-127 - Matriz expansivel no funil comportamental por conversao do Admin de psicologos](TASK-127-matriz-expansivel-funil-comportamental-conversao-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para mover a matriz expansivel para dentro do bloco Funil comportamental por conversao, deixando o bloco de sinais agregados apenas com os donuts.
94. [TASK-128 - Ajustes de largura e copy da tabela comportamental por conversao Admin](TASK-128-ajustes-largura-copy-tabela-comportamental-conversao-admin.md) foi adicionada e concluida em 2026-08-01 para remover a rolagem horizontal da tabela comportamental, simplificar textos auxiliares e renomear a matriz para Matriz de cruzamento de dados.
95. [TASK-129 - Eixos independentes na matriz de cruzamento de dados Admin](TASK-129-eixos-independentes-matriz-cruzamento-dados-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para substituir o seletor unico por campos **Linha** e **Coluna**, criando `profile_cross_matrix` agregado para cruzar Conversao, Atividade, Engajamento, Favoritados, Visibilidade, Retencao de video e Posts com video sem mocks.
96. [TASK-130 - Eixos adicionais na matriz de cruzamento de dados Admin](TASK-130-eixos-adicionais-matriz-cruzamento-dados-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para ampliar os seletores Linha/Coluna com Formato de conteudo, Abertura de perfil, Avaliacoes e Posicao video de apresentacao, alem de renomear Atividade/Engajamento para comunidade.
97. [TASK-131 - Media de WhatsApp por linha no trafego Admin de psicologos](TASK-131-media-whatsapp-linhas-trafego-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para exibir abaixo do total de WhatsApp a media por conteudo, video ou psicologo de cada linha da tabela de origem do trafego.
98. [TASK-132 - Tags medias e cores na tabela comportamental Admin](TASK-132-tags-medias-cores-tabela-comportamental-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para transformar as tags da tabela comportamental em leituras medias/padrao, com Cliques WhatsApp em primeiro lugar e cores por desempenho.
99. [TASK-133 - Tags de Perfil na tabela comportamental Admin](TASK-133-tags-perfil-tabela-comportamental-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para incluir Permanencia, Aba Avaliacoes, Aba Conteudo, Views video e Retencao video na coluna Perfil, removendo a tag visivel de aba predominante.
100. [TASK-134 - Cobertura no dashboard e matriz Admin de psicologos](TASK-134-cobertura-dashboard-matriz-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para incluir Cobertura como card agregado e eixo da matriz de cruzamento, usando posts unicos de pacientes respondidos por psicologo.
101. [TASK-135 - Refino de medias e autoria nos cliques WhatsApp do trafego Admin](TASK-135-refino-medias-autoria-whatsapp-trafego-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para mover a media de WhatsApp para junto da base considerada e separar cliques de autor/outros usuarios em posts e respostas.
102. [TASK-136 - Ajustes finais da tabela comportamental Admin](TASK-136-copy-tags-video-perfil-tabela-comportamental-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para ajustar titulo, subtitulo, Favoritos, titulos no padrao de tabela Admin, largura/alinhamento de Favoritos, copy `X (X%) psicologos` e `X (X%) cliques WhatsApp, em media X por psicologo` em linhas separadas na coluna Conversao, copy de Views, troca de Cliques WhatsApp por WhatsApp nas tags, no-wrap em Favoritos, nome do plano predominante sem prefixo em Perfil, remocao da tag WhatsApp/abertura em Perfil e tags de acoes do video.
103. [TASK-137 - Refino de layout dos donuts de indicadores Admin](TASK-137-refino-layout-donuts-indicadores-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para encurtar o titulo dos indicadores, reordenar os donuts para iniciar por Conversao, padronizar a largura dos cards e refinar visualmente donut, padrao e legenda.
104. [TASK-138 - Range de posição do vídeo na tabela comportamental Admin](TASK-138-range-posicao-video-tabela-comportamental-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para trocar a tag visual `Posição média: Xª` por `Posição: Top 10/Top 30/Top 50/50+`, preservando a media tecnica no payload.
105. [TASK-139 - Meta de conversão no dashboard e matriz Admin de psicólogos](TASK-139-meta-conversao-dashboard-matriz-admin-psicologos.md) foi adicionada e concluida em 2026-08-01 para exibir a meta absoluta de conversao apos o grafico de Conversao e incluir Meta de conversao como eixo da matriz de cruzamento.
106. [TASK-140 - Visualização administrativa como usuário](TASK-140-visualizar-como-usuario-admin.md) foi adicionada e concluida em 2026-08-02 para permitir que o Admin abra pacientes e psicologos em modo somente leitura a partir da aba Conta, com TTL curto, auditoria e bloqueio backend de escrita.
107. [TASK-142 - Visualização do valor atual do plano em Configurações Admin](TASK-142-visualizacao-plano-assinatura-admin.md) foi adicionada e concluída em 2026-08-03 para exibir em `/configuracoes/assinatura` o valor atual do Plano Profissional lido de `subscription_plan.price_cents`, sem edição administrativa de preço e sem repetir a listagem financeira de assinaturas vinculadas.
108. [TASK-143 - Previa Open Graph Admin e SEO dinamico de posts](TASK-143-preview-og-admin-seo-dinamico-posts.md) foi adicionada e concluida em 2026-08-03 para exibir miniatura da Imagem Open Graph no Admin, persistir miniaturas geradas de videos em posts/respostas e publicar metadados dinamicos reais para compartilhamento social de posts e threads.
109. [TASK-144 - Upload de imagem Open Graph no Admin](TASK-144-upload-imagem-open-graph-admin.md) foi adicionada e concluida em 2026-08-03 para trocar a edicao manual do link da Imagem Open Graph por upload real de arquivo, mantendo a URL publica gerada internamente e salva no campo tecnico `og_image_url`.
110. [TASK-144 - Upload de imagem Open Graph no Admin](TASK-144-upload-imagem-open-graph-admin.md) recebeu ajuste pos-feedback em 2026-08-03 para remover a tag `Upload`, simplificar a copy do envio e manter os botoes de troca/remocao da imagem em linha unica dentro do bloco de upload.
111. [TASK-144 - Upload de imagem Open Graph no Admin](TASK-144-upload-imagem-open-graph-admin.md) recebeu ajuste pos-feedback em 2026-08-03 para reduzir a miniatura Open Graph e exibir a imagem completa sem recorte/zoom no bloco de upload.
112. [TASK-143 - Previa Open Graph Admin e SEO dinamico de posts](TASK-143-preview-og-admin-seo-dinamico-posts.md) recebeu ajuste pos-feedback em 2026-08-03 para gerar miniaturas Open Graph de videos no frame vertical 9:16 do compartilhamento Lectum, alinhado ao preview de WhatsApp enviado como referencia.
113. [TASK-143 - Previa Open Graph Admin e SEO dinamico de posts](TASK-143-preview-og-admin-seo-dinamico-posts.md) recebeu ajuste pos-feedback em 2026-08-03 para separar **Comunidades** (`/community`) de **Comunidade** (`/community/[slug]`), publicar metadados dinamicos por slug e usar o nome real da comunidade/post como titulo compartilhado.
114. [TASK-143 - Previa Open Graph Admin e SEO dinamico de posts](TASK-143-preview-og-admin-seo-dinamico-posts.md) recebeu ajuste pos-feedback em 2026-08-03 para usar imagens Open Graph quadradas de entidade: avatar da comunidade em `/community/[slug]` e foto/avatar do psicologo em `/psychologists/[id]`.
115. [TASK-145 - Rotas em PT-BR e SEO canônico](TASK-145-rotas-publicas-pt-br-seo.md) foi adicionada e concluida em 2026-08-03 para tornar canonicos os slugs publicos (`/psicologos`, `/comunidades`) e privados (`/app/notificacoes`, `/app/perfil`, `/app/profissional/*`) em PT-BR, mantendo redirects permanentes das URLs antigas em ingles.
116. [TASK-146 - Versionamento rastreável e promoção de produção por PR](TASK-146-versionamento-rastreavel-promocao-producao.md) foi adicionada e concluída em 2026-08-08 para sincronizar SemVer entre os quatro manifests, expor a versão dos três artefatos publicados e tornar a solicitação explícita de produção um PR `homolog` -> `main` seguido de merge e smoke.
117. [TASK-147 - Confirmação antes de excluir post ou comentário](TASK-147-confirmacao-exclusao-post-comentario.md) foi adicionada e concluída em 2026-08-10 para exigir confirmação visual antes de excluir comentários/respostas e manter as regras existentes de exclusão de posts e conteúdo protegido.
118. [TASK-148 - Safe area iOS/PWA para elementos inferiores](TASK-148-safe-area-ios-pwa-elementos-inferiores.md) foi adicionada e concluída em 2026-08-10 para aplicar `viewport-fit=cover`, centralizar tokens de safe area inferior e elevar bottom nav, composer de comentários e CTAs/footers inferiores no iPhone/PWA.
119. [TASK-149 - Sugestões de comunidades no Admin com blocos de demanda](TASK-149-admin-sugestoes-comunidades-blocos-demanda.md) foi adicionada e concluída em 2026-08-10 para receber sugestões já enviadas pelo app, agrupá-las em blocos internos de demanda e apoiar a decisão futura de abrir novas comunidades sem automação.
120. [TASK-150 - Localizacao declarada do paciente para proximidade](TASK-150-localizacao-declarada-paciente.md) foi adicionada e concluida em 2026-08-10 para trocar, nas telas de paciente do Admin, a localizacao por IP pela localidade declarada pelo paciente no perfil, mantendo **Nao informado** para quem nao preencher.
121. [TASK-151 - Remover banner de localizacao opcional no perfil do paciente](TASK-151-remover-banner-localizacao-paciente.md) foi adicionada e concluida em 2026-08-10 para retirar a faixa azul informativa da edicao de perfil do paciente, mantendo Estado/Cidade opcionais e a explicacao curta no campo Estado.
122. [TASK-152 - Instalar aplicativo no perfil](TASK-152-instalar-aplicativo-no-perfil.md) foi adicionada em 2026-08-10 e concluida em 2026-08-11 para oferecer, na seção Conta do perfil de pacientes e psicologos, uma entrada manual de instalação do PWA após o usuário dispensar o prompt automático.
123. [TASK-153 - Permissao nativa direta de notificacoes](TASK-153-permissao-nativa-direta-notificacoes.md) foi adicionada e concluida em 2026-08-11 para remover a modal propria da Lectum no fluxo automatico de notificacoes e chamar diretamente a permissao nativa do navegador no mesmo timing anterior, preservando gates, cooldown, `lectum.activePrompt` e a acao manual em configuracoes.
124. [TASK-154 - Digests temporais para push de notificacoes](TASK-154-digests-temporais-push-notificacoes.md) foi adicionada e concluida em 2026-08-11 para reduzir ruido de push: engajamentos de pacientes e novos posts para psicologos viram digests temporais de 3 horas, enquanto visualizacoes, compartilhamentos, upvotes e salvamentos de psicologos entram no digest diario profissional sem push imediato.
125. [TASK-155 - Ocultar instalar aplicativo no desktop](TASK-155-ocultar-instalar-aplicativo-desktop.md) foi adicionada e concluida em 2026-08-11 para manter a entrada manual de instalacao do PWA apenas na experiencia mobile/tablet e ocultar a linha do perfil em desktop mesmo quando o navegador oferece `beforeinstallprompt`.
126. [TASK-56 - Detalhe administrativo do psicologo: Plano, pagamentos e cortesia](TASK-56-detalhe-psicologo-plano-pagamentos-admin.md) recebeu ajuste pos-feedback em 2026-08-13 para permitir cancelamento administrativo real de assinatura Mercado Pago com confirmacao forte, motivo interno, auditoria em `admin_activity_log` e sem expor dados sensiveis de pagamento.
127. [TASK-18A - Perfil gratuito sem documento CRP](TASK-18A-perfil-gratuito-sem-crp.md) recebeu ajuste pos-feedback em 2026-08-13 para remover a sombra projetada das chips de dias da semana na edicao profissional, preservando estados de foco e selecao sem alterar contratos ou dados.
128. [TASK-156 - Regua de cobranca e regularizacao da assinatura](TASK-156-regua-cobranca-assinatura.md) foi adicionada e concluida em 2026-08-15 para abrir janela D+0 a D+7 em falhas de cobranca Mercado Pago, manter beneficios durante a graca, notificar psicologos e oferecer botao **Regularizar cartao** em **Minha Assinatura**.
129. [TASK-18A - Perfil gratuito sem documento CRP](TASK-18A-perfil-gratuito-sem-crp.md) recebeu ajuste pos-feedback em 2026-08-17 para alinhar as chips selecionadas dos catalogos ao tamanho visual do select `Idiomas` (`Portugues`), preservando os placeholders compactos.
130. [TASK-157 - Upload multipart do vídeo de apresentação](TASK-157-upload-multipart-video-apresentacao.md) foi adicionada e concluída em 2026-08-20 para dividir vídeos grandes em partes de 5 MiB, exibir progresso, preservar o endpoint legado e centralizar em 13 envs opcionais os limites dos 11 endpoints binários baseados em Multer.
131. [TASK-157 - Upload multipart do vídeo de apresentação](TASK-157-upload-multipart-video-apresentacao.md) recebeu ajuste pós-feedback em 2026-08-20 para compensar a semântica exclusiva dos thresholds do Busboy/Multer e aceitar exatamente as três partes válidas e o chunk de 5 MiB sem ampliar os limites públicos.
132. [TASK-157 - Upload multipart do vídeo de apresentação](TASK-157-upload-multipart-video-apresentacao.md) recebeu novo ajuste pós-feedback em 2026-08-20 para aceitar marcas compatíveis e estruturas QuickTime legadas de MOV, preservar a rejeição de HEIC/conteúdo malformado e distinguir de forma segura falhas de sessão, tamanho da parte e assinatura.
133. [TASK-157 - Upload multipart do vídeo de apresentação](TASK-157-upload-multipart-video-apresentacao.md) recebeu observabilidade pós-feedback em 2026-08-20 para correlacionar parser, partes, storage, conclusão, persistência e abort por `traceId` aleatório, com whitelist que impede tokens, PII e detalhes do provider nos logs.
134. [TASK-157 - Upload multipart do vídeo de apresentação](TASK-157-upload-multipart-video-apresentacao.md) recebeu correção pós-smoke em 2026-08-20 para fazer o controller da parte consumir `req.b` após o validator, preservar integralmente a sessão multipart e distinguir causas internas seguras de rejeição sem alterar a resposta pública.
135. [TASK-158 - Otimização client-side do vídeo de apresentação](TASK-158-otimizacao-video-apresentacao-mediabunny.md) foi adicionada em 2026-08-20 para reduzir vídeos curtos antes do multipart atual com MediaBunny/WebCodecs, progresso, cancelamento e fallback original, sem antecipar Cloudflare Stream nem alterar backend, banco, R2 ou envs.
136. [TASK-159 - Preparação transversal de mídia antes dos uploads](TASK-159-preparacao-transversal-midia-uploads.md) foi adicionada em 2026-08-21 para aplicar políticas explícitas de vídeo/imagem a todas as superfícies atuais de mídia pública, reservar passthrough apenas a thumbnails geradas, excluir documentos por allowlist fechada e tornar o post raiz compatível com multipart sem acoplar preparação ao transporte.
137. [TASK-160 - Limites em duas etapas para vídeos no Safari Photos](TASK-160-limites-video-safari-photos-opfs.md) foi adicionada em 2026-08-21 para permitir que rendições transitórias maiores do Photos sejam preparadas antes do limite final, usar OPFS com `StreamTarget` no caminho principal e aplicar a mesma política a post, comentário e apresentação, mantendo validação backend e fallback seguro.
106. [TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin](TASK-111-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md) recebeu ajuste complementar em 2026-08-02 para adicionar tag de atividade por `posts + replies` no titulo da tabela por comunidade, trocar a copy das tags de engajamento para Alto/Padrao/Baixo/Sem engajamento e exibir taxas reais com/sem video nas colunas Posts e Respostas.
107. [TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin](TASK-111-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md) recebeu ajuste pos-feedback em 2026-08-02 para remover o contador **Taxa de cobertura** do carrossel principal, manter as tags da coluna **Engajamento** como Alto/Padrao/Baixo/Sem engajamento e adicionar tags de atividade e engajamento ao titulo **Atividade e engajamento**.
108. [TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin](TASK-111-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md) recebeu ajuste visual em 2026-08-02 para remover os icones das tags **Muito ativo** e **Alto engajamento**, mantendo apenas o texto no titulo **Atividade e engajamento**.

### 1A. Trilha Admin planejada

Execute uma por vez, sempre validando, marcando critérios, ADR e commit/push:

1. [TASK-45 - Fundação backend do Admin](TASK-45-fundacao-backend-admin.md)
2. [TASK-46 - Aplicação Admin separada e shell lateral](TASK-46-app-admin-shell-lateral.md)
3. [TASK-47 - Captura de sessão e tipo de dispositivo para analytics admin](TASK-47-captura-sessao-tipo-dispositivo.md)
4. [TASK-48 - Dashboard administrativo](TASK-48-dashboard-administrativo.md)
5. [TASK-49 - Tracking de pageviews e origem de tráfego](TASK-49-tracking-pageviews-origem-trafego.md)
6. [TASK-50 - Tela Tráfego administrativo](TASK-50-tela-trafego-administrativo.md)
7. [TASK-51 - Dashboard administrativo de comunidades](TASK-51-dashboard-administrativo-comunidades.md)
8. [TASK-52 - Detalhe e edição de comunidade no Admin](TASK-52-detalhe-edicao-comunidade-admin.md)
9. [TASK-53 - Dashboard administrativo de psicólogos](TASK-53-dashboard-administrativo-psicologos.md)
10. [TASK-54 - Lista administrativa de psicólogos](TASK-54-lista-administrativa-psicologos.md)
11. [TASK-55 - Detalhe administrativo do psicólogo: Geral e Perfil/Cadastro](TASK-55-detalhe-psicologo-geral-perfil-admin.md)
12. [TASK-56 - Detalhe administrativo do psicólogo: Plano, pagamentos e cortesia](TASK-56-detalhe-psicologo-plano-pagamentos-admin.md)
13. [TASK-57 - Detalhe administrativo do psicólogo: Estatísticas e publicações](TASK-57-detalhe-psicologo-estatisticas-publicacoes-admin.md)
14. [TASK-58 - Detalhe administrativo do psicólogo: Avaliações e denúncias](TASK-58-detalhe-psicologo-avaliacoes-denuncias-admin.md)
15. [TASK-59 - Detalhe administrativo do psicólogo: Atividades simples](TASK-59-detalhe-psicologo-atividades-admin.md)
16. [TASK-60 - Dashboard administrativo de pacientes](TASK-60-dashboard-administrativo-pacientes.md)
17. [TASK-61 - Detalhe administrativo do paciente](TASK-61-detalhe-administrativo-paciente.md)
18. [TASK-62 - Financeiro administrativo](TASK-62-financeiro-administrativo.md)
19. [TASK-63 - Fundação de campanhas e logs de notificações Admin](TASK-63-fundacao-campanhas-logs-notificacoes-admin.md)
20. [TASK-64 - Tela administrativa de notificações](TASK-64-tela-administrativa-notificacoes.md)
21. [TASK-65 - Configurações administrativas de catálogos e filtros](TASK-65-configuracoes-admin-catalogos-filtros.md)
22. [TASK-66 - Verificação manual de CRP e origem genérica de verificação profissional](TASK-66-verificacao-manual-crp-admin.md)
23. [TASK-67 - Edição administrativa auditada de dados pessoais e profissionais do psicólogo](TASK-67-edicao-admin-dados-pessoais-profissionais-psicologo.md)
24. [TASK-68 - Conta e acesso do psicólogo no Admin](TASK-68-conta-acesso-psicologo-admin.md)
25. [TASK-71 - Abas administrativas da comunidade, conteúdo e ranking completo](TASK-71-admin-comunidade-abas-conteudo-ranking.md)
26. [TASK-72 - Métricas de conversão e uso da plataforma por psicólogos no Admin](TASK-72-metricas-conversao-uso-plataforma-psicologos-admin.md)
27. [TASK-73 - Ações administrativas de conta do psicólogo](TASK-73-acoes-conta-psicologo-admin.md)
28. [TASK-74 - Moderação textual simples e alertas Admin para conteúdo sensível de pacientes](TASK-74-moderacao-textual-alertas-admin-conteudo-sensivel-pacientes.md)
29. [TASK-75 - Detalhe analítico administrativo de conteúdo e retenção de vídeo](TASK-75-detalhe-analytics-conteudo-admin.md)
30. [TASK-76 - Ajuste dos filtros de periodo do Admin](TASK-76-ajuste-filtros-periodo-admin.md)
31. [TASK-77 - Central de moderação e alertas operacionais Admin](TASK-77-central-moderacao-alertas-operacionais-admin.md)
32. [TASK-78 - Indicador de urgência no menu lateral da moderação Admin](TASK-78-indicador-urgencia-menu-moderacao-admin.md)
33. [TASK-79 - Sessoes por device no detalhe administrativo](TASK-79-sessoes-por-device-detalhe-admin.md)
34. [TASK-80 - Confiabilidade do pagamento nas assinaturas Admin](TASK-80-saude-pagamento-assinaturas-admin.md)
35. [TASK-81 - Sistema operacional nos analytics Admin](TASK-81-sistema-operacional-analytics-admin.md)
36. [TASK-82 - Filtro Cortesia no dashboard Admin de psicologos](TASK-82-filtro-cortesia-dashboard-psicologos-admin.md)
37. [TASK-83 - Erro no cadastro em Operacionais Admin](TASK-83-erro-cadastro-operacionais-admin.md)
38. [TASK-84 - Conversão no dashboard Admin de psicologos](TASK-84-conversao-dashboard-psicologos-admin.md)
39. [TASK-85 - Trilha pre-cadastro dos pacientes no dashboard Admin](TASK-85-conversao-uso-anonimo-cadastro-pacientes-admin.md)
40. [TASK-86 - Trilha pre-cadastro dos psicologos no dashboard Admin](TASK-86-trilha-pre-cadastro-psicologos-admin.md)
41. [TASK-88 - Seletor de conversao no titulo e filtro de plano na trilha pre-cadastro dos psicologos Admin](TASK-88-seletor-conversao-titulo-filtro-plano-psicologos-admin.md)
42. [TASK-89 - Comparativo Conversão x Engajamento no dashboard Admin de psicologos](TASK-89-conversao-engajamento-dashboard-psicologos-admin.md)
43. [TASK-90 - Engajamento ponderado no Admin](TASK-90-engajamento-ponderado-admin.md)
44. [TASK-91 - Fluxo de intenção e conversão cruzada no Admin](TASK-91-fluxo-intencao-conversao-admin.md)
45. [TASK-92 - Simplificação visual do fluxo de intenção e conversão no Dashboard Admin](TASK-92-simplificacao-fluxo-intencao-conversao-admin.md)
46. [TASK-93 - Refinamento do alinhamento visual do fluxo de intencao e conversao no Dashboard Admin](TASK-93-refino-alinhamento-exemplo-fluxo-intencao-conversao-admin.md)
47. [TASK-94 - Remocao do bloco Fluxo de intencao e conversao no Dashboard Admin](TASK-94-remocao-bloco-fluxo-intencao-conversao-dashboard-admin.md)
48. [TASK-95 - Análise de qualidade da conversão no perfil Admin do psicólogo](TASK-95-analise-qualidade-conversao-perfil-psicologo-admin.md)
49. [TASK-96 - Engajamento e Favoritos no dashboard Admin de psicologos](TASK-96-engajamento-favoritos-dashboard-psicologos-admin.md)
50. [TASK-97 - Visibilidade Comunidade x Video no dashboard Admin de psicologos](TASK-97-visibilidade-comunidade-video-dashboard-psicologos-admin.md)
51. [TASK-98 - Ajuste de tamanho dos graficos e matriz no dashboard Admin de psicologos](TASK-98-ajuste-tamanho-graficos-matriz-dashboard-psicologos-admin.md)
52. [TASK-99 - Manter tres graficos lado a lado no funil Admin de psicologos](TASK-99-tres-graficos-lado-a-lado-funil-psicologos-admin.md)
53. [TASK-100 - Matrizes Conversao x Engajamentos/Favoritos e Visibilidade no Admin de psicologos](TASK-100-matrizes-conversao-engajamentos-favoritos-visibilidade-admin.md)
54. [TASK-101 - Label Video sem view na matriz Conversao x Visibilidade do Admin](TASK-101-label-video-sem-view-visibilidade-admin.md)
55. [TASK-101A - Centralizacao dos textos nos blocos da matriz de conversao Admin](TASK-101A-centralizacao-textos-blocos-matriz-conversao-admin.md)
56. [TASK-102 - Distribuicao de cliques WhatsApp por psicologo no Dashboard Admin](TASK-102-distribuicao-cliques-whatsapp-dashboard-admin.md)
57. [TASK-103 - Funil comportamental por conversao no Admin de psicologos](TASK-103-funil-comportamental-conversao-admin-psicologos.md)
58. [TASK-104 - Reorganizacao segura da aba Estatisticas do psicologo no Admin](TASK-104-reorganizacao-estatisticas-psicologo-admin.md)
59. [TASK-105 - Seletor global de periodo nas estatisticas do psicologo Admin](TASK-105-seletor-global-periodo-estatisticas-psicologo-admin.md)
60. [TASK-106 - Visibilidade temporal no contador principal do psicologo Admin](TASK-106-visibilidade-temporal-contador-psicologo-admin.md)
61. [TASK-107 - Eixo direito de visibilidade e comparativos dos scores no psicologo Admin](TASK-107-eixo-direito-visibilidade-comparativos-scores-psicologo-admin.md)
62. [TASK-108 - Bloco Visibilidade nas estatisticas do psicologo Admin](TASK-108-bloco-visibilidade-estatisticas-psicologo-admin.md)
63. [TASK-109 - Copy dos contadores de Visibilidade do psicologo Admin](TASK-109-copy-contadores-visibilidade-psicologo-admin.md)
64. [TASK-110 - Formula de atividade por cobertura e video no psicologo Admin](TASK-110-formula-atividade-cobertura-video-psicologo-admin.md)
65. [TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin](TASK-111-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md)
66. [TASK-112 - Posicao media do video no Explorar no psicologo Admin](TASK-112-posicao-media-video-explorar-psicologo-admin.md)
67. [TASK-113 - Tag de resultado no titulo de Visibilidade do psicologo Admin](TASK-113-tag-resultado-titulo-visibilidade-psicologo-admin.md)
68. [TASK-114 - Tabela de trafego por WhatsApp no dashboard Admin de psicologos](TASK-114-tabela-trafego-whatsapp-dashboard-psicologos-admin.md)
69. [TASK-115 - Grupo Comunidades na tabela de trafego WhatsApp do Admin de psicologos](TASK-115-grupo-comunidades-tabela-trafego-whatsapp-psicologos-admin.md)
70. [TASK-116 - Grupos expansiveis na tabela de trafego WhatsApp do Admin de psicologos](TASK-116-grupos-expansiveis-trafego-whatsapp-psicologos-admin.md)
71. [TASK-117 - Medias reais de analises das comunidades no trafego WhatsApp Admin](TASK-117-medias-reais-comunidades-trafego-whatsapp-psicologos-admin.md)
72. [TASK-118 - Copy de medias de engajamento nas sublinhas de Comunidades do trafego WhatsApp Admin](TASK-118-copy-medias-engajamento-comunidades-trafego-whatsapp-admin.md)
73. [TASK-119 - Label Tempo de permanencia nas metricas de Comunidades do trafego WhatsApp Admin](TASK-119-label-tempo-permanencia-comunidades-trafego-whatsapp-admin.md)
74. [TASK-120 - Expansivo de Perfil com medias de engajamento no trafego WhatsApp Admin](TASK-120-expansivo-perfil-medias-engajamento-trafego-whatsapp-admin.md)
75. [TASK-121 - Medias de engajamento no Video de apresentacao do trafego WhatsApp Admin](TASK-121-medias-engajamento-video-apresentacao-trafego-whatsapp-admin.md)
76. [TASK-122 - Quantidade considerada e carrossel dos donuts no Admin de psicologos](TASK-122-quantidade-considerada-titulos-trafego-whatsapp-admin.md)
77. [TASK-123 - Donut de Atividade no dashboard Admin de psicologos](TASK-123-donut-atividade-dashboard-psicologos-admin.md)
78. [TASK-124 - Reposicionamento da matriz no dashboard Admin de psicologos](TASK-124-reposicionamento-matriz-dashboard-psicologos-admin.md)
79. [TASK-125 - Tabela comportamental por conversao no Admin de psicologos](TASK-125-tabela-comportamental-conversao-admin-psicologos.md)
80. [TASK-126 - Tags na tabela comportamental por conversao do Admin de psicologos](TASK-126-tags-tabela-comportamental-conversao-admin-psicologos.md)
81. [TASK-127 - Matriz expansivel no funil comportamental por conversao do Admin de psicologos](TASK-127-matriz-expansivel-funil-comportamental-conversao-admin-psicologos.md)
82. [TASK-128 - Ajustes de largura e copy da tabela comportamental por conversao Admin](TASK-128-ajustes-largura-copy-tabela-comportamental-conversao-admin.md)
83. [TASK-129 - Eixos independentes na matriz de cruzamento de dados Admin](TASK-129-eixos-independentes-matriz-cruzamento-dados-admin-psicologos.md)
84. [TASK-130 - Eixos adicionais na matriz de cruzamento de dados Admin](TASK-130-eixos-adicionais-matriz-cruzamento-dados-admin-psicologos.md)
85. [TASK-131 - Media de WhatsApp por linha no trafego Admin de psicologos](TASK-131-media-whatsapp-linhas-trafego-admin-psicologos.md)
86. [TASK-132 - Tags medias e cores na tabela comportamental Admin](TASK-132-tags-medias-cores-tabela-comportamental-admin-psicologos.md)
87. [TASK-133 - Tags de Perfil na tabela comportamental Admin](TASK-133-tags-perfil-tabela-comportamental-admin-psicologos.md)
88. [TASK-134 - Cobertura no dashboard e matriz Admin de psicologos](TASK-134-cobertura-dashboard-matriz-admin-psicologos.md)
89. [TASK-135 - Refino de medias e autoria nos cliques WhatsApp do trafego Admin](TASK-135-refino-medias-autoria-whatsapp-trafego-admin-psicologos.md)
90. [TASK-136 - Ajustes finais da tabela comportamental Admin](TASK-136-copy-tags-video-perfil-tabela-comportamental-admin-psicologos.md)
91. [TASK-137 - Refino de layout dos donuts de indicadores Admin](TASK-137-refino-layout-donuts-indicadores-admin-psicologos.md)
92. [TASK-138 - Range de posição do vídeo na tabela comportamental Admin](TASK-138-range-posicao-video-tabela-comportamental-admin-psicologos.md)
93. [TASK-139 - Meta de conversão no dashboard e matriz Admin de psicólogos](TASK-139-meta-conversao-dashboard-matriz-admin-psicologos.md)
94. [TASK-140 - Visualização administrativa como usuário](TASK-140-visualizar-como-usuario-admin.md)
95. [TASK-141 - Configurações Admin de SEO e Metadados](TASK-141-configuracoes-admin-seo-metadados.md)
96. [TASK-142 - Visualização do valor atual do plano em Configurações Admin](TASK-142-visualizacao-plano-assinatura-admin.md)
97. [TASK-143 - Previa Open Graph Admin e SEO dinamico de posts](TASK-143-preview-og-admin-seo-dinamico-posts.md)
98. [TASK-144 - Upload de imagem Open Graph no Admin](TASK-144-upload-imagem-open-graph-admin.md)

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
6. [TASK-41 - Páginas legais públicas: Termos de Serviço e Política de Privacidade](TASK-41-paginas-legais-termos-privacidade.md), antes da revisão final de LGPD/operação, depois que as minutas legais tiverem aprovação do fundador e placeholders preenchidos.
7. [TASK-34 - Qualidade, seguranca, LGPD e operacao](TASK-34-qualidade-seguranca-lgpd-operacao.md), concluida em 2026-06-29 com a TASK-41 explicitamente aceita para fora do MVP por enquanto.

### 4. Regra para escolher a proxima task

- Se a proxima task da trilha estiver `Pending` e todas as dependencias estiverem `Completed`, execute.
- Se alguma dependencia estiver `Blocked`, nao implemente parcialmente: registre bloqueio na task/ADR e avance para a proxima task independente da trilha acima.
- Se houver requisito externo sem credencial/decisao real, registre bloqueio e nao use mock.

## Validacao base por task

Toda task deve rodar os comandos relevantes:

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir admin check`
- `pnpm check`
- `pnpm --dir backend db:migrate` quando a task alterar banco/schema/migrations
- `pnpm --dir backend build` quando backend estrutural mudar
- `pnpm --dir frontend build` quando frontend visual/rota mudar
- `pnpm --dir admin build` quando admin visual/rota mudar

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
- o commit tiver incremento sincronizado em `package.json`, `backend/package.json`, `frontend/package.json` e `admin/package.json`;
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

## Atualização de fluxo em 2026-06-07

- A etapa de WhatsApp profissional deixa de ser verificação por SMS/OTP e passa a ser apenas cadastro do número para geração interna do link `wa.me` após intenção de contato.
- O fluxo visual ainda usa `/app/profissional/whatsapp/verificar` por compatibilidade de rota, mas a cópia e a regra de domínio tratam a tela como inserção/salvamento do WhatsApp.

## Atualizacao de fluxo em 2026-06-07: gratuito sem CRP API

- Psicologos no plano gratuito seguem da escolha do plano para `/app/profissional/whatsapp/verificar` e depois para `/app/profissional/perfil/configurar`.
- O plano gratuito exige apenas insercao do WhatsApp antes do perfil; nao exige consulta/validacao CFP/CRP via API.

## Atualizacao de fluxo em 2026-07-11: WhatsApp antes da verificacao profissional no plano pago

- Psicologos no Plano Profissional pago seguem, apos pagamento real e endereco de faturamento, para `/app/profissional/whatsapp/verificar`.
- Depois de cadastrar o WhatsApp, psicologos pagos com verificacao profissional pendente seguem para `/app/profissional/cfp`.
- A edicao/publicacao do perfil profissional pago permanece bloqueada ate a verificacao profissional ser aprovada por API automatica ou aprovacao manual auditada.

## Atualizacao visual em 2026-08-13: endereco de assinatura

- A etapa `/app/profissional/assinatura/endereco` nao exibe mais a faixa verde de pagamento bem-sucedido.
- No desktop, Numero fica ao lado de Logradouro e Cidade fica ao lado de Estado; no mobile o formulario continua em uma coluna unica.

## Atualizacao visual em 2026-08-13: Admin cancelamento de assinatura

- Na aba Assinatura do detalhe do psicologo, o botao do card de cancelamento administrativo exibe `Cancelar`; a modal, a confirmacao forte e o cancelamento real no gateway permanecem inalterados.

## Atualizacao operacional em 2026-08-13: nome profissional no header Admin

- O detalhe Admin de psicologo passa a exibir no header o mesmo nome profissional usado em **Dados pessoais > Nome completo**.
- `user.name` fica apenas como fallback para perfis legados sem `professional_first_name`/`professional_last_name`, evitando divergencia como conta `Tulio Rezende` com perfil profissional `Sebastiao Rezende`.

## Atualizacao operacional em 2026-08-13: alerta de Perfil e cadastro no Admin

- O icone de alerta da aba `Perfil e cadastro` no detalhe Admin do psicologo passa a indicar somente perfil nao visivel para pacientes por falta de configuracoes publicas.
- CRP pendente por si so nao aciona o alerta; desativacao manual de `Perfil visivel para pacientes`, com perfil completo, tambem nao aciona alerta.

## Atualizacao visual em 2026-08-14: copy da verificacao profissional

- A tela `/psychologist/cfp` passa a comunicar que a consulta CFP e necessaria para conceder o selo de verificado.
- O texto auxiliar do CPF passa a informar que o registro sera buscado junto ao Conselho Federal de Psicologia.
- A alteracao e apenas de copy no frontend e nao altera contrato, banco, provider CFP, packages ou envs.

## Atualizacao operacional em 2026-08-15: cancelamento pago volta ao gratuito

- Ajuste pos-feedback da TASK-156: cancelamentos reais de assinatura profissional Mercado Pago agora restauram o Plano Gratuito ativo quando nao houver outro entitlement profissional, inclusive por sync, webhook, cancelamento do psicologo, cancelamento Admin ou correcao idempotente ao ler o plano atual.
- A etapa de endereco de faturamento nao deve manter o usuario preso no fluxo pago quando o plano efetivo ja voltou para gratuito/cancelado/inexistente.

## Atualizacao operacional em 2026-08-15: exclusao de conta Google

- Ajuste pos-feedback da TASK-30: no fluxo proprio de exclusao de conta, `user.provider="google"` exige reautenticacao Google e nao senha atual, mesmo quando existir senha local legada.
- Senha atual permanece exigida somente para contas nao Google com senha cadastrada; contas sem metodo confirmavel continuam bloqueadas por erro de dominio seguro.

## Atualizacao operacional em 2026-08-20: intenção Google com autenticação por cookie

- Ajuste pós-feedback da TASK-30: o transporte cookie-aware só remove `user_tokens` e força a
  sanitização de tokens quando a resposta realmente contém o contrato de sessão. A intenção curta
  e explicitamente autorizada de exclusão Google deixa de chegar como `url="[REDACTED]"`.
- Respostas sem opt-in continuam fail-closed; no cliente cookie-aware, JWT de sessão permanece
  exclusivo do cookie HttpOnly. A mesma fronteira preserva o `link_token` curto do vínculo Google
  sem alterar frontend, banco, packages ou envs.

## Atualização operacional em 2026-08-20: observabilidade Sentry separada

- Complemento da TASK-34: frontend, backend e admin passam a capturar falhas em três projetos
  Sentry independentes, preservando os ciclos de deploy separados.
- O primeiro rollout é error-only e fail-open: sem DSN ou environment explícito cada aplicação
  continua operacional; sem o conjunto completo de credenciais de build os apps Next apenas deixam
  de publicar source maps.
- A política de coleta remove PII, requests, cookies, headers, corpos, query strings, tokens, SQL,
  breadcrumbs, variáveis locais e mensagens cruas de provider. Tracing, Replay, Logs, User Feedback
  e profiling permanecem fora do escopo.
- Decisão e rollout registrados no ADR-0465, sem banco, migration ou mudança de contrato de API.
- A adoção ocorre em duas etapas: primeiro o código desativado por fallback seguro; depois o
  cadastro das envs e novo deploy em homolog, validação no provider e somente então produção.

## Atualizacao visual em 2026-08-17: chips selecionadas no perfil profissional

- Ajuste pos-feedback da TASK-18A: chips selecionadas dos catalogos em `/app/profissional/perfil/configurar` passam a usar `text-sm`, igual ao select `Idiomas`, para aproximar `Adultos`, `Terapia Online`, `Psicanalise` e equivalentes do tamanho visual de `Portugues`.
- O placeholder interno dos campos de catalogo permanece compacto em linha propria; nao houve alteracao de backend, banco, contratos, packages ou envs.

## Atualizacao visual em 2026-08-17: switch de visibilidade e placeholders no limite

- Ajuste pos-feedback da TASK-18A: `Perfil visivel para pacientes` em `/app/profissional/perfil/configurar` passa a usar switch com status textual e alerta vermelho especifico quando o perfil esta oculto.
- O menu privado `/app/perfil` preserva o indicador em `Editar perfil` quando o perfil esta oculto ou incompleto.
- Campos de catalogo escondem o placeholder `Adicione...` quando o limite de selecoes do plano ja foi atingido, sem alterar backend, banco, contratos, packages ou envs.

## Atualizacao visual em 2026-08-17: copy do alerta de perfil oculto

- Ajuste pos-feedback da TASK-18A: o alerta vermelho de perfil oculto em `/app/profissional/perfil/configurar` passa a usar a copy curta `Seu perfil está oculto. Ative a visibilidade para voltar a aparecer para pacientes.`
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, packages ou envs.

## Atualizacao visual em 2026-08-17: copy do perfil oculto no perfil proprio

- Ajuste pos-feedback da TASK-18A: o card de ativacao do perfil proprio em `/app/psicologo/[id]` passa a explicar que o perfil esta oculto porque o proprio psicologo desativou a visibilidade.
- A copy orienta ativar novamente para voltar a aparecer para pacientes: `Seu perfil não está visível porque você desativou a visibilidade. Ative novamente para o perfil voltar a ficar visível para pacientes.`
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, packages ou envs.

## Atualizacao operacional em 2026-08-17: descadastros nos dashboards Admin

- Ajuste pos-feedback das TASK-53 e TASK-60: dashboards Admin de psicologos e pacientes exibem o contador **Descadastros** na **Visao geral**.
- A contagem usa soft delete real em `user.deleted=true`, `user.account_status="deleted"`, `user.deletedAt` e `role` correspondente, sem incluir contas excluidas nos totais ativos/inativos.
- O contrato e aditivo (`cards.deleted_accounts` e pontos temporais com `deleted_accounts`), sem schema Prisma, migration, package novo, seed, mock, backfill artificial ou env nova.

## Atualizacao visual em 2026-08-21: abertura da modal Criar Post no Android

- Ajuste pos-feedback da TASK-24: a modal `Criar Post` em Android/touch deixa de focar o titulo no mesmo frame de montagem, aguardando a animacao da bottom sheet antes de acionar o teclado virtual.
- O backdrop mobile da modal nao usa mais blur de tela cheia; `sm+` preserva o blur. A sheet anima somente `transform` e isola pintura para reduzir repaint sobre o feed com midia.
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, packages, envs, upload/storage ou dados publicados.


## Atualizacao visual em 2026-08-21: obrigatorios no perfil profissional

- Ajuste pos-feedback da TASK-18A: o submit invalido de `/app/profissional/perfil/configurar` passa a rolar para o primeiro campo obrigatorio pendente na ordem mobile-first da tela.
- Mensagens genericas `Invalid input` em campos vazios foram substituidas por mensagens em portugues de obrigatoriedade no schema Zod do perfil profissional, preservando mensagens especificas de formato para CPF, WhatsApp e data invalida.
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, packages ou envs.

## Atualizacao visual em 2026-08-21: controles imersivos nos videos de comunidade

- Ajuste pos-feedback da TASK-26: videos de comunidade com player customizado passam a ocultar os controles quando a reproducao inicia, deixando o card mais limpo e imersivo.
- Um toque/clique na area do video revela novamente botao central, minutagem, volume, fullscreen e progresso por tempo curto enquanto o video segue tocando; pausado/finalizado permanece com controles visiveis.
- Alteracao frontend-only no player compartilhado; sem mudanca de backend, banco, contratos, packages, envs, upload/storage ou dados publicados.

## Atualizacao visual em 2026-08-21: especialidades e servicos obrigatorios no perfil profissional

- Ajuste pos-feedback da TASK-18A: `Especialidades` e `Servicos` em `/app/profissional/perfil/configurar` agora tambem exigem ao menos uma selecao no schema Zod, alinhando a validacao ao asterisco visual desses campos.
- O erro inline fica em portugues e indica obrigatoriedade, enquanto a rolagem para o primeiro campo pendente reutiliza a ordem mobile-first ja existente.
- Alteracao frontend-only; sem mudanca de backend, banco, contratos, packages, envs, providers ou dados publicados.

## Atualizacao visual em 2026-08-21: logo atual nos e-mails transacionais

- Ajuste pos-feedback da TASK-06: `backend/public/logo.png`, usado por `SYSTEM_LOGO` nos e-mails transacionais, foi atualizado da marca antiga para a logo atual da Lectum.
- O template `transactional.hbs` deixa de forcar altura fixa na imagem, preserva proporcao com `height:auto`, usa cabecalho claro e adiciona versionamento seguro na URL da logo para novos e-mails nao ficarem presos em cache de cliente/proxy.
- Alteracao backend-only de asset/template; sem mudanca de banco, contrato de API, packages, env nova, provider SMTP ou dados publicados.

## Atualizacao visual em 2026-08-22: nome de exibicao no cadastro de paciente

- Ajuste pos-feedback da TASK-07: no cadastro de paciente por e-mail em `/auth/register/patient`, o campo antes rotulado como `Nome completo` passa a se chamar `Nome de exibicao`.
- A mensagem de obrigatoriedade do schema Zod acompanha a nova nomenclatura; o payload continua usando `name` no endpoint real `POST /api/public/user/store`.
- Alteracao frontend-only de copy/formulario, mobile-first; sem mudanca de backend, banco, contrato de API, packages, envs, OAuth Google, providers, jobs ou dados publicados.

## Atualizacao visual em 2026-08-22: selo verificado em publicacoes

- Ajuste pos-feedback da TASK-26: nos headers de autores profissionais em publicacoes, respostas destacadas e comentarios de comunidade, o selo de verificado foi reduzido e ganhou respiro em relacao ao nome.
- O ajuste cobre card/feed, preview de resposta profissional, detalhe do post e arvore de comentarios sem alterar regra de verificacao, payloads, links ou CTA do psicologo.
- Alteracao frontend-only, mobile-first; sem mudanca de backend, banco, contratos, packages, envs, upload/storage, providers, jobs ou dados publicados.
