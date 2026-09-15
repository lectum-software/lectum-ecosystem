# ADR-0439: Hardening residual da auditoria em ambientes publicados

## Status

Accepted

## Data

2026-08-08

## Contexto

Homologação e produção estão publicadas e podem conter dados reais. A revisão integral foi solicitada
para encontrar riscos residuais de duplicação, exposição técnica, qualidade, segurança e estabilidade.
O inventário inicial tinha 2.660 arquivos versionados, todos lidos byte a byte. Os arquivos criados
durante as correções também entraram na leitura final. Os 5.608 arquivos locais ignorados de `sample/`
foram inventariados e lidos, mas não foram usados como fonte ativa de implementação.

A revisão cobriu `backend/`, `frontend/`, `admin/`, raiz, scripts, hooks, configurações, documentação,
tasks, ADRs e assets. Envs foram inspecionadas sem imprimir valores. Dependências, caches e artefatos
gerados foram avaliados pelos checks próprios e não tratados como código autoral.

Os principais riscos residuais estavam em mensagens e logs, Web Push, origens públicas, analytics,
storage do navegador, scripts destrutivos, proxy local, permissões, exports CSV, estado pendente no
Admin e governança documental. O transporte de autenticação por cookie também tornou a topologia de
domínios um gate obrigatório de deploy.

## Decisão

1. Erros públicos e administrativos falham de forma segura. Mensagens arbitrárias de API, PII,
   credenciais, stack, SQL, URLs internas e detalhes de provider não são propagados para toast,
   resposta pública ou log.
2. Sanitização de logs e respostas ocorre em helpers compartilhados. O código registra contexto
   operacional controlado, nunca o payload integral recebido de usuário ou integração.
3. URLs externas usadas por API, OAuth, mídia, SEO, redirects, view-as e navegação são normalizadas,
   limitadas e recusadas quando contêm credencial, protocolo inválido, loopback ou origem não aprovada.
4. Web Push aceita payload estrutural e endpoints oficiais de Google, Mozilla, Apple ou Microsoft.
   Inscrições inválidas ou expiradas são desativadas; configuração VAPID inválida desliga apenas o
   canal, sem criar env nova nem derrubar o processo.
5. Analytics, service worker, storage, prompts e player de vídeo limitam tamanho, duração, origem e
   trabalho assíncrono. Falha de storage ou cancelamento de request não interrompe a interface.
6. Padrões repetidos do Admin foram extraídos para componentes e helpers compartilhados. Ações
   assíncronas mantêm estado pendente, bloqueiam clique duplicado e impedem fechamento acidental de
   dialogs enquanto a mutação está em andamento.
7. Sessões novas usam cookies `HttpOnly` e `Secure` em runtime publicado. O cookie de usuário usa
   `SameSite=Lax` e `Path=/`; o cookie do Admin usa `SameSite=Strict` e `Path=/api/admin`. O
   `Max-Age` de ambos é limitado pelo `exp` remanescente do JWT, sem renovar cookie além do token.
8. A adoção de cookie é versionada por capacidade usando `X-Requested-With`:
   `Lectum-User-Cookie-Auth` no frontend e `Lectum-Admin-Cookie-Auth` no Admin. Para clientes que não
   anunciam capacidade, o bearer legado continua aceito e retornado durante a transição. Para clientes
   novos, o token é omitido do JSON e permanece apenas no cookie `HttpOnly`.
9. O backend só lê o cookie de autenticação quando o header de capacidade esperado está presente.
   Bearer continua com precedência para preservar clientes antigos e permitir rollout independente.
10. Logout revoga a sessão corrente e faz limpeza best-effort da inscrição Web Push do dispositivo.
    Troca ou remoção de usuário também rotaciona a sessão anônima de analytics para impedir mistura de
    identidades no mesmo navegador.
11. Exportadores CSV aplicam sanitização de célula contra execução de fórmula e deixam de exportar
    campos técnicos de origem/proveniência que não fazem parte do produto apresentado ao Admin.
12. Respostas públicas de analytics retornam somente campos usados pelos clientes ativos. Chaves
    preservadas por compatibilidade carregam categorias públicas, não nomes de tabela ou coluna.
13. Reset e seed ficam bloqueados fora de banco local explicitamente confirmado. Nenhuma variável,
    flag ou aparência de bucket permite contornar a proteção para homologação, produção ou alvo remoto.
    Em bucket genérico, um prefixo descartável só é aceito com delimitador final `/`, para não alcançar
    chaves que apenas começam com o mesmo texto.
14. O orquestrador local aguarda `/ready`, não repassa erro cru e fixa destinos do proxy. Cabeçalhos
    `forwarded` recebidos do cliente são descartados e reconstruídos com valores controlados.
