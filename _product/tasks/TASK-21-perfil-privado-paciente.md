# TASK-21: Perfil privado do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-21 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Paciente privado |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de perfil paciente privado |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Perfil do paciente.jpg` | `figma-design-frame-30-Perfil-do-paciente.html` |
| `_product/proto/Editar Perfil - Paciente.jpg` | `figma-design-frame-37-Editar-Perfil---Paciente.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Paciente precisa controlar dados básicos sem afetar autenticação sensível como e-mail/senha, que fica na task de configurações de conta.

## Objetivo

Criar perfil privado do paciente e edição de dados pessoais permitidos.

## Pré-requisitos e bloqueios

- Upload de avatar usa Cloudflare R2 (ADR-0006); sem credenciais/bucket no ambiente, manter avatar textual/initials e registrar pendência.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/profile`
- `/app/profile/edit`

Implementação esperada:

- Criar tela de perfil e edição.
- Validar nome, telefone, preferências básicas e avatar se storage existir.
- Separar edição de conta de edição de perfil.
- Usar React Hook Form + Zod.
- Atualizar store/sessão quando nome/avatar mudarem.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Endpoints privados de leitura/atualização do perfil paciente.
- Validar telefone com `libphonenumber-js` quando aplicável.
- Não permitir editar role pelo frontend.
- Persistir campos de preferência reais.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `patient_profile` (campos `goal`, `birthdate`, `phone`, `bio`, `onboarding_completed_at`)
- `user` (`name`, `avatar`; nunca editar `role` pelo frontend)

Endpoints esperados (reusar o padrão de rotas da TASK-08, singular `patient`):

- GET `/api/private/patient/profile`
- PUT `/api/private/patient/profile`

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- React Hook Form
- Zod
- libphonenumber-js
- Prisma

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.
- [x] Ajuste fino 2026-06-17: o campo `Gênero` em `/app/profile/edit` usa dropdown customizado premium, sem select nativo visível, com opções `Selecione seu gênero`, `Feminino`, `Masculino`, `Não binário` e `Prefiro não dizer`.
- [x] Ajuste fino 2026-06-17: o estado de perfil não autenticado em `/app/profile` foi redesenhado como tela de onboarding/autenticação premium, com card acolhedor, ícone maior, novo texto e hierarquia `Criar conta` / `Fazer login`.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.


## Registro de execução

- Referências visuais consultadas por imagens locais: `_product/proto/Perfil do paciente.jpg` e `_product/proto/Editar Perfil - Paciente.jpg`. Builder/Quick Copy não ficou exposto como ferramenta no ambiente desta sessão.
- Avatar por upload permanece pendente de bucket/credenciais Cloudflare R2 públicos definitivos; a UI mantém foto de login existente ou initials, sem mock de storage.
- ADR criado: `adrs/0031-perfil-privado-paciente.md`.

## Ajuste complementar em 2026-06-15 - upload de foto do paciente

- Corrigido o controle de foto em `/app/profile/edit`: o botao de camera agora abre o seletor real de arquivo, valida PNG/JPG/WebP ate 5MB e envia para o backend.
- Criados endpoints privados `POST /api/private/patient/profile/avatar` e `DELETE /api/private/patient/profile/avatar`, usando `multer`/R2 e persistindo `user.avatar` sem mocks.
- O prefixo publico `/public/files/patient/avatar/*` passou a ser permitido para renderizacao via `next/image`, e a store Redux do usuario e atualizada apos upload/remocao.
- A pendencia anterior de upload do avatar de paciente fica resolvida quando o ambiente possuir as credenciais R2 ja usadas pelo fluxo de midia existente.
- ADR criado: `adrs/0099-upload-avatar-paciente.md`.

## Ajuste complementar em 2026-06-16 - dicas de onboarding por usuário

