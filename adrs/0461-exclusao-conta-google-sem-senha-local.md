# ADR-0461 — Exclusão de conta Google sem senha local

## Status

Aceito em 2026-08-15.

## Contexto

O modal de exclusão de conta exibido no perfil/setup profissional estava solicitando **Senha atual**
quando a conta tinha sido cadastrada pelo Google. O fluxo original diferenciava contas Google-only
pela ausência de `user.password`; porém contas legadas ou operacionalmente alteradas podem manter
`provider="google"` e ainda possuir um hash local. Para o usuário, a identidade de cadastro continua
sendo Google e a exigência de senha local cria bloqueio indevido.

## Decisão

- Para exclusão própria de conta, `user.provider="google"` passa a ser a regra canônica de
  confirmação por Google, independentemente da existência de `user.password`.
- Senha atual fica restrita a contas não Google com senha local.
- O endpoint de intenção `POST /api/private/account/delete/google-intent` aceita contas Google com
  senha legada e emite o fluxo OAuth curto já existente.
- O `POST /api/private/account/delete` valida reautenticação Google recente antes da exclusão de
  qualquer conta Google.
- A UI do modal não renderiza o campo **Senha atual** para contas Google e só mostra o formulário
  destrutivo após carregar o contrato real de segurança da conta, evitando flicker de senha durante
  o loading.
- Atualização em 2026-08-15: a UI não navega mais cegamente para a URL absoluta retornada pela
  intenção de exclusão. Ela valida a origem da API, preserva apenas os parâmetros assinados
  retornados pelo backend e recompõe o caminho público como
  `/api/public/google/login/{deviceId}` usando o mesmo identificador de dispositivo usado na
  requisição autenticada.
- Ajuste posterior em 2026-08-15: para evitar falso bloqueio no próprio modal, se o backend já
  retornar uma URL confiável de `/api/public/google/login/{deviceId}`, o frontend deve navegar
  diretamente para ela. A recomposição local fica restrita a URLs confiáveis que ainda não tenham o
  segmento de device, usando `device_id` retornado pelo backend ou, como fallback temporário de
  rollout, o fingerprint local.
- A resposta de `POST /api/private/account/delete/google-intent` passa a incluir `device_id` de
  forma aditiva para permitir que clientes novos recomponham a URL sem depender de uma segunda
  resolução assíncrona de fingerprint após a intenção já ter sido criada.
- O backend também passa a responder `400 device_id_not_found` no caminho público sem dispositivo
  (`/api/public/google/login`), evitando uma página genérica de 404 quando algum cliente antigo ou
  configuração incompleta tentar iniciar OAuth sem o segmento obrigatório.
- Correção complementar em 2026-08-15: no fluxo de exclusão, o callback Google deixa de retornar
  diretamente para a tela final e passa antes por `/auth/redirect?intent=delete_account`, preservando
  `callbackUrl` interno. Essa troca consome o cookie transitório em `/api/public/google/me`, recria a
  sessão `HttpOnly` da aplicação e só então abre o modal com `deleteReauth=ok`.
- Para a intenção `delete_account`, o redirecionamento pós-Google ignora apenas os bloqueios de
  onboarding/plano que poderiam substituir o destino seguro pela home ou pela seleção de plano. Essa
  exceção é restrita ao retorno da exclusão e não altera o login normal.
- A chamada final `POST /api/private/account/delete` não executa signout automático em `401`; assim,
  se a sessão ainda estiver inválida, o modal mostra erro seguro em vez de levar o usuário para a
  página inicial. Quando a exclusão realmente conclui, o frontend limpa a sessão local diretamente e
  redireciona para `/auth/login`, sem fazer um segundo logout contra uma conta já anonimizada.

## Consequências

- Contas cadastradas por Google não ficam presas por uma senha local desconhecida ou legada.
- O fluxo mantém confirmação forte: reautenticação Google + digitação de `EXCLUIR`.
- O contrato de API permanece compatível e aditivo; não houve migration, pacote novo ou variável
  de ambiente nova.
