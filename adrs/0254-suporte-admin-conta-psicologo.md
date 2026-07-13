# ADR-0254 - Suporte administrativo de conta do psicólogo

## Status

Accepted

## Contexto

A TASK-68 precisava centralizar no Admin operações de suporte sobre credenciais e acesso do psicólogo sem misturar com perfil, CRP, plano ou conteúdo. As ações envolvem e-mail de login, confirmação, recuperação de senha, senha temporária e sessões, todas sensíveis e com risco operacional se tratadas como ação do próprio psicólogo.

Também já existia auditoria administrativa genérica da TASK-67 via `admin_activity_log`, portanto criar uma segunda trilha de auditoria seria redundante e dificultaria a aba Atividades.

## Decisão

- Criar a aba **Conta** no detalhe administrativo do psicólogo, depois de **Denúncias**, consumindo endpoints Admin privados sob `/api/admin/private/psychologists/:id/account`.
- Reutilizar campos existentes: `user.email`, `provider`, `password`, `confirmed`, `confirmed_date`, `confirm_code`, `confirm_date`, `recovery_code`, `recovery_date`, `need_reset` e `user_token`.
- Registrar ações sensíveis em `admin_activity_log` com `domain="psychologist_account"`, `area="conta_e_acesso"`, motivo obrigatório, ator Admin e payload seguro.
- Permitir senha temporária somente para contas com senha local; a senha é salva como hash, define `need_reset=true`, limpa recovery pendente e invalida sessões do psicólogo.
- Não criar senha local para conta Google/OAuth sem senha local; a UI mostra indisponibilidade honesta.
- Exigir envio transacional real para confirmação/redefinição. Se o provedor não estiver configurado, retornar erro honesto em vez de simular envio.
- No frontend do usuário, respeitar `need_reset=true` redirecionando para `/app/account/need-reset` e usando `POST /api/private/auth/need_reset`.
- Correção pós-validação em 2026-07-11: cadastro/autenticação Google-only não deve definir nem manter `need_reset=true`, porque isso força a criação indevida de senha local. `has_password` continua significando exclusivamente `Boolean(user.password)` para uma senha local realmente existente.
- Correção visual em 2026-07-13: a aba **Atividades** do detalhe do psicólogo deixou de renderizar a faixa explicativa, a linha de filtros/período/exportação e os cards de indisponibilidade "Histórico anterior à auditoria administrativa" e "Eventos brutos de pagamento"; os rótulos textuais do feed foram normalizados para PT-BR sem mojibake.
- Correção visual complementar em 2026-07-13: a lista de eventos da aba **Atividades** passou a mostrar somente a tag principal do tipo de atividade, sem o selo "Fontes reais" nem linhas de fonte técnica por item, e reutiliza o ícone proprietário de WhatsApp já usado na Lectum para eventos de clique.
- Correção visual adicional em 2026-07-13: a faixa "Métricas indisponíveis nesta etapa" deixou de aparecer nas abas do detalhe do psicólogo, mantendo indisponibilidades apenas em sinalizações inline quando o contrato real trouxer esse estado.
- Correção visual de paginação em 2026-07-13: os navegadores de página do detalhe administrativo do psicólogo mantêm fundo primário na página selecionada e passam a usar texto branco para contraste consistente com o restante do Admin.
- Correção visual de assinatura em 2026-07-13: o bloco **Dados da assinatura** no resumo Geral remove campos operacionais redundantes (`status`, `gateway` e `forma de pagamento`), renomeia "Início da assinatura" para "Início", mostra "Não se aplica" em `Próxima renovação` para plano gratuito ou cortesia e substitui `Valor` por `LTV` calculado pela query real de billing.

## Consequências

- Não há migration: a task fica apoiada no modelo de autenticação existente.
- Alteração de e-mail, senha temporária e encerramento explícito removem `user_token` do psicólogo afetado, sem invalidar a sessão do Admin executor.
- A aba Atividades passa a exibir eventos de Conta e acesso sem expor senha, hash, códigos de confirmação, recovery code, JWT ou tokens.
- A aba Atividades mantém os filtros e eventos reais, mas reduz a redundância visual removendo avisos auxiliares que não eram ações nem eventos do psicólogo.
- A lista de eventos fica mais direta para suporte operacional, preservando o contrato real de atividades sem expor fonte técnica desnecessária na UI.
- O resumo Geral passa a consumir a consulta real de Plano e pagamentos apenas para exibir LTV, sem reutilizar preço do plano como métrica financeira histórica.
- Ambientes sem SMTP configurado bloqueiam envios com retorno honesto; a operação não é marcada como enviada falsamente.
- Builder/Quick Copy não estava disponível no ambiente; a UI seguiu os padrões das imagens locais das abas Geral, Denúncias e Atividades.
- Contas criadas somente com Google passam a permanecer como `provider="google"`, `password=null` e `need_reset=false`; se uma conta Google-only antiga ainda tiver `need_reset=true` sem senha local, a hidratação corrige o flag para evitar exigir criação de senha local.

## Task relacionada

TASK-68 - Conta e acesso do psicólogo no Admin.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Correção 2026-07-13: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET /psicologos/[id]?tab=atividades` com status 200 e verificação estática de ausência dos blocos removidos.
- Correção complementar 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET /psicologos/[id]?tab=atividades` com status 200 e verificação estática de ausência do selo, fontes por item e tag de área.
- Correção de paginação 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check`, smoke HTTP local `GET /psicologos/[id]?tab=publicacoes` com status 200 e verificação estática de `text-white` na página ativa.
- Correção de assinatura 2026-07-13: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET /psicologos/cmrgrztri7000tn0uh1q4n8vxf` com status 200 e verificação estática do bloco `SubscriptionCard`.
- `GET /api/admin/private/psychologists/test-id/account` sem sessão retornou 401, confirmando proteção Admin.
- Browser local/headless 390px para rotas `/psicologos/[id]?tab=conta` e `/app/account/need-reset` com limitação de sessão autenticada real.