- Corrigida a exibição das dicas "Descubra novos psicólogos" e "Publique sua dúvida ou relato" para depender de preferência persistida por usuário, e não de estado global do navegador.
- Adicionados campos `has_seen_discover_psychologists_tip` e `has_seen_community_post_tip` em `user`, com `GET/PUT /api/private/account/tips` sob `_auth`.
- O frontend consulta a preferência antes de renderizar cada dica e marca a dica como vista quando ela é exibida ou dispensada, mantendo as dicas independentes.
- `sessionStorage`/`localStorage` deixaram de ser fonte de verdade dessas dicas; o cache React Query é escopado pelo `user.id`.
- ADR criado: `adrs/0109-dicas-onboarding-persistidas-por-usuario.md`.

## Ajuste complementar em 2026-06-17 - ícone de explorar comunidades no perfil

- O item `Explorar comunidades` do menu privado `/app/profile` passou a usar o mesmo ícone `Compass` do botão `Explorar` presente no feed/comunidades.
- O ajuste reutiliza o menu compartilhado de perfil, portanto vale para pacientes e psicólogos sem duplicar componente.
- Tamanho, alinhamento, espaçamento, cores e estados de hover/foco do item foram preservados pelo componente `Row` existente.
- ADR criado: `adrs/0115-iconografia-explorar-comunidades-perfil.md`.

## Ajuste complementar em 2026-06-17 - dropdown customizado de gênero

- A tela `/app/profile/edit` manteve a referência local `_product/proto/Editar Perfil - Paciente.jpg` como norte auditável; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- O campo `Gênero` passou a usar o modo customizado do `SelectController`, preservando React Hook Form, Zod e a fundação da TASK-02.
- O dropdown recebeu fundo branco, borda azul-clara, radius refinado, sombra leve, chevron alinhado à direita, opções com padding confortável e item selecionado em azul muito claro.
- As opções permanecem `Selecione seu gênero`, `Feminino`, `Masculino`, `Não binário` e `Prefiro não dizer`.
- A validação local via Chrome/CDP em viewport mobile 390px confirmou ausência de `<select>` nativo visível, lista alinhada à largura do campo e sem overflow horizontal.
- Não houve alteração de backend, Prisma, contratos, persistência ou packages.

## Ajuste complementar em 2026-06-17 - perfil bloqueado para usuário não autenticado

- A tela pública `/app/profile` sem sessão manteve a função de bloquear o acesso ao perfil privado, mas deixou de parecer um alerta simples.
- O estado não autenticado passou a usar card central premium com fundo branco, borda azul-clara, glow sutil, ícone `ShieldCheck` maior, título `Acesse sua conta` e texto acolhedor orientado à continuidade da experiência.
- A hierarquia de ações foi ajustada: `Criar conta` é a ação primária e `Fazer login` a ação secundária, ambas com ícones alinhados ao texto.
- A validação local via Chrome/CDP em viewport mobile 390px confirmou novo texto, ausência da copy antiga, botões visíveis, card sem overflow horizontal e proporção adequada.
- Não houve alteração de backend, Prisma, contratos, persistência ou packages.

## Ajuste complementar em 2026-06-17 - ordem da seção Comunidade no perfil

- A seção `Comunidade` do menu compartilhado de `/app/profile` foi reordenada para pacientes e psicólogos.
- A ordem passa a ser: `Meus posts e comentários`, `Salvos`, `Comunidades seguidas` e `Explorar comunidades`.
- O ajuste preserva os mesmos ícones, `hrefs`, divisórias, setas, espaçamentos, hover/foco e comportamento de navegação do componente `Row`.
- Não houve alteração de backend, Prisma, contratos, persistência ou packages.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 em `/app/profile`, confirmando a ordem dos `hrefs` para paciente e psicólogo sem overflow horizontal.

## Ajuste complementar em 2026-06-18 - header secundário premium em Editar perfil

