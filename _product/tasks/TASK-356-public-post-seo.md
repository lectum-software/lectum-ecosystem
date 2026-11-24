# TASK-356 - Conteudo publico no HTML

Status: Validado localmente; publicacao autorizada pelo usuario em 2026-11-24, ainda pendente.

## Escopo

Entregar o post e respostas publicas na renderizacao inicial, com autoria profissional,
texto integral e transcricoes recolhidas. Corrigir VideoObject incompleto sem inventar
miniaturas, datas ou URLs. Manter os componentes e controles existentes.

## Aceite

- [x] HTML publico contem texto integral e autores das respostas renderizadas.
- [x] Transcricoes permanecem no HTML com painel fechado.
- [x] VideoObject emitido tem campos obrigatorios e URL de reproducao real.
- [x] Consultas SSR nao encaminham cookies ou tokens; anonimato preservado.
- [x] Testes, typecheck, build e verificacao local com API real.

## Validacao local em 2026-11-24

- `pnpm check`, build do backend e build do frontend concluidos com sucesso.
- HTML e Playwright em 390px e 1440px usando leituras anonimas da API publica:
  texto integral, nomes profissionais e tres transcricoes presentes; painel abre/fecha.
- PostgreSQL 18.6 isolado em 127.0.0.1:55436, banco `lectum_seo_local`, migrations
  reais aplicadas. Nenhum banco publicado ou credencial de provider foi usado.
- Roteador compilado real com registros temporarios removidos ao final: nove checks
  passaram, incluindo metadata, MP4/capa locais, assinatura RSA efemera, transcricao
  e 404 para resposta/post removido, comunidade/autor inativo e video nao pronto.
- Evidencias locais (nao versionadas): `out/seo-post-preview/` com logs,
  screenshots e verificador de integracao.

## Limites e rollout

A hidratacao inicial respeita a pagina existente de oito respostas; nao promete
renderizar toda discussao de tamanho arbitrario. A rota individual de resposta
tambem recebe hidratacao. A paginacao de transcricoes SEO permanece existente.

O teste Stream valida assinatura e autorizacao com chave local, sem requisicao ao
provider. Confirmar redirecionamentos e acesso a midia real no smoke publicado.
Publicar backend antes de frontend: campos sao aditivos e frontend omite VideoObject
incompleto enquanto o backend antigo estiver ativo. Sem migrations novas ou envs novas.
Somente depois do smoke solicitar Validar correcao no Search Console; nao garantir
indexacao nem prazo de rastreamento.

## Referencias

Exemplo fornecido: cmwe1fr1501p001o0o6tb18e3. O HTML atual entrega apenas metadados
e transcricoes em JSON-LD incompleto. A busca no HTML rastreado nao prova, sozinha,
quais termos estao no indice do Google. Indexacao final nao pode ser garantida.

Inventario de prototipos consultado; screenshots do usuario e UI existente sao a
referencia deste ajuste sem redesenho. Builder nao utilizado.