15. O hook local permite somente `homolog -> homolog` e falha fechado diante de input ausente ou
    malformado. `main`, outra ref, tag e exclusão são bloqueadas. O hook não substitui proteção remota
    nem revisão de merge.
16. Checks de encoding, segredo, env, ADR, ciclos, tamanho de fonte, padrões inseguros e permissões
    executáveis fazem parte da validação raiz e do pre-push.
17. Configurações ativas do Builder usam versão fixa auditada. ADRs têm número único, heading coerente
    e exatamente uma entrada no índice.
18. O carregamento de `.env` do backend fica silencioso. `prisma.config.ts` permanece autocontido
    porque a imagem final executa migrations antes de copiar `src/`.
19. `production`, `homologation` e `staging`, com seus aliases operacionais, compartilham a mesma
    classificação de runtime publicado. Swagger/Scalar e seu catálogo ficam restritos ao runtime
    local em `127.0.0.1`; a imagem publicada não copia esse catálogo.
20. Logout só limpa o estado visível depois de sucesso da API ou rejeição `401` com código de sessão
    controlado. Erro de rede, proxy ou servidor não pode fingir que um cookie `HttpOnly` foi revogado;
    falha de persistência preserva o cookie para permitir nova tentativa de revogação. Rotas de erro
    que pedem limpeza de sessão reutilizam o mesmo fluxo API-first.
21. A sessão temporária de “Visualizar como” usa o `device_id` assinado do próprio JWT na hidratação,
    permanece read-only e abre exceção de escrita somente para o `POST` exato de logout, que revoga a
    própria sessão especial.
22. O check de encoding cobre BOM, controles invisíveis e arquivos textuais sem extensão. A migration
    aplicada historicamente em ISO-8859 permanece intocada e é tratada como exceção legada conhecida.
23. `prisma migrate deploy` continua fail-fast no entrypoint, mas sua saída técnica fica em arquivo
    temporário `0600`, apagado ao final. Logs publicados recebem apenas status controlado e o exit code
    continua sendo propagado ao orquestrador.

## Topologia obrigatória de autenticação

Cookies `SameSite=Lax/Strict` não são uma solução para aplicações publicadas em sites diferentes.
Portanto, frontend, Admin e API precisam usar HTTPS e compartilhar o mesmo site registrável, ainda que
estejam em subdomínios distintos.

O backend deve receber em `WEB_URL` a lista exata das origens HTTPS do frontend e do Admin.
`getPublicWebOrigins()` alimenta CORS e Socket.IO; CORS usa `credentials: true` e não pode combinar
credenciais com origem genérica. Frontend e Admin enviam requests com `withCredentials: true`.

Se essa topologia não for atendida, o navegador pode recusar ou deixar de enviar o cookie. O sintoma
esperado é login sem persistência, falha de hidratação, `401` em API privada ou logout incompleto.
Isso é um bloqueio de promoção, não um fallback para bearer nos clientes novos.

## Relação com decisões anteriores

- ADR-0418 permanece como baseline da primeira auditoria de produção.
- Esta ADR substitui qualquer exceção anterior que permitisse reset de bucket ou alvo com aparência
  de produção, incluindo o bypass histórico descrito na ADR-0424. O reset local confirmado continua
  válido; o bypass não.
- A remoção do script manual `billing:sync` continua regida pela ADR-0430 e prevalece sobre a decisão
  histórica da ADR-0425.
- A compatibilidade do gerador OpenAPI compilado da ADR-0420 permanece apenas para uso local/CI; esta
  ADR substitui sua orientação anterior de expor ou conferir Swagger no runtime publicado.
- O bloqueio jurídico das páginas legais está registrado na ADR-0440.

## Normalização dos ADRs duplicados

O documento mais antigo preservou o número original; documentos posteriores foram movidos sem mudar
a decisão histórica:

| Documento | Novo ID |
|---|---|
| Categorias de especialidades | ADR-0422 |
| Hardening de code review pré-produção | ADR-0423 |
| Reset total do banco de desenvolvimento | ADR-0424 |
| Sincronização local Mercado Pago | ADR-0425 |
| Ajuste sandbox de Preapproval | ADR-0426 |
| Fallback sandbox de Preapproval | ADR-0427 |
| Retry de payer e-mail sandbox | ADR-0428 |
| Consulta de assinatura sem scope stage | ADR-0429 |
| Checkout sandbox com tunnel | ADR-0430 |
| Insistência controlada de notificações | ADR-0431 |
| Suporte a ngrok no tunnel local | ADR-0432 |
| Reconciliação de assinatura | ADR-0433 |
| Base local do Google OAuth | ADR-0434 |
| Comunidades no detalhe Admin do psicólogo | ADR-0435 |
| Central de moderação Admin | ADR-0436 |
| Sistema operacional em Analytics Admin | ADR-0437 |
| Metadados SEO administráveis | ADR-0438 |