- A tela `/app/profile/edit` passou a usar o componente compartilhado `AppPageHeader`, alinhando `Editar perfil` ao mesmo header premium de `Meus Analytics`, `Minhas Avaliações`, `Minha assinatura`, `Email e senha`, `Meus posts e comentários`, `Salvos` e `Comunidades seguidas`.
- O header mantém botão de voltar à esquerda para `/app/profile`, título centralizado, fundo branco, borda suave, sombra discreta, altura e paddings consistentes.
- O ajuste remove a variação anterior de link textual `Voltar` sem alterar formulário, validações, upload/remoção de avatar, endpoints, dados persistidos, Prisma ou packages.
- ADR atualizado: `adrs/0119-header-secundario-premium-compartilhado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP em `/app/profile/edit` com usuário paciente temporário real removido do banco ao final, nos viewports mobile 390x844 e desktop 1024x768, confirmando centralização do título e ausência de overflow horizontal.

## Ajuste complementar em 2026-06-19 - consistência visual do seletor de gênero

- A seção `Informações Básicas` de `/app/profile/edit` manteve a referência local `_product/proto/Editar Perfil - Paciente.jpg` como norte auditável; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão.
- O seletor `Gênero` continua usando o `SelectController` customizado da fundação da TASK-02, sem criar componente paralelo.
- A aparência fechada do seletor foi alinhada ao campo `Nome de exibição`: mesma altura, mesmo `border-radius`, mesma borda, mesmo padding base, mesma hierarquia de placeholder e sem o sombreamento azul customizado anterior.
- A única diferença visual funcional preservada é a seta do dropdown, mantendo o comportamento de seleção e as opções existentes.
- Não houve alteração de backend, Prisma, contratos, persistência ou packages.
- Validações executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e Chrome/CDP mobile 390x844 em `/app/profile/edit`, confirmando altura, radius, borda, padding esquerdo, sombra e fundo iguais ao campo `Nome de exibição`, chevron preservado e ausência de overflow horizontal.

## Ajuste complementar em 2026-06-26 - ordem dos menus e modo escuro em Conta

- Pedido do usuário: no perfil compartilhado de pacientes e psicólogos, exibir primeiro o menu `Comunidade`, depois o menu `Conta`, e por fim `Sair da conta`.
- A ação `Ativar modo escuro` deixou de ser um card solto e passou a ser uma linha dentro da seção `Conta`, preservando o `ThemeSwitch` existente e sem criar componente paralelo.
- O componente compartilhado `Row` ganhou suporte a linha sem chevron para comportar controles inline, mantendo os mesmos espaçamentos, divisórias, ícone circular e tokens de cor do menu.
- A mudança vale para paciente e psicólogo porque a rota `/app/profile` usa o mesmo `ProfileLogic` para ambos.
- Sem alteração de backend, Prisma, contratos, persistência ou packages; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente, então a referência visual foi o print do usuário e os protótipos locais `_product/proto/Perfil do paciente.jpg` e `_product/proto/Perfil - Psicólogo.jpg`.

### Validações complementares

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/CDP em `/app/profile`, validando a ordem visual `Comunidade` → `Conta` → `Sair da conta` e a linha `Ativar modo escuro` dentro de `Conta`.

## Ajuste complementar em 2026-06-29 - dicas acionaveis na descoberta e comunidade

- Pedido do usuario: adicionar dicas para `Minha Busca` e `WhatsApp` na pagina de psicologos, sem exibir todas ao mesmo tempo, e transformar a dica existente de criar post em dica acionavel no proprio alvo.
- Referencias visuais consultadas: `_product/proto/Psicologos.jpg`, `_product/proto/Filtros de Psicologos - Servicos Expandidos.jpg`, `_product/proto/Feed Comunidade.jpg` e `_product/proto/Criar Nova Postagem - Pacientes.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente, entao foi usado o fallback local do inventario ativo.
- Backend: o contrato `GET/PUT /api/private/account/tips` passou a retornar e persistir `has_seen_psychologists_my_search_tip` e `has_seen_psychologist_whatsapp_tip`, mantendo `_auth` e sem `requireRole`.
- Frontend: `/app/psychologists` passou a usar uma fila mobile-first de dicas por usuario autenticado: primeiro descoberta, depois `Minha Busca`, depois `WhatsApp`, com no maximo uma dica por visita.
- Frontend: clicar em `Minha Busca` ou no botao real de WhatsApp marca a dica correspondente como vista, mesmo quando o usuario usa a acao antes de a dica aparecer.
- Frontend: a dica de criar post na comunidade deixou de ter CTA `Entendi`; o alvo destacado `+` abre a criacao de post e a preferencia segue persistida em `has_seen_community_post_tip`.
- Nenhum mock, endpoint simulado, package novo, Figma ou codigo gerado por Builder foi usado.

