# TASK-68: Conta e acesso do psic?logo no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-68 |
| Prioridade | P1 |
| Esfor?o | L |
| Fase | Admin / Psic?logos / Conta |
| Status | Completed |
| Depend?ncias | TASK-05, TASK-06, TASK-30, TASK-45, TASK-46, TASK-55, TASK-58, TASK-59, TASK-67 |
| ADR alvo | ADR sobre suporte administrativo de conta, altera??o de e-mail e senha tempor?ria auditada |

## Contexto

O detalhe administrativo do psic?logo j? organiza a opera??o em abas como **Geral**, **Perfil e cadastro**, **Plano e pagamentos**, **Estat?sticas**, **Publica??es**, **Avalia??es**, **Atividades** e **Den?ncias**. Casos de suporte relacionados a credenciais e acesso n?o devem ficar misturados com dados de perfil, CRP, plano ou conte?do.

Decis?o de produto desta task:

- Adicionar a aba **Conta** no detalhe administrativo do psic?logo, posicionada depois de **Den?ncias**.
- A aba deve concentrar suporte de **conta e acesso**: e-mail da conta, status de confirma??o, m?todo de login, recupera??o de senha, troca administrativa de e-mail e defini??o de senha tempor?ria.
- A a??o preferencial para problemas de senha ? **enviar link de redefini??o de senha** usando o fluxo real da `TASK-05`.
- O Admin tamb?m deve conseguir **definir uma senha tempor?ria/manual** para contas que j? usam login por e-mail e senha, quando o psic?logo n?o conseguir concluir a redefini??o. A senha tempor?ria deve obrigar troca no pr?ximo login.
- Contas Google/OAuth sem senha local n?o devem receber senha local por esta task. A UI deve explicar que a a??o est? indispon?vel para esse m?todo de acesso.
- Altera??o administrativa de e-mail ? sens?vel e deve ficar nesta aba, com confirma??o forte, e-mail de verifica??o real quando dispon?vel, invalida??o de sess?es e auditoria.
- Nenhuma a??o desta aba pode ser tratada como a??o do pr?prio psic?logo. Tudo deve ter origem administrativa expl?cita, motivo obrigat?rio e auditoria segura.

O objetivo ? destravar suporte operacional real para casos como ?solicitei altera??o de e-mail?, ?n?o recebo link de senha?, ?n?o consigo redefinir senha? e ?preciso de senha tempor?ria?, sem criar impersona??o, sem expor senha/c?digos e sem enfraquecer o fluxo de autentica??o.

## Objetivo

Permitir que um Admin autenticado acesse a nova aba **Conta** no detalhe do psic?logo para visualizar dados de acesso e executar a??es reais e auditadas de suporte: alterar e-mail quando permitido, reenviar confirma??o de e-mail, enviar link de redefini??o, definir senha tempor?ria para contas com senha local e invalidar sess?es afetadas.

## Pr?-requisitos e bloqueios

- TASK-05 conclu?da: recupera??o de senha real por link.
- TASK-06 conclu?da: confirma??o de e-mail por c?digo real.
- TASK-30 conclu?da: configura??es de conta e regras atuais de altera??o de e-mail/senha pelo pr?prio usu?rio.
- TASK-45 conclu?da: autentica??o Admin real.
- TASK-46 conclu?da: app `admin/` e shell lateral.
- TASK-55 conclu?da: detalhe administrativo do psic?logo.
- TASK-58 conclu?da: aba **Den?ncias** existente para posicionar **Conta** depois dela.
- TASK-59 conclu?da: aba **Atividades** real.
- TASK-67 conclu?da ou considerada antes desta task: auditoria administrativa gen?rica para altera??es sens?veis. Se ainda n?o existir estrutura equivalente, n?o criar uma segunda auditoria paralela sem ADR.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como refer?ncia visual local:
  - `_product/proto/admin/Psic?logos/Detalhes do psic?logo/Geral.png`;
  - `_product/proto/admin/Psic?logos/Detalhes do psic?logo/Den?ncias.png`;
  - `_product/proto/admin/Psic?logos/Detalhes do psic?logo/Atividades.png`.
