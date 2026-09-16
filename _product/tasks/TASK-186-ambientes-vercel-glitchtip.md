# TASK-186 — Ambientes Vercel e GlitchTip

| Campo | Valor |
|---|---|
| Status | In Progress |

## Escopo e dependências

Pedido de 16/09/2026: revisar todas as envs Vercel de frontend/admin em Preview e Production e corrigir código que rejeitava GlitchTip. TASK-179 concluída. TASK-184 permanece pendente de validação física; não é concluída por esta revisão. Sem nova UI, referência visual ou package.

## Impacto de deploy

- Frontend/admin independentes, sem alterações de backend, video, banco, API ou armazenamento.
- `SENTRY_URL` opcional no build, com fallback seguro derivado do DSN. Nenhuma env nova obrigatória.
- Configurar envs antes do próximo build; só Preview será publicado agora via `homolog`. Production recebe configurações para futura promoção revisada, não um deploy.
- DSN e ambiente públicos, tokens de build privados. Não registrar seus valores em repositório/logs.
- Falha de observabilidade não interrompe app/build; mantém coleta exclusivamente de erros sanitizados.
- Rollback: reverter código/configuração de observabilidade, sem alteração de dados.
- Chave pública Mercado Pago de Production permanece dummy por decisão expressa do usuário: pagamentos reais NÃO estão prontos.

## Critérios de aceite

- [x] Vercel: valores públicos e projetos GlitchTip corretos por aplicação/ambiente, tokens privados preservados.
- [x] SDK e CSP aceitam domínio exato GlitchTip Lectum, mantendo Sentry SaaS e rejeitando outros hosts.
- [x] Upload de source maps usa destino validado correspondente ao DSN, sem encaminhar token para URL arbitrária.
- [x] Testes de regressão, checks e builds frontend/admin aprovados.
- [ ] Smoke real do serviço de erros em homolog e verificação do deploy, sem dados pessoais.
- [ ] ADR, manifests sincronizados, commit/push somente em homolog.

## Configuração realizada na Vercel

- Frontend: corrigidos descrição de Production, URL Admin de Production, organização/projetos/token de source maps nos dois ambientes; configurado `SENTRY_URL` privado de build. DSN/ambiente recriados como Config (eram Secret) com projetos exclusivos por ambiente.
- Admin: organização/projetos/token e `SENTRY_URL` configurados; DSN/ambiente públicos já corretos. URLs Preview de API/frontend recriadas como Config após autorização específica. Production preservada.
- URLs de API/site/login, cookies, aliases opcionais e sandbox revisados contra código. Nenhuma alteração de DNS necessária.
- Alterações de env não mudam artefatos já publicados; exigem novo build de cada ambiente.

## Validação

- 32 testes focados de políticas frontend/admin aprovados.
- `pnpm check` raiz aprovado (testes que exigem serviços locais externos permanecem explicitamente skipped; não usados como evidência de integração).
- `pnpm version:bump` executado uma vez: 0.1.398; `pnpm check:version` aprovado.
- Smoke real via SDK instalado + política frontend: evento operacional sanitizado recebido no projeto homolog-frontend, issue HOMOLOG-FRONTEND-2, ambiente homolog e release lectum-frontend@0.1.398. Conferido no painel GlitchTip; não é evidência de runtime no navegador publicado antes do deploy.
- DSNs/frontend recriados conferidos na Vercel: Preview projeto 3/homolog, Production projeto 5/production, todos Config. Sem exposição dos valores.
- `pnpm --dir frontend build` e `pnpm --dir admin build` aprovados, com upload de mapas local desabilitado; publicação real de mapas será validada no build Vercel. Smoke do deploy pendente.
- Production dummy é pendência operacional aceita, não credencial válida.

## Integração concorrente

O primeiro push (dc11c4d9) foi recusado por avanço remoto fe00ffec. Merge sem sobrescrita do trabalho do outro desenvolvedor; os dois commits usavam 0.1.398. O novo commit de integração recebe bump próprio para 0.1.399. O check pós-merge detectou a remoção remota de duas exceções ESLint já documentadas para hard reload em rejeição de sessão: restauradas as justificativas originais sem mudar comportamento de autenticação nem as alterações de ranking/destaque remoto. Checks/builds repetidos no resultado integrado.
