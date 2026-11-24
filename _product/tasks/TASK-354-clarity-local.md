# TASK-354 - Analise de experiencia local

Status: release 0.1.855 autorizado pelo usuario; validacao final e publicacao em andamento.

## Release autorizado

Em 2026-11-24, usuario autorizou ativacao produtiva. Frontend habilita a categoria
em build de producao; localhost continua exigindo flag exclusiva de desenvolvimento.
Sem consentimento confirmado, nenhum SDK e carregado. Aceites antigos da Meta nao
concedem analise de experiencia. Switch inicialmente ligado somente na UI; recusa
anterior respeitada. Titulos/URLs publicos explicitados no aviso generico.

Configuracao opcional NEXT_PUBLIC_EXPERIENCE_ENABLED=false desativa o recurso
apos rebuild/deploy; ausente habilita somente producao. Nenhum segredo novo,
nenhuma migration, nenhuma mudanca de runtime de backend/admin/video. Manifests
sincronizados 0.1.855 por regra do repo; publicar apenas frontend nesta etapa.
Rollback: reverter o frontend ao deploy anterior ou desligar a flag e rebuild.
Vercel homolog desativado nos vercel.json de frontend/admin; confirmacoes Dokploy
homolog registradas em LOCAL-TO-PRODUCTION.md. Workflow Cloudflare nao toca este diff.
Nao alegar validacao em Safari/iOS, conta autenticada ou BFCache. Texto do painel
de preferencias acompanha este release; documento legal armazenado na API nao
foi alterado pelo agente. Confirmacao de recebimento Clarity depende de smoke remoto.

## Escopo

Preferencia independente de campanhas e integracao Clarity consentida, validada
localmente antes de qualquer liberacao de telas reais. Preservar URLs e SEO.

## Criterios

- [x] Preferencia separada, versionada, expira e nao herda aceite da Meta.
- [x] Falha de armazenamento mantem permissao fechada.
- [x] Controle disponivel somente em desenvolvimento com NEXT_PUBLIC_EXPERIENCE_PREVIEW=true.
- [x] Escopo local inclui feed, listagens, perfis, comunidades, posts, respostas e reels publicos.
- [x] Testes de politica/controlador existentes e novos: 20 passaram; TypeScript e ESLint passaram.
- [x] Validacao visual da preferencia no frontend local em 390x844 e 1280x900.
- [x] Controlador e loader testados com SDK real em fixture isolada, com envios externos bloqueados.
- [x] Validar script hospedado do projeto em fixture isolada; integracao real ainda pendente.
- [ ] Auditar metadados e validar cada rota candidata antes de liberar captura.
- [ ] Validar revogacao, mudanca de conta, navegacao SPA e voltar/avancar no app real.
- [ ] Revisao da politica de privacidade e aprovacao antes de release.

## Bloqueio

Atualizacao: apos o usuario desativar AdGuard, o download do tag e da biblioteca
voltou a funcionar. O projeto usa 0.8.80-beta com content:false. Teste com os scripts
baixados sem modificacao e fixture ficticia: sem carregamento, zero payloads;
com carregamento, conteudo e digitacao mascarados, interface visivel, titulo e
query presentes. Parada antes de navegar nao registrou a rota privada ficticia.
Todos os envios externos foram abortados no navegador; nenhum dado de sessao foi
enviado a Microsoft. Evidencia local: .tmp/clarity-audit/hosted-results.json.
O bloqueio DNS abaixo e historico; ainda faltam integracao real e protecao de metadados.

Em 2026-11-23, a consulta ao script https://www.clarity.ms/tag/zc89m5ggga falhou
por resolucao DNS local, inclusive em nova tentativa. Nao presumir a causa nem
alterar DNS, extensoes ou protecoes do computador automaticamente.
Sem acesso ao requisito externo, nao adicionar loader nao validado ao app.

Os testes anteriores com clarity-js 0.8.77 em localhost, dados ficticios e upload
em memoria demonstraram mascaramento seletivo e parada antes de navegar. Nao
validam o script hospedado, configuracoes do projeto nem a integracao real.

## Operacao

### API compativel e retomada em reels reais

Em 2026-11-24, HTML publico identificou api.lectum.com.br; /ping confirmou
0.1.854. Usado somente o post/video publico ja fornecido pelo usuario,
por proxy temporario GET-only com allowlist de rotas, sem encaminhar cookies
ou Authorization. Nenhuma escrita, deploy ou alteracao de configuracao remota.
Midia do host Cloudflare Stream retornado pela API permitida no navegador;
todos os uploads Clarity e requisicoes externas restantes bloqueados.

