# ADR-0185 - Hardening operacional da TASK-34

## Status

Accepted - 2026-06-29

## Contexto

A `TASK-34` fecha uma revisão transversal de qualidade, segurança, LGPD e operação após as jornadas principais. A execução anterior foi bloqueada pela `TASK-29B` e pela `TASK-41`.

Nesta retomada:

- `TASK-29B` já estava concluída com eventos reais persistidos.
- O produto aceitou explicitamente deixar a `TASK-41` fora do MVP por enquanto, sem publicar minutas legais com placeholders.
- `TASK-11`/ADR-0017 continua bloqueando o modelo `professional_document` porque não há storage privado de CRP; portanto esse schema não deve ser inventado nesta task.

## Decisões

1. Não instalar packages novos nesta execução. Vitest, Playwright, supertest e Sentry continuam candidatos/decisões futuras conforme `PACKAGES.md` e ADRs existentes.
2. Não criar tabela de auditoria paralela; manter `log__user` como trilha existente e sanitizar o conteúdo do evento de exclusão de conta para não gravar e-mail original.
3. Corrigir hardening sem recriar autenticação:
   - manter `_auth` para Bearer + `x-device`;
   - manter `requireRole` fail-closed;
   - manter `assertPrivateRoleGuards()` no boot para `/api/private/patient/*` e `/api/private/psychologist/*`.
4. Tratar `professional_document @@index([psychologist_id, type])` como exceção documentada do checklist de índices, pois o modelo é de uma task bloqueada por requisito externo e não deve ser criado sem storage privado.
5. Converter exclusões físicas remanescentes de dados operacionais/produto para soft delete onde aplicável:
   - relações de catálogo do perfil gratuito (`psychologist_specialty`, `psychologist_service`, `psychologist_approach`);
   - `user_background`;
   - `notification_subscription`.
6. Manter exclusão física apenas para `user_token`, por ser credencial/sessão efêmera de autenticação e não registro de produto.
7. Anonimizar dados LGPD-sensíveis na exclusão de conta:
   - limpar CPF/WhatsApp no perfil profissional;
   - soft-deletar e sobrescrever `billing_address`;
   - soft-deletar e remover display/token operacional de `payment_method`;
   - manter `payment_method` sem PAN/CVV, armazenando apenas token de gateway e display enquanto ativo.
8. Sanitizar logs runtime:
   - socket não imprime payload JWT completo;
   - remoção de objeto não imprime key completa;
   - erros OAuth/e-mail/servidor registram mensagem/código, não payloads completos.
9. Padronizar listagens auditadas para `page`/`limit`, default `20`, máximo `50`; posts e notificações foram ajustados para o contrato padrão.
10. Não publicar páginas legais da `TASK-41` nesta task. O fluxo mínimo de privacidade fica documentado, e a pendência legal/editorial permanece explícita fora do MVP por aceite do produto.

## Consequências

- A revisão final pode ser marcada como concluída sem mocks, sem schema inventado e sem publicar conteúdo legal incompleto.
- O produto passa a ter trilha de auditoria e exclusão/anonimização mais consistentes para dados sensíveis do MVP.
- A ausência de `professional_document` continua rastreada por `TASK-11`/ADR-0017, não por falha da `TASK-34`.
- Observabilidade externa (Sentry) e testes E2E/API automatizados continuam como evolução dedicada, porque instalar packages nesta task não foi necessário para fechar os critérios atuais.

## Evidências de validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke role guard via `pnpm --dir backend exec tsx -`: papéis invertidos retornam `403`; papéis corretos chamam `next()`.
- Smoke HTTP local:
  - `/api/private/psychologist/analytics` sem credenciais -> `401`;
  - `/api/private/patient/profile` sem credenciais -> `401`;
  - `/api/private/directory/psychologists?limit=1&page=1` -> `200`;
  - rotas frontend públicas e privadas principais responderam `200` ou redirect esperado para autenticação.
- Varreduras estáticas:
  - `rg "<img\\b" frontend/src` sem ocorrências;
  - `rg "deleteMany|prisma.*.delete"` restante restrito a `user_token` e rotas HTTP `DELETE` que usam soft delete;
  - comparação Node de índices do `DATA-MODEL.md` com `schema.prisma` confirmou todos os padrões exatos aplicáveis e isolou a exceção `professional_document`.

## Tasks relacionadas

- `TASK-34 - Qualidade, segurança, LGPD e operação`
- `TASK-29B - Notificações: eventos de domínio`
- `TASK-41 - Páginas legais públicas: Termos de Serviço e Política de Privacidade`
- `TASK-11 - Envio e confirmação de CRP`