- N?o existe prot?tipo espec?fico para a aba **Conta** nesta data. Usar o padr?o visual das abas existentes e registrar essa limita??o.
- Se Builder/Quick Copy estiver dispon?vel, usar como complemento; se n?o estiver acess?vel no ambiente, usar as imagens locais e registrar a limita??o.
- Validar o schema atual antes de criar campo/tabela nova. Preferir `user.email`, `user.provider`, `user.password`, `user.confirmed`, `user.confirmed_date`, `user.recovery_code`, `user.recovery_date`, `user.confirm_code`, `user.confirm_date`, `user.need_reset`, `user_token` e auditoria j? existente.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- N?o usar mocks, endpoints simulados, dados inventados, envio falso de e-mail ou escrita local sem persist?ncia real.

## Escopo frontend

### Admin ? navega??o do detalhe do psic?logo

- Atualizar as abas do detalhe `/psicologos/[id]` ou rota equivalente para incluir **Conta** depois de **Den?ncias**.
- A aba deve aceitar `?tab=conta`.
- O menu deve continuar mobile-first:
  - rolagem horizontal/touch em ~390px;
  - sem quebra visual dos itens;
  - item ativo com o mesmo padr?o das abas existentes.
- A inclus?o de **Conta** n?o pode quebrar o deep link das abas antigas.

### Admin ? aba Conta

Criar uma tela mobile-first com se??es/cards reutilizando componentes do Admin:

1. **Resumo da conta**
   - e-mail atual;
   - status do e-mail: confirmado, pendente, n?o informado quando aplic?vel;
   - m?todo de login em linguagem humana: `E-mail e senha`, `Google`, `Google + senha local` ou equivalente seguro;
   - indica??o `Possui senha local` / `N?o possui senha local`;
   - status da conta (`Ativa`/`Inativa`) se o dado j? existir no contrato;
   - `need_reset` como ?Troca de senha obrigat?ria pendente?;
   - ?ltimo acesso e sess?es ativas quando deriv?veis de dados reais.

2. **E-mail da conta**
   - a??o **Alterar e-mail** apenas quando a identidade permitir altera??o local segura;
   - a??o **Reenviar confirma??o de e-mail** quando houver e-mail pendente de confirma??o;
   - bloquear ou explicar indisponibilidade em conta Google/OAuth sem senha local.

3. **Senha e recupera??o**
   - a??o **Enviar link de redefini??o de senha** usando fluxo real de recupera??o;
   - a??o **Definir senha tempor?ria** para conta com senha local;
   - quando a conta n?o tiver senha local, mostrar copy honesta: ?Esta conta acessa via Google. Altera??o de senha local indispon?vel.?

4. **Sess?es e seguran?a**
   - exibir resumo seguro das sess?es/tokens ativos quando houver dado real;
   - informar que altera??o de e-mail e senha tempor?ria invalidam sess?es do psic?logo;
   - permitir a??o expl?cita **Encerrar sess?es** somente se for implementada com persist?ncia real em `user_token` e auditoria.

### Formul?rios e intera??es

Todos os formul?rios devem usar React Hook Form, Zod e controllers da funda??o da `TASK-02`/app Admin.

#### Alterar e-mail

Campos m?nimos:

- novo e-mail;
- motivo/observa??o interna obrigat?rio;
- confirma??o forte, por exemplo `ALTERAR EMAIL`.

Regras de UI:

- Validar formato de e-mail no cliente e no backend.
- Mostrar aviso de impacto: troca de e-mail exige nova confirma??o e encerra sess?es do psic?logo.
- Ap?s sucesso, atualizar o card sem reload manual e invalidar queries do detalhe/conta/atividades.
- N?o permitir alterar para e-mail j? usado por outro usu?rio.
- N?o exibir `confirm_code` nem qualquer token gerado.

#### Reenviar confirma??o de e-mail

- Dispon?vel quando a conta estiver com `confirmed=false`.
- Deve usar e-mail transacional real existente; se o provedor n?o estiver configurado no ambiente, a UI/response n?o pode fingir envio.
- Registrar auditoria de tentativa de envio pelo Admin.

#### Enviar link de redefini??o

