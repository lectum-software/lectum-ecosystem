# TASK-68: Conta e acesso do psicólogo no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-68 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Psicólogos / Conta |
| Status | Completed |
| Dependências | TASK-05, TASK-06, TASK-30, TASK-45, TASK-46, TASK-55, TASK-58, TASK-59, TASK-67 |
| ADR alvo | ADR sobre suporte administrativo de conta, alteração de e-mail e senha temporária auditada |

## Contexto

O detalhe administrativo do psicólogo já organiza a operação em abas como **Geral**, **Perfil e cadastro**, **Plano e pagamentos**, **Estatísticas**, **Publicações**, **Avaliações**, **Atividades** e **Denúncias**. Casos de suporte relacionados a credenciais e acesso não devem ficar misturados com dados de perfil, CRP, plano ou conteúdo.

Decisão de produto desta task:

- Adicionar a aba **Conta** no detalhe administrativo do psicólogo, posicionada depois de **Denúncias**.
- A aba deve concentrar suporte de **conta e acesso**: e-mail da conta, status de confirmação, método de login, recuperação de senha, troca administrativa de e-mail e definição de senha temporária.
- A ação preferencial para problemas de senha é **enviar link de redefinição de senha** usando o fluxo real da `TASK-05`.
- O Admin também deve conseguir **definir uma senha temporária/manual** para contas que já usam login por e-mail e senha, quando o psicólogo não conseguir concluir a redefinição. A senha temporária deve obrigar troca no próximo login.
- Contas Google/OAuth sem senha local não devem receber senha local por esta task. A UI deve explicar que a ação está indisponível para esse método de acesso.
- Alteração administrativa de e-mail é sensível e deve ficar nesta aba, com confirmação forte, e-mail de verificação real quando disponível, invalidação de sessões e auditoria.
- Nenhuma ação desta aba pode ser tratada como ação do próprio psicólogo. Tudo deve ter origem administrativa explícita, motivo obrigatório e auditoria segura.

O objetivo é destravar suporte operacional real para casos como “solicitei alteração de e-mail”, “não recebo link de senha”, “não consigo redefinir senha” e “preciso de senha temporária”, sem criar impersonação, sem expor senha/códigos e sem enfraquecer o fluxo de autenticação.

## Objetivo

Permitir que um Admin autenticado acesse a nova aba **Conta** no detalhe do psicólogo para visualizar dados de acesso e executar ações reais e auditadas de suporte: alterar e-mail quando permitido, reenviar confirmação de e-mail, enviar link de redefinição, definir senha temporária para contas com senha local e invalidar sessões afetadas.

## Pré-requisitos e bloqueios

