# TASK-358 - Capa real no compartilhamento de videos

Status: Concluida localmente.

## Escopo

Alinhar Open Graph e Twitter com a capa publica estavel do video em posts e
respostas. Preservar posts sem video e o comportamento de compartilhamento
WhatsApp sem player. Sem migration, dependencias ou alteracao visual.

## Aceite

- [x] Capa usa a mesma autorizacao e URL das paginas individuais de video.
- [x] Funciona sem transcricao e respeita a midia principal do post/resposta.
- [x] Nao anuncia dimensoes inventadas para a capa.
- [x] Testes, checks, builds e integracao local real.

## Evidencias locais

- 11 testes focados de metadados e compartilhamento passaram.
- pnpm check e pnpm check:version passaram; manifests em 0.1.860.
- Builds backend e frontend passaram com Node 24.22.3.
- Integracao real: 15 verificacoes com PostgreSQL isolado em loopback,
  Express compilado, midia MP4/JPEG local e resolvedor real do frontend.
  OG/Twitter e WhatsApp usam a capa estavel, inclusive sem transcricao.
- Banco local desligado apos o teste; nenhum dado de producao acessado.
- Logs locais em out/seo-post-preview/share-*.log (nao versionados).

## Publicacao

Somente implementacao local autorizada. Sem push ou deploy desta task.
Publicar backend e frontend de forma coordenada apos aprovacao.
Nao altera o PNG generico existente nem garante reindexacao imediata.

Referencia: ADR-0722.