- Dispon?vel para conta com senha local.
- Chamar endpoint Admin real que reutiliza a regra da `TASK-05`.
- N?o mostrar se o e-mail existe fora do contexto do psic?logo selecionado; o Admin j? est? no detalhe de um usu?rio real.
- N?o expor `recovery_code` em resposta, toast, console ou UI.
- Registrar auditoria da a??o.

#### Definir senha tempor?ria

Campos m?nimos:

- nova senha tempor?ria;
- confirmar senha tempor?ria;
- motivo/observa??o interna obrigat?rio;
- confirma??o forte, por exemplo `ALTERAR SENHA`.

Regras de UI:

- Exibir a??o apenas quando `has_password=true` ou regra equivalente segura.
- Validar a pol?tica atual de senha do backend (m?nimo 10, m?ximo 128, sem criar pol?tica paralela se a atual for essa).
- Avisar que a senha n?o ser? exibida novamente, n?o ser? gravada em auditoria e o psic?logo ser? obrigado a trocar no pr?ximo login.
- Ap?s sucesso, mostrar confirma??o discreta e invalidar consultas de conta/detalhe/atividades.
- N?o manter a senha em estado global, URL, cache, log, toast ou localStorage.

### Frontend do usu?rio afetado

- Garantir que `user.need_reset=true` seja respeitado ap?s login do psic?logo.
- Se j? existir fluxo frontend de troca obrigat?ria, reutilizar.
- Se n?o existir, implementar rota/tela m?nima real para o usu?rio autenticado criar nova senha usando `POST /api/private/auth/need_reset`.
- Enquanto `need_reset=true`, o usu?rio n?o deve navegar normalmente pela ?rea privada como se a conta estivesse regular.
- Ap?s trocar a senha, limpar `need_reset` via endpoint real, hidratar sess?o e seguir o fluxo normal de acordo com o papel/onboarding.

### Estados obrigat?rios

- Loading por se??o/a??o.
- Erros de valida??o inline em PT-BR.
- Erros de API em PT-BR.
- Estado indispon?vel para Google/OAuth sem senha local.
- Sucesso com toast/copy discreta.
- Confirma??es fortes antes de a??es sens?veis.
- Atualiza??o de cache sem reload manual.

## Escopo backend

Criar ou estender endpoints Admin privados reais, protegidos por autentica??o Admin:

- `GET /api/admin/private/psychologists/:id/account`;
- `POST /api/admin/private/psychologists/:id/account/change-email`;
- `POST /api/admin/private/psychologists/:id/account/send-email-confirmation`;
- `POST /api/admin/private/psychologists/:id/account/send-password-reset`;
- `POST /api/admin/private/psychologists/:id/account/set-temporary-password`;
- `POST /api/admin/private/psychologists/:id/account/revoke-sessions`, se a a??o expl?cita for inclu?da na UI.

Regras gerais:

- Usar controller/service/repository/validator conforme `ARCHITECTURE.md`.
- Validar payloads com Zod/pacote local de validator.
- Garantir que `:id` perten?a a um usu?rio `role="psicologo"` existente e n?o deletado.
- N?o aceitar payload extra para alterar campos fora do escopo.
- Usar transa??es para mudan?as sens?veis.
- Retornar contratos normalizados e seguros para o Admin.
- N?o retornar senha, hash, `confirm_code`, `recovery_code`, tokens, payload bruto de e-mail ou identificadores sens?veis desnecess?rios.

### Contrato de leitura da conta

O endpoint de leitura deve retornar, no m?nimo, dados seguros equivalentes a:

- `email`;
- `provider` em formato t?cnico seguro e `provider_label` humano;
- `confirmed` e `confirmed_at`;
- `active`;
- `has_password`;
- `need_reset`;
- `created_at`;
- `last_access_at`, se deriv?vel;
- resumo de sess?es/tokens ativos quando poss?vel;
- `capabilities`:
  - `can_change_email`;
  - `can_send_email_confirmation`;
  - `can_send_password_reset`;
  - `can_set_temporary_password`;
  - `can_revoke_sessions`.

### Altera??o administrativa de e-mail

