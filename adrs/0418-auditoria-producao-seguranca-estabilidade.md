# ADR-0418: Auditoria de produção, segurança e estabilidade

## Status

Accepted

## Data

2026-08-07

## Contexto

Lectum passou a ter homologação e produção publicadas, com deploy automático de `homolog` e
`main`. Dados, sessões, arquivos, pagamentos, filas e integrações desses ambientes não podem mais
ser tratados como descartáveis.

A auditoria leu todos os arquivos versionados e o inventário autoral local, incluindo
configurações ignoradas sem expor valores. Dependências, caches e saídas de build não foram
classificados como código autoral.

Os riscos principais eram: mensagens técnicas públicas, JWT acessível ao JavaScript, proteção
administrativa repetida por rota, OAuth sem vínculo forte com o navegador, uploads baseados só em
MIME, jobs sobrepostos, providers sem isolamento de erro, telas com dados demonstrativos,
dependências vulneráveis e repetição em arquivos legados grandes.

## Decisão

1. `homolog` é a branch de implementação e primeiro deploy. Push direto em `main` é bloqueado;
   produção recebe merge revisado somente depois do smoke test em homologação.
2. Banco publicado evolui por **expandir → backfill retomável → contrair**. Migration aplicada é
   imutável e campo obrigatório exige compatibilidade com registros existentes.
3. Env nova deve ter fallback seguro no primeiro rollout. Se precisar nascer obrigatória, exige
   alerta de deploy antes do commit e provisionamento prévio nos dois ambientes.
4. Respostas e interfaces usam erros públicos sanitizados. Stack, SQL, provider cru, URL interna,
   segredo, token e PII não podem aparecer para o usuário.
5. Usuário e admin usam JWT em cookies `HttpOnly`, `Secure` em produção e `SameSite` apropriado. O
   admin restringe o cookie a `/api/admin`; o usuário usa `Lax` para suportar retornos de OAuth.
6. `x-device` continua obrigatório. O backend é a autoridade de sessão; cookies marcadores,
   `proxy.ts`, Redux e estado de tela não concedem acesso.
7. Os clientes atuais declaram suporte a cookie por `X-Requested-With`. O backend então grava o
   cookie e omite tokens do JSON. Bearer continua aceito temporariamente e tem prioridade apenas
   para rollout independente e clientes antigos.
8. O frontend não usa mais Redux Persist. O admin remove JWT/usuário de `localStorage`; bearer
   legado migra apenas para memória/`sessionStorage` durante a transição.
9. “Visualizar como” envia o token curto diretamente no header da primeira hidratação, apaga o
   fragmento da URL e recebe a sessão `HttpOnly`, sem persistir o token em cookie JavaScript.
10. Logout revoga a sessão atual persistida, limpa o cookie correto e não apaga storage alheio à
    Lectum. Hidratação de Socket.IO não retorna ou gira JWT.
11. Google OAuth usa `state` autenticado e criptografado, nonce curto `HttpOnly`, redirect interno
    permitido e código de troca de uso único. O verificador mantém janela temporária para o state
    assinado anterior durante rollout.
12. Rotas privadas do admin usam middleware central. Rotas legadas de paciente aplicam role guard
    explícito e sessões têm TTL máximo uniforme.
13. Upload aceita apenas extensão, MIME e assinatura binária compatíveis; limita quantidade,
    tamanho, concorrência e fila; limpa falhas e não cria bucket em runtime. Leitura pública fica
    em prefixos explícitos.
14. Respostas sensíveis usam `no-store`. CSV neutraliza fórmulas. Redirecionamentos, mídia e URLs
    externas usam allowlists compartilhadas.
15. A API aplica limite de body, rate limit com memória limitada, readiness do banco, shutdown
    gracioso e start/stop sem sobreposição dos schedulers. Campanhas ficam opt-in.
16. Erros/loadings, paginação, mídia, datas, períodos, textos da comunidade, CSV e acesso a sessão
    foram centralizados onde havia repetição comprovada.
17. Checks falham com warnings, verificam segredos, envs, dependências runtime e crescimento de
    arquivos. Dependências receberam patches até a auditoria de produção ficar limpa.
18. O schema Prisma e migrations não foram alterados nesta auditoria. Migration histórica foi
    preservada para não alterar checksums já aplicados.
19. A inicialização local mantém backend, frontend e admin separados, aguardando a saúde do
    backend; globs do watcher ficam entre aspas para não virarem entradas acidentais do processo.

## Compatibilidade de rollout

- Backend novo + cliente antigo: bearer e token no JSON continuam disponíveis ao cliente que não
  envia o header de capacidade.
- Cliente novo + backend antigo: bearer legado retornado pelo backend ainda é aceito durante a
  transição.
- Cliente novo + backend novo: JWT fica somente no cookie `HttpOnly`.
- O fallback bearer só pode ser removido em mudança posterior, após confirmar ausência de clientes
  antigos e testar Socket.IO, login comum, Google e “visualizar como”.

## Consequências

- XSS deixa de conseguir ler o JWT dos clientes atuais, embora prevenção de XSS continue
  obrigatória.
- Sessões anteriores aos novos limites podem exigir novo login, sem alterar dados do usuário.
- A proteção CSRF combina `SameSite`, CORS restrito e o header `x-device`; mutações nunca podem
  dispensar esses controles.
- O rate limit em memória vale por réplica. Escala horizontal futura exige store distribuído.
- Schedulers devem operar em exatamente uma réplica até existir lock distribuído/idempotência.
- A CSP ainda precisa de migração dedicada para nonce antes de remover `unsafe-inline`.
- Arquivos legados grandes não foram reescritos em massa; o baseline impede crescimento e deve ser
  reduzido a cada extração segura.
- Dez arquivos dos packages portados mantêm `@ts-nocheck` para evitar quebra de compatibilidade;
  sua tipagem deve evoluir em tasks isoladas.

## Rollout e rollback

1. Publicar este commit apenas em `homolog`.
2. Validar login comum, Google, logout, admin, “visualizar como”, upload, socket e rotas críticas.
3. Validar `/health` e `/ready` no backend publicado.
4. Manter campanhas automáticas desativadas até revisar registros pendentes.
5. Em regressão, reverter o commit em `homolog`; não há rollback de banco ou dados.
6. Promover para `main` somente por merge revisado após homologação estável.

## Validação

- Leitura integral dos inventários sem erro.
- `pnpm check`
- Builds separados de backend, frontend e admin.
- `pnpm audit --prod` nos quatro escopos.
- Build do Dockerfile do backend.
- Smoke test das aplicações e endpoints de saúde.
- Smoke visual em 390 px sem overflow, erro de runtime ou falha de rede no login do frontend.
- Login público do admin renderizado sem warning; a hidratação sem sessão retorna o `401` esperado.

## Pendências

- Remover o fallback bearer após encerrar a janela de compatibilidade.
- Migrar CSP para nonce/hash e retirar `unsafe-inline` de scripts.
- Adotar rate limit/lock distribuído antes de múltiplas réplicas.
- Decompor gradualmente os arquivos do baseline de tamanho.
- Executar smoke test publicado após o push desta revisão em `homolog`.
