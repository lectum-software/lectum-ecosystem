# ADR-0507 — GlitchTip e ambientes Vercel

Data: 2026-09-16

## Status

Aceita.

## Contexto

A Vercel tinha envs apontando para GlitchTip Lectum, mas as políticas de frontend/admin aceitavam somente Sentry SaaS. Isso desabilitava runtime, CSP de ingestão e source maps mesmo com DSN válido. Algumas URLs públicas estavam classificadas como Secret, dificultando revisão. O usuário autorizou correção, revisão dos dois ambientes e manutenção temporária do dummy de pagamento em Production.

## Decisão

- Usar SDK Sentry existente, permitindo adicionalmente apenas `glit.lectum.com.br` via HTTPS/443. Sem wildcard de domínio Lectum e sem dependência nova.
- Manter projetos frontend/admin separados, cada um com homolog e production próprios; nunca inferir ambiente pelo NODE_ENV.
- Validar `SENTRY_URL` do build contra destino do DSN. Ausente usa destino seguro correspondente; divergente desabilita publicação de source maps. Token privado nunca vira NEXT_PUBLIC nem é enviado para host arbitrário.
- Preservar sanitização, descarte de PII/requests/breadcrumbs/contextos, tracing/replay/logs desativados, falha de upload não bloqueante e remoção de mapas públicos.
- Manter envs públicas como Config e tokens de build como Secret na Vercel. Configurações alteradas valem só para novos builds.
- Não promover código para main/produção nesta task. Pagamento real continua bloqueado enquanto a chave dummy não for substituída pelo responsável.

## Consequências

- Configuração Vercel torna-se verificável por ambiente e o GlitchTip passa a ser aceito sem afrouxar proteção de dados.
- Cada aplicação mantém sua política local equivalente: aplicações são independentes em produção, sem package compartilhado novo.
- Tokens existentes foram reutilizados sem criar/ampliar permissões. Revisão futura de escopo mínimo continua recomendada.
- Nenhuma alteração de DNS Cloudflare, banco, migração, fila, R2/Stream ou tráfego entre APIs.

## Rollback e validação

Reverter a integração/configuração de observabilidade sem tocar nos dados. Testes incluem DSNs e destinos malformados, colisões de hostname e compatibilidade SaaS. Evidências de checks, builds e smoke real são registradas na TASK-186.

## Validação de empacotamento Vercel

O deploy 0.1.399 expôs um defeito latente no postbuild: após remover os source maps, os arquivos `.nft.json` ainda os listavam como dependências. Vercel falhou com ENOENT ao montar a função; versão anterior permaneceu atendendo. O plugin remove apenas mapas estáticos durante a compilação; o postbuild remove todos os mapas e poda somente referências `.map` dentro da própria `.next` nos manifests de tracing. Referências externas, JavaScript runtime e demais metadados são preservados. Testes usam filesystem temporário real e verificam idempotência e recusa de manifesto inválido. Não se resolve expondo mapas em produção nem ignorando falhas do empacotador.

A Vercel/Next 16 usa um adapter que monta output antes do postbuild. A 0.1.400 ainda falhou no empacotamento mesmo com os traces podados. A limpeza agora inclui links simbólicos `.map` dentro da `.next`, sem seguir diretórios symlink nem excluir seus alvos externos. Isso cobre o output do adapter, ausente no `next build` local convencional. Teste real de filesystem preserva o alvo externo e o link JavaScript, remove links de mapa (inclusive dangling) e é idempotente. Evidência final deve vir do deploy Vercel, não apenas do build local.