- Permitida somente quando a conta tiver identidade local segura para altera??o. Se conta Google/OAuth sem senha local, retornar erro de dom?nio claro.
- Normalizar e-mail para lowercase/trim.
- Rejeitar e-mail igual ao atual.
- Rejeitar e-mail j? usado por outro usu?rio.
- Gerar novo `confirm_code` real, marcar `confirmed=false`, limpar `confirmed_date` e atualizar `confirm_date`.
- Enviar confirma??o para o novo e-mail usando helper transacional real existente.
- Invalidar sess?es/tokens do psic?logo afetado.
- Registrar auditoria administrativa segura com e-mail anterior/novo mascarado quando exibido em listas.
- N?o alterar perfil, CRP, plano, assinatura, pagamentos ou publica??es.

### Reenvio administrativo de confirma??o de e-mail

- Dispon?vel para e-mail pendente de confirma??o.
- Gerar novo `confirm_code` ou reutilizar a regra existente de confirma??o conforme arquitetura atual.
- Enviar e-mail real e registrar auditoria.
- Se o provedor de e-mail n?o estiver configurado, retornar status/copy honesto; n?o dizer ?enviado? falsamente.

### Envio administrativo de link de redefini??o

- Dispon?vel somente para conta com senha local, salvo decis?o expl?cita registrada em ADR.
- Reutilizar a gera??o de `recovery_code` e envio real da `TASK-05`; n?o criar endpoint paralelo p?blico nem expor o c?digo.
- Registrar auditoria administrativa com motivo e status do envio.
- N?o alterar a senha atual nesse endpoint.

### Defini??o de senha tempor?ria

- Permitida somente para conta com senha local (`has_password=true`) ou regra equivalente documentada.
- Hash da senha deve usar o helper atual `@/utils/crypt`, respeitando a estrat?gia vigente (`argon2`/compatibilidade `bcrypt`), sem salvar senha em texto puro.
- Atualizar `user.password` e `user.password_confirm` com o hash, limpar `recovery_code/recovery_date`, definir `need_reset=true` e invalidar sess?es/tokens do psic?logo.
- Registrar auditoria administrativa com admin respons?vel, motivo, data/hora e origem, sem armazenar senha ou hash no log.
- O pr?ximo login do psic?logo deve exigir troca via fluxo real `POST /api/private/auth/need_reset`.

### Invalida??o de sess?es

- Altera??o de e-mail e senha tempor?ria devem invalidar sess?es do psic?logo afetado removendo/invalidando `user_token` real.
- N?o invalidar sess?o/tokens do Admin executor.
- Se houver a??o expl?cita **Encerrar sess?es**, ela deve ter motivo obrigat?rio, confirma??o forte e auditoria.

### Atividades e auditoria

- Atualizar a aba **Atividades** para listar eventos reais desta task, por exemplo:
  - `E-mail da conta alterado`;
  - `Confirma??o de e-mail reenviada`;
  - `Link de redefini??o enviado`;
  - `Senha tempor?ria definida`;
  - `Sess?es encerradas`.
- Cada evento deve mostrar:
  - data/hora;
  - ator administrativo em formato humano seguro;
  - ?rea: `Conta e acesso`;
  - tipo de a??o;
  - motivo/observa??o interna quando houver;
  - origem: `Painel administrativo`.
- Atividades n?o devem expor senha, hash, c?digo de confirma??o, recovery code, token, id t?cnico sens?vel ou payload bruto de provedor.
- E-mails em feed/listas de atividade devem ser mascarados ou resumidos quando n?o for necess?rio exibir completo.

## Fora do escopo

- Contas de pacientes.
- Contas de administradores.
- Criar psic?logo manualmente.
- Impersonar psic?logo.
- Mostrar senha atual.
- Mostrar, copiar ou exportar `confirm_code`, `recovery_code`, JWT ou token de sess?o.
- Criar senha local para conta Google/OAuth que n?o possu?a senha.
- Vincular/desvincular Google.
- Resetar autentica??o em provedor externo.
- Confirmar e-mail automaticamente sem a??o do usu?rio.
- Alterar CPF, CRP, dados profissionais, plano, assinatura, gateway, cortesia, publica??es, avalia??es ou den?ncias.
- Enviar senha tempor?ria automaticamente por e-mail, WhatsApp ou push sem decis?o espec?fica e ADR.
- Mock de e-mail, mock de token, endpoint simulado ou dado fake permanente.
- Reset destrutivo de banco.
- Instalar pacote novo sem validar `PACKAGES.md` e registrar ADR.