Criterios complementares:

- [x] Dicas novas aparecem somente para usuarios autenticados.
- [x] Apenas uma dica da fila de psicologos aparece por visita da pagina.
- [x] `Minha Busca` e `WhatsApp` sao salvas como vistas ao visualizar a dica ou ao clicar no alvo antes dela.
- [x] A dica de criar post e acionavel no alvo `+`, sem CTA separado.
- [x] Preferencias persistidas por usuario foram documentadas em `DATA-MODEL.md` e ADR.

## Ajuste complementar em 2026-08-16 - copy de localização do paciente

- Pedido do usuário: no campo `Estado` de `/app/profile/edit`, trocar a descrição `Opcional. Use para aproximarmos psicólogos da sua região.` por `Informe para aproximarmos psicólogos da sua região.`.
- A referência visual usada foi o print enviado pelo usuário da tela mobile de edição do perfil do paciente; o inventário ativo mantém `_product/proto/Editar Perfil - Paciente.jpg` como referência local auditável. Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- O ajuste altera apenas copy do formulário existente, preservando React Hook Form, Zod, `useFormList`, controllers compartilhados, validações de estado/cidade e comportamento mobile-first.
- Não houve alteração de backend, Prisma, contratos, persistência, envs, packages, uploads ou navegação.

Critérios complementares:

- [x] A descrição do campo `Estado` exibe `Informe para aproximarmos psicólogos da sua região.`.
- [x] A copy antiga `Opcional. Use para aproximarmos psicólogos da sua região.` não permanece no formulário de edição do paciente.

## Ajuste complementar em 2026-08-31 - exclusao fora da edicao do perfil pessoal

- Pedido do usuario: manter a opcao `Excluir minha conta` somente em `E-mail e senha`, removendo-a da edicao do perfil.
- A tela pessoal `/app/perfil/editar` (alias `/app/profile/edit`) deixa de renderizar `AccountDeleteSection`, reforcando a decisao original da TASK-21 de separar dados pessoais de e-mail/senha/exclusao.
- A exclusao continua disponivel em `/app/configuracoes/conta` para pacientes e psicologos, sem alterar endpoints, modal, reautenticacao ou regras de seguranca.
- Referencias consultadas: `_product/proto/Editar Perfil - Paciente.jpg`, `_product/proto/Editar E-mail e Senha.jpg`, inventario ativo e print anexado pelo usuario apenas como evidencia visual. Builder/Quick Copy nao esta callable neste ambiente.
- Alteracao frontend-only, mobile-first; sem backend, schema, migration, endpoint, env, package, provider, mock, seed, reset ou dados publicados.
- ADR atualizado: `adrs/0031-perfil-privado-paciente.md`.

Criterios complementares:

- [x] `/app/perfil/editar` nao renderiza `AccountDeleteSection` nem o CTA `Excluir minha conta`.
- [x] A acao de exclusao permanece em `/app/configuracoes/conta`.
- [x] A edicao de perfil pessoal continua separada de configuracoes sensiveis de conta.