Chrome mobile 390x844 confirmou post renderizado, visualizador de reels,
reproducao real 1080x1920 e troca para o proximo video. Essa navegacao revelou
pausa permanente na captura: replaceState do player preserva estado interno
do Next e pode nao atualizar useSearchParams. Corrigido com currententrychange
somente entre URLs de reels publicos da mesma origem/path, apos frame seguinte;
consentimento e escopo revalidados, frame cancelado em nova navegacao/cleanup.
Rotas privadas, parametros arbitrarios e mudancas de pagina nao usam esse atalho.

Teste real apos correcao confirmou retomada e body mascarado, sem erros JS,
16 payloads interceptados/abortados. Teste unitario adicionado para transicoes
validas e privadas/inseguras; test:privacy passou com 41/41. Evidencia local:
.tmp/clarity-audit/public-post-reel-results.json e reel-real-mobile.png.
Repeticao final passou tambem com revogacao: voltar ao video anterior nao
retomou coleta apos remover o consentimento. Lint dos arquivos alterados e
novo build completo passaram (exit 0, 95 paginas estaticas), apos esta correcao.
Proxy temporario encerrado ao finalizar. Sem commit, push ou deploy nesta etapa.
Avatares, ranking e thumbnail auxiliar bloqueados deliberadamente pelo proxy;
nao confundir esses 403 com falha produtiva. Esta evidencia supera o bloqueio
de API antiga abaixo, sem atualizar homologacao. Ingestao Microsoft, conta
autenticada e Safari/iOS continuam fora desta validacao. Captura produtiva
continua desativada; nenhuma sessao enviada ao Clarity.

### Checks, build e post real em 2026-11-24

pnpm --dir frontend check concluiu com exit 0: Biome, ESLint, TypeScript e
suites do comando passaram. Testes de browser opcionais sem PLAYWRIGHT_MODULE
foram pulados; nao contabilizar esses casos como validados. test:privacy passou
com 40/40. Build local de producao compilou e gerou 95 paginas estaticas;
feature de experiencia permanece exclusiva de desenvolvimento, sem release.

Teste Chrome mobile 390x844 com API real de homologacao: post publico renderizou,
sem SDK antes do consentimento. Escolha confirmada pela UI da listagem de
psicologos; retorno ao post manteve body mascarado e captura ativa. Foram 12
payloads interceptados/abortados em tres carregamentos completos, zero erros
JavaScript. Evidencias ignoradas: .tmp/clarity-audit/post-reel-results.json e
post-real-mobile.png. Nenhum envio ao Clarity; midias bloqueadas neste teste.

O link de reel exibiu pagina 404, nao o visualizador. Consultas anonimas GET
confirmaram 404 nas rotas SEO community-post/.../videos/... e
posts/.../content-videos do item escolhido. Playback publico desse asset
respondeu 200; portanto, nao confundir a falha do link com falta do arquivo.
Homolog usa backend 0.1.737; validar reels completos requer API compativel com
o frontend atual. Nao alterar backend remoto nem substituir respostas por mocks.
Reproducao e navegacao entre reels continuam pendentes, assim como validacao
autenticada. Proxy somente leitura encerrado depois dos testes. Sem deploy.

### Validacao com leitura real de homologacao

Em 2026-11-24, usuario identificou homolog-api.lectum.com.br no Dokploy.
/ping respondeu 200, versao 0.1.737. SEO metadata e legal/current responderam
200; comunidade ansiedade retornou 404 (nao conclui ausencia da rota).
Listagens anonimas de comunidades e psicologos responderam 200. Sem CORS para
origem localhost, usado proxy temporario local 3999 com allowlist GET, sem
encaminhar cookies/Authorization, sem seguir redirects e sem escritas remotas.
Proxy encerrado apos o teste; nenhuma configuracao do servidor foi alterada.

Chrome com app local e SDK real passou: sem carga antes do aceite, confirmacao
pelo formulario de preferencias, listagem com dados reais, clique real de perfil,
retomada publica/voltar, rota privada excluida e revogacao impedindo nova coleta.
Um carregamento do SDK, 16 payloads interceptados/abortados. Evidencia local:
.tmp/clarity-audit/navigation-results.json. Nenhum payload enviado ao Clarity.
Midias externas bloqueadas; nao foi validada reproducao de videos, todos os posts
e reels, conta autenticada, BFCache ou ingestao remota. Homolog antigo nao comprova
compatibilidade integral com frontend atual. Nenhum deploy/commit/push.

### Verificacao do ambiente em 2026-11-24