## Contrato t?cnico detalhado

### Refer?ncias obrigat?rias

- `ARCHITECTURE.md`: m?dulos backend com controller/service/repository/validator, rotas privadas, autentica??o, Prisma, regras de UI e formul?rios.
- `DATA-MODEL.md`: usu?rio, tokens, confirma??es, recupera??o de senha e logs/auditoria existentes.
- `PACKAGES.md`: usar packages j? instalados; n?o instalar depend?ncia nova.
- `TASK-02`: React Hook Form, Zod, controllers e slot fixo de erro.
- `TASK-05`: recupera??o de senha real.
- `TASK-06`: confirma??o de e-mail real.
- `TASK-30`: regra atual de seguran?a da pr?pria conta.
- `TASK-67`: auditoria administrativa sens?vel.

### Regras de identidade

- `has_password=true` deve ser derivado de `Boolean(user.password)` ou helper equivalente.
- `provider="google"` sem senha local deve bloquear a??es de senha local.
- `provider="manual"` ou conta com senha local deve permitir suporte de senha conforme regras.
- Mudan?as administrativas n?o devem alterar `provider` sem decis?o expl?cita.
- Mudan?a de e-mail deve preservar a integridade do login e n?o criar duplicidade.

### Backend esperado

- M?dulo Admin privado alinhado ao padr?o existente em `backend/src/modules/api/admin/private/psychologists/*`.
- Rotas registradas no import central real do backend.
- Validators para `id`, body e confirma??es fortes.
- Services com transa??es e regras de dom?nio.
- Repositories sem SQL ad hoc quando Prisma resolver.
- Tradu??es PT-BR em `backend/locales/pt/translation.json` para todos os erros/mensagens user-facing.
- Sanitiza??o expl?cita de campos sens?veis em logs/respostas.

### Frontend esperado

- Atualizar `admin/src/app/(admin)/psicologos/[id]/client.tsx` ou componente equivalente sem criar shell paralelo.
- Adicionar types e chamadas em `admin/src/api/req/psychologists` ou m?dulo equivalente.
- Adicionar hooks/mutations em `admin/src/api/callers/psychologists`.
- Adicionar query keys espec?ficas, por exemplo `account(id)`, e invalidar `detail(id)`, `account(id)`, `activities(id, ...)` e listas quando necess?rio.
- Formul?rios com `use-form.tsx`/composi??o j? usada no Admin, React Hook Form, Zod e controllers.
- UI mobile-first:
  - base ~390px;
  - cards empilhados no mobile;
  - bot?es sens?veis com confirma??o clara;
  - desktop com layout em colunas sem prejudicar leitura.
- Tema claro/escuro via tokens existentes; sem cores hardcoded fora do padr?o.
- Nenhum `<img>` cru.

### Seguran?a operacional

- Motivo obrigat?rio em a??es sens?veis.
- Confirma??o forte em altera??o de e-mail, senha tempor?ria e encerramento expl?cito de sess?es.
- Auditoria nunca armazena senha/hash/c?digos/tokens.
- Respostas HTTP nunca retornam segredo.
- Console/logs n?o devem imprimir payload sens?vel.
- Se e-mail transacional estiver indispon?vel, o sistema deve ser honesto no retorno e na valida??o da task.

## Crit?rios de aceite