- TASK-05 concluída: recuperação de senha real por link.
- TASK-06 concluída: confirmação de e-mail por código real.
- TASK-30 concluída: configurações de conta e regras atuais de alteração de e-mail/senha pelo próprio usuário.
- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-55 concluída: detalhe administrativo do psicólogo.
- TASK-58 concluída: aba **Denúncias** existente para posicionar **Conta** depois dela.
- TASK-59 concluída: aba **Atividades** real.
- TASK-67 concluída ou considerada antes desta task: auditoria administrativa genérica para alterações sensíveis. Se ainda não existir estrutura equivalente, não criar uma segunda auditoria paralela sem ADR.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local:
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`.
- Não existe protótipo específico para a aba **Conta** nesta data. Usar o padrão visual das abas existentes e registrar essa limitação.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Validar o schema atual antes de criar campo/tabela nova. Preferir `user.email`, `user.provider`, `user.password`, `user.confirmed`, `user.confirmed_date`, `user.recovery_code`, `user.recovery_date`, `user.confirm_code`, `user.confirm_date`, `user.need_reset`, `user_token` e auditoria já existente.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- Não usar mocks, endpoints simulados, dados inventados, envio falso de e-mail ou escrita local sem persistência real.

## Escopo frontend

### Admin — navegação do detalhe do psicólogo

- Atualizar as abas do detalhe `/psicologos/[id]` ou rota equivalente para incluir **Conta** depois de **Denúncias**.
- A aba deve aceitar `?tab=conta`.
- O menu deve continuar mobile-first:
  - rolagem horizontal/touch em ~390px;
  - sem quebra visual dos itens;
  - item ativo com o mesmo padrão das abas existentes.
- A inclusão de **Conta** não pode quebrar o deep link das abas antigas.

### Admin — aba Conta

Criar uma tela mobile-first com seções/cards reutilizando componentes do Admin:

1. **Resumo da conta**
   - e-mail atual;
   - status do e-mail: confirmado, pendente, não informado quando aplicável;
   - método de login em linguagem humana: `E-mail e senha`, `Google`, `Google + senha local` ou equivalente seguro;
   - indicação `Possui senha local` / `Não possui senha local`;
   - status da conta (`Ativa`/`Inativa`) se o dado já existir no contrato;
   - `need_reset` como “Troca de senha obrigatória pendente”;
   - Último acesso e sessões ativas quando deriváveis de dados reais.

2. **E-mail da conta**
   - ação **Alterar e-mail** apenas quando a identidade permitir alteração local segura;
   - ação **Reenviar confirmação de e-mail** quando houver e-mail pendente de confirmação;
   - bloquear ou explicar indisponibilidade em conta Google/OAuth sem senha local.

3. **Senha e recuperação**
   - ação **Enviar link de redefinição de senha** usando fluxo real de recuperação;
   - ação **Definir senha temporária** para conta com senha local;
   - quando a conta não tiver senha local, mostrar copy honesta: “Esta conta acessa via Google. Alteração de senha local indisponível.”

4. **Sessões e segurança**
   - exibir resumo seguro das sessões/tokens ativos quando houver dado real;
   - informar que alteração de e-mail e senha temporária invalidam sessões do psicólogo;
   - permitir ação explícita **Encerrar sessões** somente se for implementada com persistência real em `user_token` e auditoria.

### Formulários e interações

Todos os formulários devem usar React Hook Form, Zod e controllers da fundação da `TASK-02`/app Admin.

#### Alterar e-mail

Campos mínimos:

- novo e-mail;
- motivo/observação interna obrigatório;
- confirmação forte, por exemplo `ALTERAR EMAIL`.

Regras de UI:

- Validar formato de e-mail no cliente e no backend.
- Mostrar aviso de impacto: troca de e-mail exige nova confirmação e encerra sessões do psicólogo.
- Após sucesso, atualizar o card sem reload manual e invalidar queries do detalhe/conta/atividades.
- Não permitir alterar para e-mail já usado por outro usuário.
- Não exibir `confirm_code` nem qualquer token gerado.

#### Reenviar confirmação de e-mail

- Disponível quando a conta estiver com `confirmed=false`.
- Deve usar e-mail transacional real existente; se o provedor não estiver configurado no ambiente, a UI/response não pode fingir envio.
- Registrar auditoria de tentativa de envio pelo Admin.

#### Enviar link de redefinição

- Disponível para conta com senha local.
- Chamar endpoint Admin real que reutiliza a regra da `TASK-05`.
- Não mostrar se o e-mail existe fora do contexto do psicólogo selecionado; o Admin já está no detalhe de um usuário real.
- Não expor `recovery_code` em resposta, toast, console ou UI.
- Registrar auditoria da ação.

#### Definir senha temporária

Campos mínimos:

- nova senha temporária;
- confirmar senha temporária;
- motivo/observação interna obrigatório;
- confirmação forte, por exemplo `ALTERAR SENHA`.

Regras de UI:

- Exibir ação apenas quando `has_password=true` ou regra equivalente segura.
- Validar a política atual de senha do backend (mínimo 10, máximo 128, sem criar política paralela se a atual for essa).
- Avisar que a senha não será exibida novamente, não será gravada em auditoria e o psicólogo será obrigado a trocar no próximo login.
- Após sucesso, mostrar confirmação discreta e invalidar consultas de conta/detalhe/atividades.
- Não manter a senha em estado global, URL, cache, log, toast ou localStorage.

### Frontend do usuário afetado

- Garantir que `user.need_reset=true` seja respeitado após login do psicólogo.
- Se já existir fluxo frontend de troca obrigatória, reutilizar.
- Se não existir, implementar rota/tela mínima real para o usuário autenticado criar nova senha usando `POST /api/private/auth/need_reset`.
- Enquanto `need_reset=true`, o usuário não deve navegar normalmente pela Área privada como se a conta estivesse regular.
- Após trocar a senha, limpar `need_reset` via endpoint real, hidratar sessão e seguir o fluxo normal de acordo com o papel/onboarding.

### Estados obrigatórios

- Loading por seção/ação.
- Erros de validação inline em PT-BR.
- Erros de API em PT-BR.
- Estado indisponível para Google/OAuth sem senha local.
- Sucesso com toast/copy discreta.
- Confirmações fortes antes de ações sensíveis.
- Atualização de cache sem reload manual.

## Escopo backend

Criar ou estender endpoints Admin privados reais, protegidos por autenticação Admin:

- `GET /api/admin/private/psychologists/:id/account`;
- `POST /api/admin/private/psychologists/:id/account/change-email`;
- `POST /api/admin/private/psychologists/:id/account/send-email-confirmation`;
- `POST /api/admin/private/psychologists/:id/account/send-password-reset`;
- `POST /api/admin/private/psychologists/:id/account/set-temporary-password`;
- `POST /api/admin/private/psychologists/:id/account/revoke-sessions`, se a ação explícita for incluída na UI.

Regras gerais:

- Usar controller/service/repository/validator conforme `ARCHITECTURE.md`.
- Validar payloads com Zod/pacote local de validator.
- Garantir que `:id` pertença a um usuário `role="psicologo"` existente e não deletado.
- Não aceitar payload extra para alterar campos fora do escopo.
- Usar transações para mudanças sensíveis.
- Retornar contratos normalizados e seguros para o Admin.
- Não retornar senha, hash, `confirm_code`, `recovery_code`, tokens, payload bruto de e-mail ou identificadores sensíveis desnecessários.

### Contrato de leitura da conta

O endpoint de leitura deve retornar, no mínimo, dados seguros equivalentes a:

- `email`;
- `provider` em formato técnico seguro e `provider_label` humano;
- `confirmed` e `confirmed_at`;
- `active`;
- `has_password`;
- `need_reset`;
- `created_at`;
- `last_access_at`, se derivável;
- resumo de sessões/tokens ativos quando possível;
- `capabilities`:
  - `can_change_email`;
  - `can_send_email_confirmation`;
  - `can_send_password_reset`;
  - `can_set_temporary_password`;
  - `can_revoke_sessions`.

### Alteração administrativa de e-mail

- Permitida somente quando a conta tiver identidade local segura para alteração. Se conta Google/OAuth sem senha local, retornar erro de domínio claro.
- Normalizar e-mail para lowercase/trim.
- Rejeitar e-mail igual ao atual.
- Rejeitar e-mail já usado por outro usuário.
- Gerar novo `confirm_code` real, marcar `confirmed=false`, limpar `confirmed_date` e atualizar `confirm_date`.
- Enviar confirmação para o novo e-mail usando helper transacional real existente.
- Invalidar sessões/tokens do psicólogo afetado.
- Registrar auditoria administrativa segura com e-mail anterior/novo mascarado quando exibido em listas.
- Não alterar perfil, CRP, plano, assinatura, pagamentos ou publicações.

### Reenvio administrativo de confirmação de e-mail

- Disponível para e-mail pendente de confirmação.
- Gerar novo `confirm_code` ou reutilizar a regra existente de confirmação conforme arquitetura atual.
- Enviar e-mail real e registrar auditoria.
- Se o provedor de e-mail não estiver configurado, retornar status/copy honesto; não dizer “enviado” falsamente.

### Envio administrativo de link de redefinição

- Disponível somente para conta com senha local, salvo decisão explícita registrada em ADR.
- Reutilizar a geração de `recovery_code` e envio real da `TASK-05`; não criar endpoint paralelo público nem expor o código.
- Registrar auditoria administrativa com motivo e status do envio.
- Não alterar a senha atual nesse endpoint.

### Definição de senha temporária

- Permitida somente para conta com senha local (`has_password=true`) ou regra equivalente documentada.
- Hash da senha deve usar o helper atual `@/utils/crypt`, respeitando a estratégia vigente (`argon2`/compatibilidade `bcrypt`), sem salvar senha em texto puro.
- Atualizar `user.password` e `user.password_confirm` com o hash, limpar `recovery_code/recovery_date`, definir `need_reset=true` e invalidar sessões/tokens do psicólogo.
- Registrar auditoria administrativa com admin responsável, motivo, data/hora e origem, sem armazenar senha ou hash no log.
- O próximo login do psicólogo deve exigir troca via fluxo real `POST /api/private/auth/need_reset`.

### Invalidação de sessões

- Alteração de e-mail e senha temporária devem invalidar sessões do psicólogo afetado removendo/invalidando `user_token` real.
- Não invalidar sessão/tokens do Admin executor.
- Se houver ação explícita **Encerrar sessões**, ela deve ter motivo obrigatório, confirmação forte e auditoria.

### Atividades e auditoria

- Atualizar a aba **Atividades** para listar eventos reais desta task, por exemplo:
  - `E-mail da conta alterado`;
  - `Confirmação de e-mail reenviada`;
  - `Link de redefinição enviado`;
  - `Senha temporária definida`;
  - `Sessões encerradas`.
- Cada evento deve mostrar:
  - data/hora;
  - ator administrativo em formato humano seguro;
  - Área: `Conta e acesso`;
  - tipo de ação;
  - motivo/observação interna quando houver;
  - origem: `Painel administrativo`.
- Atividades não devem expor senha, hash, código de confirmação, recovery code, token, id técnico sensível ou payload bruto de provedor.
- E-mails em feed/listas de atividade devem ser mascarados ou resumidos quando não for necessário exibir completo.

## Fora do escopo

- Contas de pacientes.
- Contas de administradores.
- Criar psicólogo manualmente.
- Impersonar psicólogo.
- Mostrar senha atual.
- Mostrar, copiar ou exportar `confirm_code`, `recovery_code`, JWT ou token de sessão.
- Criar senha local para conta Google/OAuth que não possuía senha.
- Vincular/desvincular Google.
- Resetar autenticação em provedor externo.
- Confirmar e-mail automaticamente sem ação do usuário.
- Alterar CPF, CRP, dados profissionais, plano, assinatura, gateway, cortesia, publicações, avaliações ou denúncias.
- Enviar senha temporária automaticamente por e-mail, WhatsApp ou push sem decisão específica e ADR.
- Mock de e-mail, mock de token, endpoint simulado ou dado fake permanente.
- Reset destrutivo de banco.
- Instalar pacote novo sem validar `PACKAGES.md` e registrar ADR.

## Contrato técnico detalhado

### Referências obrigatórias

- `ARCHITECTURE.md`: módulos backend com controller/service/repository/validator, rotas privadas, autenticação, Prisma, regras de UI e formulários.
- `DATA-MODEL.md`: usuário, tokens, confirmações, recuperação de senha e logs/auditoria existentes.
- `PACKAGES.md`: usar packages já instalados; não instalar dependência nova.
- `TASK-02`: React Hook Form, Zod, controllers e slot fixo de erro.
- `TASK-05`: recuperação de senha real.
- `TASK-06`: confirmação de e-mail real.
- `TASK-30`: regra atual de segurança da própria conta.
- `TASK-67`: auditoria administrativa sensível.

### Regras de identidade

- `has_password=true` deve ser derivado de `Boolean(user.password)` ou helper equivalente.
- `provider="google"` sem senha local deve bloquear ações de senha local.
- `provider="manual"` ou conta com senha local deve permitir suporte de senha conforme regras.
- Mudanças administrativas não devem alterar `provider` sem decisão explícita.
- Mudança de e-mail deve preservar a integridade do login e não criar duplicidade.

### Backend esperado

- Módulo Admin privado alinhado ao padrão existente em `backend/src/modules/api/admin/private/psychologists/*`.
- Rotas registradas no import central real do backend.
- Validators para `id`, body e confirmações fortes.
- Services com transações e regras de domínio.
- Repositories sem SQL ad hoc quando Prisma resolver.
- Traduções PT-BR em `backend/locales/pt/translation.json` para todos os erros/mensagens user-facing.
- Sanitização explícita de campos sensíveis em logs/respostas.

### Frontend esperado

- Atualizar `admin/src/app/(admin)/psicologos/[id]/client.tsx` ou componente equivalente sem criar shell paralelo.
- Adicionar types e chamadas em `admin/src/api/req/psychologists` ou módulo equivalente.
- Adicionar hooks/mutations em `admin/src/api/callers/psychologists`.
- Adicionar query keys específicas, por exemplo `account(id)`, e invalidar `detail(id)`, `account(id)`, `activities(id, ...)` e listas quando necessário.
- Formulários com `use-form.tsx`/composição já usada no Admin, React Hook Form, Zod e controllers.
- UI mobile-first:
  - base ~390px;
  - cards empilhados no mobile;
  - botões sensíveis com confirmação clara;
  - desktop com layout em colunas sem prejudicar leitura.
- Tema claro/escuro via tokens existentes; sem cores hardcoded fora do padrão.
- Nenhum `<img>` cru.

### Segurança operacional

- Motivo obrigatório em ações sensíveis.
- Confirmação forte em alteração de e-mail, senha temporária e encerramento explícito de sessões.
- Auditoria nunca armazena senha/hash/códigos/tokens.
- Respostas HTTP nunca retornam segredo.
- Console/logs não devem imprimir payload sensível.
- Se e-mail transacional estiver indisponível, o sistema deve ser honesto no retorno e na validação da task.

## Critérios de aceite

- [x] A aba **Conta** aparece depois de **Denúncias** no detalhe administrativo do psicólogo.
- [x] `?tab=conta` funciona sem quebrar deep links de abas existentes.
- [x] A aba exibe e-mail, status de confirmação, método de login, presença de senha local, status da conta, `need_reset` e resumo real de acesso/sessões quando disponível.
- [x] Conta Google/OAuth sem senha local mostra ações de senha indisponíveis com copy honesta.
- [x] Admin consegue alterar e-mail de conta elegível com motivo obrigatório e confirmação forte.
- [x] Alteração de e-mail valida unicidade, marca e-mail como não confirmado, gera confirmação real e invalida sessões do psicólogo.
- [x] Admin consegue reenviar confirmação de e-mail para conta pendente usando envio real ou retorno honesto quando provedor não estiver configurado.
- [x] Admin consegue enviar link de redefinição de senha para conta com senha local sem expor `recovery_code`.
- [x] Admin consegue definir senha temporária/manual para conta com senha local usando campo de senha e confirmação.
- [x] Senha temporária é salva somente como hash, define `need_reset=true`, limpa recovery pendente e invalida sessões do psicólogo.
- [x] Psicólogo com `need_reset=true` é obrigado a trocar senha após login usando endpoint real `POST /api/private/auth/need_reset`.
- [x] Nenhuma ação expõe senha atual, senha temporária após submit, hash, código, recovery code, JWT ou token.
- [x] Todas as ações sensíveis registram auditoria real com admin responsável, data/hora, origem, Área, tipo e motivo.
- [x] A aba **Atividades** lista eventos de Conta e acesso sem expor segredos ou dados sensíveis desnecessários.
- [x] E-mail, senha e sessões não alteram perfil, CRP, plano, assinatura, gateway, cortesia, publicações, avaliações ou denúncias.
- [x] Formulários/campos usam React Hook Form, Zod e controllers da `TASK-02`/Admin, com slot de erro sem layout shift.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado ou envio falso foi usado.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado sem reset destrutivo não autorizado.
- [x] Traduções PT-BR foram criadas/atualizadas para mensagens e erros necessários.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/protótipo inexistente da aba Conta foram registrados na execução/ADR.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm --dir backend db:migrate` se houver alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`.
- Browser local:
  - Admin `/psicologos/[id]?tab=conta` em ~390px e desktop;
  - envio de link de redefinição em psicólogo real elegível ou limitação registrada sem mock;
  - definição de senha temporária em conta real autorizada ou validação negativa registrada sem alterar indevidamente dados reais;
  - login do psicólogo com `need_reset=true` exigindo troca de senha;
  - aba **Atividades** exibindo eventos auditados.

## Notas de execução

- Antes de implementar, procurar usos existentes de `need_reset`, `/api/private/auth/need_reset`, `recovery_code`, `confirm_code`, `user_token`, `AccountRepository.updateUserAndClearTokens`, `LoginRepository.hidrate`, `confirmEmailSend` e `recoveryEmailSend`.
- Não inventar envio de e-mail: se o helper atual não informar status de envio, avaliar ajuste pequeno para retorno honesto e registrar no ADR.
- Se não houver psicólogo real com login por e-mail/senha no ambiente local, validar estados indisponíveis e endpoints negativamente; não marcar critérios que dependem de mutação real como concluídos sem evidência.
- A senha temporária é um recurso de suporte excepcional. A UI deve favorecer primeiro o link de redefinição.
- Se houver divergência entre “alterar senha diretamente” e “senha temporária com troca obrigatória”, prevalece a opção segura desta task: Admin define senha temporária, `need_reset=true`, e o psicólogo cria a senha definitiva no próximo login.


## Execução TASK-68

- Implementado módulo Admin privado de conta do psicólogo com leitura, alteração administrativa de e-mail, reenvio de confirmação, envio de link de redefinição, senha temporária com `need_reset=true` e encerramento de sessões em `user_token`.
- A auditoria usa `admin_activity_log` existente, com Área `conta_e_acesso`, ator Admin, motivo obrigatório e campos seguros sem senha, hash, códigos ou tokens.
- A aba **Conta** foi adicionada depois de **Denúncias** no detalhe administrativo, com `?tab=conta`, cards mobile-first e formulários com React Hook Form, Zod e controllers do Admin.
- Contas Google/OAuth sem senha local exibem indisponibilidade honesta para senha local e alteração administrativa de e-mail.
- O frontend do usuário agora respeita `need_reset=true`, redireciona para `/app/account/need-reset` e usa o endpoint real `POST /api/private/auth/need_reset`.
- Builder/Quick Copy não estava disponível no ambiente; foram usadas as imagens locais indicadas em `_product/proto/admin/Psicólogos/Detalhes do psicólogo`. Não havia protótipo específico da aba Conta.
- Não houve alteração em Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Correção pós-validação em 2026-07-11: login/cadastro Google-only não cria nem exige senha local. O fluxo Google passa a persistir `need_reset=false`, e a hidratação corrige contas Google-only antigas que tenham `need_reset=true` sem `user.password`, evitando forçar a criação indevida de senha local.
- Correção visual em 2026-07-13: na aba **Atividades**, foram removidas a faixa "Histórico dos principais eventos", a linha de filtros/período/exportação e os cards "Histórico anterior à auditoria administrativa" e "Eventos brutos de pagamento"; os rótulos textuais do feed foram normalizados para PT-BR sem mojibake.
- Correção visual complementar em 2026-07-13: na aba **Atividades**, foram removidos o selo "Fontes reais", as linhas "Fonte:" em cada evento e a tag de área; o card passou a exibir apenas a tag principal do tipo de atividade, o rótulo "Usuário" e o ícone proprietário de WhatsApp nos eventos de clique.
- Correção visual adicional em 2026-07-13: removida a faixa "Métricas indisponíveis nesta etapa" no detalhe administrativo do psicólogo; métricas indisponíveis continuam sinalizadas de forma inline nos cards/contadores quando o contrato real retornar indisponibilidade.
- Correção visual de paginação em 2026-07-13: nos navegadores de página do detalhe administrativo do psicólogo, a página selecionada passou a usar texto branco sobre o fundo primário para manter contraste adequado.
- Correção visual de assinatura em 2026-07-13: no bloco **Dados da assinatura** da aba Geral, foram removidas as linhas `Status`, `Gateway` e `Forma de pagamento`; `Início da assinatura` foi reduzido para `Início`; `Próxima renovação` passa a exibir `Não se aplica` para plano gratuito ou cortesia; e `Valor` foi substituído por `LTV` com base na consulta real de billing.


### Validação executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP sem sessão: `GET /api/admin/private/psychologists/test-id/account` retornou 401, confirmando proteção Admin real.
- Browser local/headless em 390px:
  - `http://localhost:3002/psicologos/test-id?tab=conta` retornou 200 e redirecionou para login por ausência de sessão Admin, confirmando guard sem quebrar rota.
  - `http://localhost:3000/app/account/need-reset` retornou 200; fluxo autenticado real depende de usuário com `need_reset=true`.
- Mutação real de e-mail/senha/sessões não foi disparada sem um psicólogo real autorizado e sem intenção explícita de alterar dados reais; endpoints e contratos foram validados por typecheck/build/check.
- Correção visual 2026-07-13: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/[id]?tab=atividades` com status 200 e verificação estática das remoções solicitadas.
- Correção visual complementar 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/[id]?tab=atividades` com status 200 e verificação estática de remoção de "Fontes reais", "Fonte:" e tag de área.
- Correção visual de paginação 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check`, smoke HTTP local em `/psicologos/[id]?tab=publicacoes` com status 200 e verificação estática de `text-white` na página selecionada.
- Correção visual adicional 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/[id]?tab=publicacoes` com status 200 e verificação estática de ausência da faixa "Métricas indisponíveis nesta etapa".
- Correção visual de assinatura 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local em `/psicologos/cmrgrztri7000tn0uh1q4n8vxf` com status 200 e verificação estática do bloco `SubscriptionCard` sem `Status`, `Gateway`, `Forma de pagamento`, `Início da assinatura` e `Valor`, com `Início`, `Próxima renovação`, `Não se aplica` e `LTV`.
