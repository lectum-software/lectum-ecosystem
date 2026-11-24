# ADR-0724 - Retirar esperas do feed anonimo

Data: 2026-11-24

## Contexto

O PageSpeed identifica a midia da resposta profissional como LCP. O interceptor
aguarda fingerprint para toda chamada, inclusive leitura publica. O fingerprint
coleta componentes pesados antes de filtrar os componentes usados no hash.

## Decisao

Permitir somente GET anonimo em community, community/feed/posts e playback
publico sem aguardar device. Marcador de sessao, Authorization explicito ou
auth do Axios mantem o caminho autenticado. O caminho anonimo nao envia cookies;
nao reduz validacao de sessao no servidor. Nenhum POST ou outra rota e liberado.
Carregar a biblioteca de fingerprint dinamicamente, mantendo hash e timeout.
Preservar seed, query keys por viewer, ranking, filtros e paginacao existentes.

Adiar posters de players em modo visible ate 300px da viewport e manter capas
ja vistas; active/standby preservam preparacao. Otimizar avatares HTTPS via Next
com allowlist existente, mantendo bypass HTTP no desenvolvimento. Derivar icone
WebP 192px do SVG original sem alterar o original. Modal de criacao sob demanda.
Remover bloqueio global de zoom em viewport, CSS e montagem de MobileZoomGuard.

## Consequencias

Sem contrato backend, migration, env ou dependencia nova. Nao tornar o feed
personalizado cache publico nem alterar mecanismos de seguranca de escrita.
Otimizar imagem via Next usa o servico existente da Vercel e deve ser acompanhado
quanto a consumo. SSR e revisao de CSP exigem medicao/escopo separados.
Nao prometer nota Lighthouse: repetir o teste apos deploy autorizado.