- Contas sem Google e sem senha continuam bloqueadas com erro de domínio seguro, sem exclusão
  automática.
- Links antigos/incompletos de confirmação Google deixam de cair em 404 genérico e falham de forma
  controlada; clientes novos sempre enviam o usuário ao login Google com device id no path,
  preservando a validação do token curto no callback.
- Durante o rollout, frontend novo funciona com backend antigo quando a URL já contém device no
  caminho; backend novo funciona com frontend antigo porque `device_id` é apenas campo adicional.
- O retorno de reautenticação Google volta ao modal de exclusão mesmo para psicólogos com etapas
  obrigatórias pendentes, sem desbloquear onboarding fora desse fluxo.
- Em caso de sessão expirada, o usuário permanece na modal e recebe instrução segura; não há
  redirecionamento silencioso para a home nem tentativa de exclusão sem autenticação válida.

## Task relacionada

- TASK-30 — Configurações de conta.

## Validações

- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir backend test`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm --dir admin build`
- `pnpm check:version`
- `pnpm check`
- Smoke de homologação registrado no fechamento da task após o push.
- 2026-08-15: validação adicional da URL de confirmação Google e da proteção do caminho sem device:
  `pnpm --dir frontend test`, `pnpm --dir backend test`, `pnpm --dir frontend check`,
  `pnpm --dir backend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`,
  `pnpm check`, `git diff --check` e smoke publicado registrados no fechamento do ajuste.
- 2026-08-15: validação da correção de falso bloqueio do modal: `pnpm --dir frontend test`,
  `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir frontend build`,
  `pnpm --dir backend build`, `pnpm check` e smoke publicado registrados no fechamento do ajuste.
- 2026-08-15: validação do retorno final do modal após Google: `pnpm --dir frontend check`,
  `pnpm --dir backend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`,
  `pnpm check`, `pnpm check:version`, `git diff --check` e smoke publicado registrados no
  fechamento do ajuste. Não foi executada exclusão real de conta em homologação.

## Complemento em 2026-08-15 - retorno estavel apos Google

- O retorno de exclusao Google passa a ser sempre `/app/configuracoes/conta?deleteReauth=ok`. A rota de configuracoes da conta e permitida durante bloqueios de onboarding/assinatura, e a secao de exclusao passa a existir nessa tela para contas Google-only.
- Callbacks antigos para telas de perfil/setup deixam de ser usados no backend para essa intencao, evitando que guards substituam o destino e aparentem levar o usuario para a home antes da exclusao.
- A decisao preserva o historico Git salvo (`0.1.130` / `4d2c3391`) como referencia sem resetar a branch publicada; qualquer retorno de comportamento deve ocorrer por commit incremental/revert seguro.


## Complemento em 2026-08-16 - fallback assinado para reautenticacao Google

- A reautenticacao Google de exclusao passa a ter um cookie HttpOnly assinado e curto, criado no inicio do OAuth, para impedir que uma perda do state/nonce no retorno mobile transforme o fluxo em login normal para /psicologos.
- O fallback assinado e aceito somente para intent=delete_account com delete_token presente. A exclusao segue bloqueada ate o callback validar o token curto, o device e o e-mail retornado pelo Google.
- O frontend tambem deixa de navegar para URLs de OAuth incompletas; sem intent e delete_token, a tentativa fica bloqueada na modal com erro seguro.

## Complemento em 2026-08-16 - origem absoluta confiavel da API