Backend deste checkout sem .env; sem listeners locais nas portas 3001, 3999,
5432 ou 6379. Outro frontend local (lectum-homolog-community-name) aponta para
localhost:3001, mas backend correspondente sem .env/.env.local. Nenhuma credencial
foi impressa, copiada ou solicitada. Nao apontar automaticamente para producao.
Incluidos testes de experience-policy/controller no comando test:privacy:
40 testes passaram. Check completo encontrou ESLint lendo artefatos do distDir
de previa; acrescentado ignore especifico .next-experience-preview/**, equivalente
ao ignore ja existente de .next/**. Nao suprimir verificacoes do codigo-fonte.
Validacao completa com backend real permanece dependente de ambiente local.

### Retomada local entre rotas

Controlador agora pausa antes de mudar URL e retoma apos commit React da rota,
revalidando consentimento/URL. Atualizacoes de historico sem mudar URL nao pausam.
Promise do SDK reutilizada na mesma instancia, inclusive apos troca de identidade.
ExperienceCapture dentro de Suspense por usar useSearchParams. A CSP permite
scripts.clarity.ms e b.clarity.ms somente em development com a flag de previa;
producao permanece inalterada. Nao ha wildcard adicional nem cookie-sync.

Chrome com app Next real e biblioteca real: nenhum carregamento antes de aceite;
um carregamento apos aceite; retomada na navegacao publica e ao voltar; rota privada
de teste ausente nos payloads; revogacao impede retomada. 12 payloads interceptados
e abortados, sem envio externo. Evidencia: .tmp/clarity-audit/navigation-results.json.
Teste usou History API e conta visitante, sem API local disponivel; nao valida
conteudo completo, login real, BFCache, todos os links Next nem ingestao remota.
24 testes unitarios, TypeScript e ESLint dos modulos alterados passaram.
Sem commit, push ou deploy; tarefa ainda parcial. As notas anteriores de parada
definitiva na primeira navegacao foram substituidas por esta implementacao.

### Ampliacao solicitada pelo usuario

Perfis, posts e reels foram explicitamente incluidos por serem publicos. A politica
local agora permite /, /psicologos/[id], /comunidades/[slug], publicacao/[id] e
resposta/[replyId], alem das listagens. Aceita somente os parametros de navegacao
reel/reelPost/reelReply, focusReplyId e community no contexto adequado, com IDs
validados e sem duplicatas. Fragmentos de resposta precisam coincidir com focusReplyId.
Referrers publicos seguem a mesma validacao. Buscas livres, tokens, parametros
desconhecidos, contato/WhatsApp e areas privadas continuam excluidos.
23 testes passaram. A autorizacao de escopo nao muda mascaramento, consentimento,
SEO nem o bloqueio de producao. Validacao integrada e retomada entre navegacoes
SPA ainda pendentes; o controlador atual encerra ao navegar. Sem deploy.
Esta decisao substitui a restricao a duas listagens nas notas historicas abaixo.

### Escopo simplificado aprovado para desenvolvimento

O usuario pediu continuar sem depender de suporte. A consulta externa deixa de
ser requisito para o escopo inicial. A politica local permite somente as duas
listagens /psicologos e /comunidades, sem query/hash e com consentimento valido.
Origem limitada a lectum.com.br/www; localhost HTTP exige flag explicita de previa.
Referrer vazio ou da mesma origem e de uma dessas listagens, sem query/hash.
Detalhes, feed, filtros, perfis, posts, reels e areas privadas continuam excluidos.
Nao alterar SEO nem alegar que URLs/titulos/links sao anonimos: esta limitacao
permanece e deve ser considerada na validacao integrada. Navigation API continua
obrigatoria; ao navegar a captura encerra sem reinicio automatico nesta etapa.
22 testes unitarios passaram. Feature segue exclusiva de desenvolvimento:
nenhuma captura habilitada em build de producao. Validacao no app com dados reais
e build completo ainda pendentes; nao houve commit, push ou deploy.
As notas anteriores sobre lista vazia e dependencia de suporte sao historicas.

### Auditoria de metadados e dependencia externa

- /psicologos: titulo generico; filtros podem conter busca livre, especialidade,
  religiao e outros atributos. Inventario em frontend/src/utils/analytics-path.ts.
- /psicologos/[id]: pagina publica individual; revisar titulo resolvido, contatos,
  imagens e destinos de links antes de aprovar. Publicidade do perfil nao implica
  que a associacao entre visitante e profissional deva ser exportada sem avaliacao.
- /comunidades/[slug]: o proprio caminho identifica o tema da comunidade.
- Publicacoes/respostas/reels: caminhos identificam conteudo e os metadados dos
  reels incluem post_title, video_title e professional_name. Fonte:
  frontend/src/lib/reel-seo.ts, reelSeoContent. Nao modificar SEO para esconder isso.
- Parametros adicionais observados: focusReplyId, reel, reelPost, reelReply,
  community. Links de contato podem conter text com mensagem de WhatsApp.
- Login, recuperacao de senha, /app, pagamento e administracao continuam fora
  do escopo. A lista aprovada continua vazia, inclusive nas paginas genericas,
  pois links de saida e navegacao ainda precisam de validacao integrada.

Documentacao oficial consultada: https://learn.microsoft.com/clarity/faq e
https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api.
A FAQ orienta solicitar mascaramento de parametros a clarityMS@microsoft.com;
essa funcionalidade nao cobre referrer nem clicked URLs. Nao foi identificada
na API publica consultada uma opcao documentada que substitua todos esses
metadados por rotas/titulos genericos antes do envio. Isto nao prova que uma
opcao adicional nao exista; requer esclarecimento do fornecedor.

Rascunho para suporte (nao enviado):

Project zc89m5ggga, lectum.com.br. We are validating Clarity locally, with strict
masking and cookies disabled, before enabling production capture. Our public
community pages can contain health-related topics in page titles and paths.
Can Clarity suppress or normalize page titles, URL paths, referrer URLs and
clicked-link URLs before transmission, without changing the site's URLs or SEO?
Please clarify whether URL-parameter masking occurs client-side before upload.
We also need masking for search, q, specialty, service, approach, target_audience,
religion, race_color, gender, city, state, language, modality, community,
focusReplyId, reel, reelPost, reelReply and text. What is the supported approach
for SPA navigation and revocation? Please do not enable collection or change
our project configuration without confirmation.

Sem envio de email, mudanca remota, commit ou deploy nesta auditoria. O proximo
passo externo e esclarecer as capacidades acima; alternativa de produto e
limitar o escopo a telas que passem na auditoria, sem prometer cobertura total.

### Revalidacao apos configuracao do painel

Em 2026-11-23, apos o usuario desativar cookies, nova leitura HTTP 200 do tag
confirmou content:false e track:false. O tag passou a apontar para 0.8.77,
diferente da biblioteca 0.8.80-beta fixada no loader local; nao atualizar o loader
nem liberar rotas automaticamente com base nessa mudanca externa.
Teste isolado com tag e biblioteca atuais: sem carregamento, zero payloads;
com carregamento, quatro payloads interceptados, texto e digitacao mascarados,
titulo e query ainda presentes. Nenhum cookie-sync foi observado nesse teste.
Depois de stop, zero payloads novos e nenhuma marca da rota privada.
Todos os envios de captura foram abortados; nao houve envio de sessoes ao Clarity.
Evidencia: .tmp/clarity-audit/current-results.json. Os 20 testes unitarios
passaram novamente. A cobertura de rotas reais continua pendente; nenhuma foi
liberada e nao houve publicacao. Proximo gate: decidir tratamento suportado dos
metadados sem alterar URLs/canonical/SEO e validar no app real.

Loader local implementado com biblioteca 0.8.80-beta fixada, inicializacao explicita,
mascaramento do body e armazenamento de cookies desabilitado. O tag autoexecutavel
nao e usado, evitando inicializacao durante download e chamada de cookie-sync.
Quatro cenarios no Chrome passaram: sem permissao, revogacao durante download,
revogacao ativa e navegacao. Evidencia: .tmp/clarity-audit/controller-results.json.
O controlador exige sinal de pre-navegacao e encerra a captura ao navegar; nao
retoma automaticamente na SPA. Sem Navigation API, nao captura.

Por pedido do usuario, o switch aparece ligado na primeira abertura. Isso nao
grava autorizacao: a escolha so persiste apos confirmar. Uma recusa salva continua
desligada ao reabrir. Validado no Chrome: estado inicial ligado sem registro,
salvamento independente da Meta, revogacao e reabertura desligada. Zero requisicoes
Clarity no teste da UI.
Previa usa Webpack e distDir separado para coexistir com o servidor local existente.
Servidor: http://127.0.0.1:3146. API de teste apontada para localhost, sem escrita remota.

Nenhum pacote novo, alteracao de CSP, URL, titulo, canonical ou captura de usuarios.
Variavel opcional apenas para previa; ausente mantem a UI atual. Build de producao
ignora a flag. Nenhum banco ou servico remoto alterado. Rollback: retirar a flag
local e reiniciar o dev server. Nao houve commit, push ou deploy; task pendente.

Decisao: adrs/0718-clarity-local-gates.md.