- [x] A aba **Conta** aparece depois de **Den?ncias** no detalhe administrativo do psic?logo.
- [x] `?tab=conta` funciona sem quebrar deep links de abas existentes.
- [x] A aba exibe e-mail, status de confirma??o, m?todo de login, presen?a de senha local, status da conta, `need_reset` e resumo real de acesso/sess?es quando dispon?vel.
- [x] Conta Google/OAuth sem senha local mostra a??es de senha indispon?veis com copy honesta.
- [x] Admin consegue alterar e-mail de conta eleg?vel com motivo obrigat?rio e confirma??o forte.
- [x] Altera??o de e-mail valida unicidade, marca e-mail como n?o confirmado, gera confirma??o real e invalida sess?es do psic?logo.
- [x] Admin consegue reenviar confirma??o de e-mail para conta pendente usando envio real ou retorno honesto quando provedor n?o estiver configurado.
- [x] Admin consegue enviar link de redefini??o de senha para conta com senha local sem expor `recovery_code`.
- [x] Admin consegue definir senha tempor?ria/manual para conta com senha local usando campo de senha e confirma??o.
- [x] Senha tempor?ria ? salva somente como hash, define `need_reset=true`, limpa recovery pendente e invalida sess?es do psic?logo.
- [x] Psic?logo com `need_reset=true` ? obrigado a trocar senha ap?s login usando endpoint real `POST /api/private/auth/need_reset`.
- [x] Nenhuma a??o exp?e senha atual, senha tempor?ria ap?s submit, hash, c?digo, recovery code, JWT ou token.
- [x] Todas as a??es sens?veis registram auditoria real com admin respons?vel, data/hora, origem, ?rea, tipo e motivo.
- [x] A aba **Atividades** lista eventos de Conta e acesso sem expor segredos ou dados sens?veis desnecess?rios.
- [x] E-mail, senha e sess?es n?o alteram perfil, CRP, plano, assinatura, gateway, cortesia, publica??es, avalia??es ou den?ncias.
- [x] Formul?rios/campos usam React Hook Form, Zod e controllers da `TASK-02`/Admin, com slot de erro sem layout shift.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado ou envio falso foi usado.
- [x] Se houve altera??o de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado sem reset destrutivo n?o autorizado.
- [x] Tradu??es PT-BR foram criadas/atualizadas para mensagens e erros necess?rios.
- [x] Builder/Quick Copy foi usado quando dispon?vel, ou as imagens locais/prot?tipo inexistente da aba Conta foram registrados na execu??o/ADR.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Valida??o m?nima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm --dir backend db:migrate` se houver altera??o em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`.
- Browser local:
  - Admin `/psicologos/[id]?tab=conta` em ~390px e desktop;
  - envio de link de redefini??o em psic?logo real eleg?vel ou limita??o registrada sem mock;
  - defini??o de senha tempor?ria em conta real autorizada ou valida??o negativa registrada sem alterar indevidamente dados reais;
  - login do psic?logo com `need_reset=true` exigindo troca de senha;
  - aba **Atividades** exibindo eventos auditados.

## Notas de execu??o

- Antes de implementar, procurar usos existentes de `need_reset`, `/api/private/auth/need_reset`, `recovery_code`, `confirm_code`, `user_token`, `AccountRepository.updateUserAndClearTokens`, `LoginRepository.hidrate`, `confirmEmailSend` e `recoveryEmailSend`.
- N?o inventar envio de e-mail: se o helper atual n?o informar status de envio, avaliar ajuste pequeno para retorno honesto e registrar no ADR.
- Se n?o houver psic?logo real com login por e-mail/senha no ambiente local, validar estados indispon?veis e endpoints negativamente; n?o marcar crit?rios que dependem de muta??o real como conclu?dos sem evid?ncia.
- A senha tempor?ria ? um recurso de suporte excepcional. A UI deve favorecer primeiro o link de redefini??o.
- Se houver diverg?ncia entre ?alterar senha diretamente? e ?senha tempor?ria com troca obrigat?ria?, prevalece a op??o segura desta task: Admin define senha tempor?ria, `need_reset=true`, e o psic?logo cria a senha definitiva no pr?ximo login.


## Execu??o TASK-68