- O cliente nao deve depender exclusivamente de `NEXT_PUBLIC_API_URL` para abrir a URL de OAuth de exclusao retornada pelo backend, porque a env publica pode estar ausente ou normalizada de forma diferente no build publicado.
- A URL absoluta passa a ser aceita como fallback somente se for HTTPS, sem credenciais embutidas, em `api.lectum.com.br` ou `*-api.lectum.com.br`, apontar para `/api/public/google/login` e carregar `intent=delete_account` com `delete_token`.
- Dominios externos seguem bloqueados, e URLs sem intencao assinada continuam falhando fechadas no modal, sem virar login Google normal.
- Validacao adicional: `pnpm --dir frontend test`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm check:version`, `git diff --check` e smoke publicado no fechamento do ajuste.

## Complemento em 2026-08-16 - recomposicao pela intencao assinada

- A confirmacao Google de exclusao passa a tratar a URL retornada pela API privada apenas como transportadora da intencao assinada quando a origem nao puder ser validada pelo bundle do cliente.
- Se houver `intent=delete_account` e `delete_token`, o frontend extrai esses parametros e recompoe o destino no endpoint publico de login Google da API Lectum configurada, com o device id autenticado. A origem desconhecida da URL original e ignorada e nunca vira destino de navegacao.
- URLs sem token, sem intencao de exclusao ou sem device continuam bloqueadas no modal. O token curto ainda e validado pelo backend no callback antes de permitir a exclusao.

## Complemento em 2026-08-16 - delete_token permitido somente na intencao Google

- O `delete_token` de reautenticacao Google e um token curto, assinado e escopado a `intent=delete_account_google_reauth`, `device_id`, e-mail e usuario. Ele precisa chegar ao endpoint publico de login Google para que o callback valide a intencao antes da exclusao.
- A sanitizacao global continua removendo JWTs e tokens de respostas por padrao. A excecao fica restrita a `POST /api/private/account/delete/google-intent`, que retorna apenas `{ device_id, url }` e marca `allowAuthTokens: true` para preservar o token dentro da URL de OAuth.
- Qualquer outra resposta continua sem autorizacao de tokens por padrao; o token curto ainda nao exclui a conta sozinho, apenas habilita a reautenticacao Google recente depois do callback validar e-mail/device.

## Complemento em 2026-08-16 - assinatura ativa bloqueia antes do OAuth

- A exclusao de psicologo com assinatura profissional paga/gateway ativa ou inadimplente deve falhar antes de iniciar reautenticacao Google. O usuario recebe a mensagem de dominio para cancelar a assinatura ativa antes de excluir a conta.
- A validacao final de `POST /api/private/account/delete` continua existindo como defesa em profundidade caso o estado da assinatura mude entre a intencao Google e a confirmacao final.
- Essa decisao evita enviar o usuario ao Google quando a conta ainda nao pode ser excluida por regra financeira, sem expor detalhes de provedor, IDs de gateway ou PII.

## Complemento em 2026-08-20 - token transitório autorizado com sessão HttpOnly

- A capability `Lectum-User-Cookie-Auth` existe para retirar `user_tokens` de sessão do JSON e
  transportá-lo somente em cookie HttpOnly. Ela não deve cancelar uma autorização transitória de
  outro contrato quando a resposta não possui `user_tokens`.
- `applyUserAuthCookie` passa a transformar a resposta somente quando `data` contém a propriedade
  top-level própria `user_tokens`. Array vazio ou valor malformado continua removido e com
  `allowAuthTokens: false`, mantendo falha fechada.
- Sem `user_tokens`, o helper preserva o resolve original. Assim, o opt-in já restrito de
  `POST /api/private/account/delete/google-intent` mantém a URL com `delete_token` curto até o
  frontend; respostas sem `allowAuthTokens: true` continuam redigidas pelo sanitizador global.
- A mesma fronteira corrige a intenção de vínculo Google: `POST /api/public/google/link/intent`
  autoriza explicitamente apenas `{ url }`, com `link_token` de dez minutos ligado a usuário,
  e-mail e device. Isso não autoriza JWT de sessão no body.
- Não houve redução da sanitização padrão, persistência nova, migration, package ou env. Backend
  antigo e novo permanecem compatíveis com frontend antigo e novo durante o rollout independente.
- A regressão passa a ser coberta no pipeline HTTP real do helper de resposta, além dos testes do
  transporte por cookie e do caso de uso de vínculo.