## Compatibilidade e rollout

- **Banco:** nenhum schema, migration, coluna, constraint ou backfill foi criado ou alterado.
- **Dados:** não houve reset, seed, exclusão em massa nem limpeza de bucket.
- **Envs:** nenhuma variável nova ou tornada obrigatória. Foram removidas permissões antigas de reset;
  configurações públicas existentes passaram a falhar fechado quando inválidas.
- **Packages:** nenhuma dependência nova e nenhum lockfile alterado.
- **Contratos:** mudanças são aditivas ou mantêm fallback legado. CFP preserva o formato anterior;
  analytics preserva chaves consumidas; autenticação mantém bearer para clientes sem capability header.
- **Configuração existente:** as URLs públicas passam pela política central e devem usar origens/hosts
  HTTPS externos aprovados. No backend isso afeta `WEB_URL`, `BASE`, `FRONTEND_URL`,
  `GOOGLE_OAUTH_BASE_URL`, `CALLBACK_URL_API_USER`, `CALLBACK_FAIL_URL_API_USER`, `RECOVERY_URL`,
  `MERCADO_PAGO_BACK_URL` e `IP_GEOLOCATION_ENDPOINT`; Web Push valida `VAPID_EMAIL`,
  `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. No frontend/Admin afeta `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_FRONTEND_URL`, `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`, `NEXT_PUBLIC_LOGIN_URL`,
  `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_WEB_URL`, conforme a aplicação.
- **Mídia histórica:** antes do rollout, identificar hosts ainda referenciados. Fazer backfill retomável
  ou adicionar somente o host HTTPS aprovado à allowlist existente; não apagar registros ou objetos.

Ordem obrigatória:

1. Confirmar a branch `homolog` e revisar as configurações existentes de homologação antes do push.
2. Confirmar que frontend, Admin e API de homologação são same-site e que `WEB_URL` contém as duas
   origens exatas com CORS credenciado.
3. Fazer push em `homolog`, ciente de que ele dispara o deploy automático das aplicações.
4. Aguardar backend saudável e pronto; validar `/health` e `/ready` quando ele for afetado.
5. Com credenciais reais de homologação, testar no frontend e no Admin: login, hidratação, API privada
   e logout. Conferir também que nenhum token aparece em storage ou resposta para clientes novos.
6. Validar mídias históricas e rotas afetadas no browser.
7. Bloquear promoção diante de qualquer `401`, perda de sessão, erro de CORS, mídia bloqueada ou falha
   nos checks.
8. Configurar e revisar produção antes do merge. Promover somente por merge revisado para `main` e
   repetir os smokes depois do deploy.

Rollback de código é feito revertendo o commit em homologação. Não existe rollback de dados porque
esta revisão não os altera. Se a topologia de autenticação estiver errada, corrigir configuração e
republicar; não relaxar `SameSite`, CORS ou HTTPS como atalho.

## Validação

### Resultado local consolidado

- `pnpm check` aprovado sem warnings.
- Testes automatizados aprovados: backend **113**, frontend **19** e Admin **11**.
- Builds aprovados: backend, frontend com **89 páginas** e Admin com **29 páginas**.
- Imagem final do backend construída e executada como usuário não-root. Em PostgreSQL descartável,
  `/health` e `/ready` responderam `200`; em runtime `homolog`, Swagger respondeu `404` mesmo com
  flags locais ativas.
- Login, headers e guards anônimos foram validados localmente em viewport mobile e desktop. Fluxos
  autenticados não foram simulados e permanecem gate de homologação.
- Nenhum schema, migration, dependência ou lockfile foi alterado.
- Nenhum reset, seed, exclusão em massa ou limpeza foi executado.
- `pnpm audit --prod --audit-level high` aprovado nas três aplicações sem vulnerabilidade conhecida.

O smoke publicado em homologação ainda não foi executado porque depende do push. Ele deve ser
registrado depois do deploy e antes de qualquer recomendação de promoção.

## Pendências externas

- A TASK-41 continua bloqueada até aprovação jurídica de versões, textos, responsável, canais, idade
  mínima e política comercial. Placeholders não podem ser publicados.
- O QA autenticado de login, hidratação, API privada e logout depende de credenciais reais de
  homologação e é gate de promoção.
- Hosts de mídia histórica precisam ser confirmados antes do rollout.
- O tema dark/system do Admin requer task própria, validação de package e ADR.
- O uso dos vídeos demonstrativos precisa de autorização antes de produção.
- O número público de WhatsApp do suporte CFP aguarda fonte operacional aprovada. Torná-lo uma env
  obrigatória exigirá novo **ALERTA DE DEPLOY**.
- Se a credencial legada encontrada apenas no `sample/` local ainda for válida, ela deve ser revogada
  no provider responsável; seu valor não foi versionado nem documentado.