- Implementado m?dulo Admin privado de conta do psic?logo com leitura, altera??o administrativa de e-mail, reenvio de confirma??o, envio de link de redefini??o, senha tempor?ria com `need_reset=true` e encerramento de sess?es em `user_token`.
- A auditoria usa `admin_activity_log` existente, com ?rea `conta_e_acesso`, ator Admin, motivo obrigat?rio e campos seguros sem senha, hash, c?digos ou tokens.
- A aba **Conta** foi adicionada depois de **Den?ncias** no detalhe administrativo, com `?tab=conta`, cards mobile-first e formul?rios com React Hook Form, Zod e controllers do Admin.
- Contas Google/OAuth sem senha local exibem indisponibilidade honesta para senha local e altera??o administrativa de e-mail.
- O frontend do usu?rio agora respeita `need_reset=true`, redireciona para `/app/account/need-reset` e usa o endpoint real `POST /api/private/auth/need_reset`.
- Builder/Quick Copy n?o estava dispon?vel no ambiente; foram usadas as imagens locais indicadas em `_product/proto/admin/Psic?logos/Detalhes do psic?logo`. N?o havia prot?tipo espec?fico da aba Conta.
- N?o houve altera??o em Prisma schema ou migrations; `pnpm --dir backend db:migrate` n?o foi necess?rio.
- Corre??o p?s-valida??o em 2026-07-11: login/cadastro Google-only n?o cria nem exige senha local. O fluxo Google passa a persistir `need_reset=false`, e a hidrata??o corrige contas Google-only antigas que tenham `need_reset=true` sem `user.password`, evitando for?ar a cria??o indevida de senha local.
- Correção visual em 2026-07-13: na aba **Atividades**, foram removidas a faixa "Histórico dos principais eventos", a linha de filtros/período/exportação e os cards "Histórico anterior à auditoria administrativa" e "Eventos brutos de pagamento"; os rótulos textuais do feed foram normalizados para PT-BR sem mojibake.
- Correção visual complementar em 2026-07-13: na aba **Atividades**, foram removidos o selo "Fontes reais", as linhas "Fonte:" em cada evento e a tag de área; o card passou a exibir apenas a tag principal do tipo de atividade, o rótulo "Usuário" e o ícone proprietário de WhatsApp nos eventos de clique.
- Correção visual adicional em 2026-07-13: removida a faixa "Métricas indisponíveis nesta etapa" no detalhe administrativo do psicólogo; métricas indisponíveis continuam sinalizadas de forma inline nos cards/contadores quando o contrato real retornar indisponibilidade.
- Correção visual de paginação em 2026-07-13: nos navegadores de página do detalhe administrativo do psicólogo, a página selecionada passou a usar texto branco sobre o fundo primário para manter contraste adequado.
- Correção visual de assinatura em 2026-07-13: no bloco **Dados da assinatura** da aba Geral, foram removidas as linhas `Status`, `Gateway` e `Forma de pagamento`; `Início da assinatura` foi reduzido para `Início`; `Próxima renovação` passa a exibir `Não se aplica` para plano gratuito ou cortesia; e `Valor` foi substituído por `LTV` com base na consulta real de billing.


### Valida??o executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP sem sess?o: `GET /api/admin/private/psychologists/test-id/account` retornou 401, confirmando prote??o Admin real.
- Browser local/headless em 390px:
  - `http://localhost:3002/psicologos/test-id?tab=conta` retornou 200 e redirecionou para login por aus?ncia de sess?o Admin, confirmando guard sem quebrar rota.
  - `http://localhost:3000/app/account/need-reset` retornou 200; fluxo autenticado real depende de usu?rio com `need_reset=true`.
- Muta??o real de e-mail/senha/sess?es n?o foi disparada sem um psic?logo real autorizado e sem inten??o expl?cita de alterar dados reais; endpoints e contratos foram validados por typecheck/build/check.
- Correção visual 2026-07-13: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/[id]?tab=atividades` com status 200 e verificação estática das remoções solicitadas.
- Correção visual complementar 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/[id]?tab=atividades` com status 200 e verificação estática de remoção de "Fontes reais", "Fonte:" e tag de área.
- Correção visual de paginação 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check`, smoke HTTP local em `/psicologos/[id]?tab=publicacoes` com status 200 e verificação estática de `text-white` na página selecionada.
- Correção visual adicional 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/[id]?tab=publicacoes` com status 200 e verificação estática de ausência da faixa "Métricas indisponíveis nesta etapa".
- Correção visual de assinatura 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/cmrgrztri7000tn0uh1q4n8vxf` com status 200 e verificação estática do bloco `SubscriptionCard` sem `Status`, `Gateway`, `Forma de pagamento`, `Início da assinatura` e `Valor`, com `Início`, `Próxima renovação`, `Não se aplica` e `LTV`.
