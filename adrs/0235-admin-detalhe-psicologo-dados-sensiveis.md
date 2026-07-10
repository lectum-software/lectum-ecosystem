# ADR 0235: Exposição administrativa de dados sensíveis no detalhe do psicólogo

## Status

Accepted

## Contexto

A TASK-55 cria o endpoint privado `GET /api/admin/private/psychologists/:id` e a rota do Admin `/psicologos/[id]` para as abas **Geral** e **Perfil e cadastro**. Essas telas precisam exibir dados administrativos reais do psicólogo, incluindo CPF, telefone/WhatsApp, endereço profissional e dados de assinatura resumidos.

A mesma informação não pode vazar para o frontend público, para logs ou para payloads que contenham credenciais, tokens, hashes ou dados de pagamento sensíveis.

## Decisão

- O detalhe do psicólogo fica disponível somente em rota admin autenticada com `adminAuth`.
- O endpoint pode retornar CPF, telefone/WhatsApp, endereço profissional e dados cadastrais porque o consumo é exclusivo do Admin autenticado.
- O backend não retorna senha, hashes, tokens, `gateway_token` nem identificador sensível de assinatura do gateway.
- A forma de pagamento exposta é apenas resumo seguro: bandeira, últimos 4 dígitos, mês/ano de expiração e gateway.
- A UI marca a aba Perfil/Cadastro com aviso de “Dados sensíveis — acesso administrativo”.
- Botões de edição de psicólogo ficam fora da V1; a tela é somente leitura para evitar falsa ação.
- Referências a “Stripe” dos protótipos não entram no produto; quando há gateway, o rótulo do produto real é **Mercado Pago**.
- O histórico da conta é um resumo derivado de datas reais existentes (`user`, `psychologist_profile`, assinatura, CRP, WhatsApp e último token de sessão) e não promete auditoria completa.

## Consequências

- Próximas tasks de detalhe podem reutilizar o shell e as tabs sem ampliar automaticamente o escopo de dados sensíveis.
- Qualquer nova ação administrativa que edite perfil, assinatura ou moderação deve ter endpoint, autorização e ADR próprios.
- Se houver necessidade futura de auditoria completa, será necessário criar uma trilha de auditoria dedicada em vez de inferir histórico por `createdAt`/`updatedAt`.

## Evidências da TASK-55

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação API local com admin real: endpoint autenticado retornou 200, sem `gateway_token`, sem `gateway_subscription_id`, sem `password`, sem “Stripe”; chamada sem autenticação retornou 401.
- Validação browser local em `http://localhost:3002/psicologos/<id>` e `?tab=perfil`, incluindo viewport mobile de 390px, sem botão “Editar psicólogo” e sem “Stripe”.
