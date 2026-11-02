# TASK-311 - Preparacao da publicacao legal

## Escopo

Publicar o primeiro par de documentos completos e ativar o aceite solicitado.
Autorizacao de publicacao recebida. A captura inicial do Admin em 02/11/2026
mostrava zero documentos, mas a consulta posterior a API de producao confirmou
configured=true, Termos v1 e Politica v1 publicados. Preservar essas versoes;
as minutas internas v0.3 nao substituem os documentos publicados pelo responsavel.
Autodeploys confirmados desligados pelo responsavel antes desta release.

## Etapas

- [x] Preservar cadastro de clientes antigos sem fabricar aceite de uma versao.
- [x] Validar bloqueio de notas editoriais e avisos de minuta no Backend e Admin.
- [ ] Finalizar fatos de armazenamento, transferencias, retencao e controles de dados.
- [x] Implementar e validar manifestacao especifica da autorizacao promocional profissional.
- [ ] Atualizar templates do Admin com os documentos finais revisados.
- [x] Validar cadastro por email/Google, versoes e datas de aceite.
- [ ] Publicar com rollout coordenado, sem bloquear cadastro existente.

## Rollout

O par de documentos ja foi publicado pelo responsavel. Clientes antigos sem IDs
continuam criando contas sem evidencia de aceite; a modal solicita a confirmacao.
Clientes com IDs devem confirmar os documentos indicados, sem aceite parcial.
A ausencia do novo campo promocional nao implica autorizacao retroativa.
Aplicar a migration
20261102193000_professional_promotional_acceptance no Backend antes do Frontend.
Ela amplia constraint e trigger sem converter registros anteriores. Nao modificar
documentos imutaveis nem presumir aceite retroativo.

## Estado

Atualizacao desta release: Backend /ping 0.1.771, /ready ready e Frontend /version
0.1.771 confirmados. Documentos atuais disponiveis; nao ha importacao de minutas
nem alteracao dos documentos imutaveis neste lote. Os registros abaixo sao
historicos e nao devem ser usados como indicacao atual de ausencia de documentos.
Runtime dos gates normalizado em Node 24.22.1 com pnpm 10.33.0.

Validacao da release 0.1.773: pnpm check integral passou. Builds Frontend e Admin
passaram. Integracao real com PostgreSQL local passou apos a compatibilidade de
clientes antigos e a leitura da declaracao de maioridade legada. QA no browser
local passou em 320/390/1440 px, sem overflow ou erros de pagina, incluindo email,
modal Google, datas, falta de aceite distinta de erro de consulta e exclusao de
conteudo. Modal de atualizacao validada com duas declaracoes quando ha evidencia
previa e tres quando nao ha; nenhuma declaracao legal pre-marcada. Fixtures
temporarias eliminadas ao terminar. Teste exercita preparacao Google e repositorio,
nao autentica uma conta real no provedor externo. Gate final Backend passou:
check, 1148 testes aprovados (1 ignorado) e build, todos com exit 0. Conferidos
templates sincronizados e diff sem erros de whitespace. Nenhum deploy iniciado.

O build de producao Frontend foi validado separadamente; o smoke visual usa o dev
server com API local. Uma tentativa de smoke do build com API HTTP local nao foi
usada como evidencia (a politica de URLs de producao exige origem HTTPS publica).
Nenhuma protecao de origem/TLS foi relaxada. O erro transitorio de recarga do dev
server nao se repetiu na rodada completa final.

Maioridade nas atualizacoes: status autenticado informa se existe evidencia
persistida em legal_acceptance, inclusive de versoes anteriores, ou na declaracao
adult_declaration do cadastro legado (minimum_age=18 e source=registration). O frontend
omite apenas esse campo quando a API confirma a evidencia; clientes/API antigos
ou ausencia de evidencia mantem a declaracao. Nao inferir pela data de nascimento,
perfil ou simples existencia da conta. Sem migration adicional.

Por pedido posterior, removido o link visivel "Link permanente desta versao" nas
duas paginas. URLs versionadas, selecao exata e historico de aceite preservados;
quem abrir uma URL historica ainda pode consultar a versao atual.

Simplificacao das paginas legais solicitada: removidos logo e acesso ao login do
topo e links cruzados do rodape, no template compartilhado por Termos e Politica.
Permalink preservado: URL com ID da versao; nao registra aceite nem copia o link.

Publicacao em producao novamente autorizada em 02/11/2026. Preflight encontrou
minutas com marcadores internos e ausencia de par publicado; nao houve push ou
deploy. Corrigida a descricao da Politica que ainda prometia destaque promocional
junto ao checkbox ja removido. O aceite simplificado nao deve ser descrito como
manifestacao separada. Rollout continua pendente da finalizacao dos documentos e
da compatibilidade entre sua publicacao e a ativacao dos clientes.

Ajuste de previa solicitado: remover o banner de documentos indisponiveis nas duas
telas de cadastro e permitir abrir a modal Google independentemente de legalReady.
O submit da modal permanece desabilitado sem documentos, e os handlers mantem o
guard antes de preparar OAuth. Texto comum simplificado para "Li e aceito os
Termos de Uso e a Politica de Privacidade", preservando links versionados.
24 testes legais passaram, incluindo modal sem documentos e guarda dos handlers.

Decisao posterior do responsavel: retirar tambem o paragrafo promocional do
checkbox profissional, tanto no email quanto no Google. O campo compartilhado
agora renderiza somente a frase simplificada e os dois links. A descricao anterior
de destaque junto ao checkbox fica superada; revisar sua correspondencia com a
clausula e o registro promocional antes de qualquer rollout. Sem publicacao.

Em andamento. TASK-309 esta publicada na versao 0.1.771; TASK-310 permanece local.
Nenhuma nota interna ou minuta foi publicada. Nao inventar dados de infraestrutura.

Atualizacao local: checkbox profissional unico com destaque da secao 6; email e
OAuth transportam a manifestacao explicita. Migration aditiva aplicada somente no
PostgreSQL local isolado. Integracao real passou, incluindo rejeicao para pacientes,
preservacao de data/acao historica e rollback integral das fixtures. Teste OAuth
confirma preservacao de true/false/ausencia e vinculacao ao nonce. Frontend possui
23 testes legais aprovados, incluindo renderizacao distinta por papel.

O responsavel optou por nao fornecer localizacao/backups; nao repetir a pergunta
nem presumir fatos ou dispensa de transparencia. Fornecedores continuam descritos
por categorias nas minutas publicas. Essa decisao nao remove os bloqueios de
publicacao de marcadores internos nem comprova revisao juridica.

Rodada atual: checks completos de Backend, Frontend e Admin finalizaram com exit 0
(.tmp/task311-check-final.log). Backend: 1148 aprovados, 1 ignorado, zero falhas.
Checks de ADRs, tasks, encoding, source-safety e source-size tambem passaram.
Integracao PostgreSQL repetida com Node 24.22.1 passou. A cadeia pnpm ainda usa
24.16.0 em subprocessos; normalizar runtime antes dos gates finais da release.
Builds e QA visual deste delta nao realizados. Sem commit/push/deploy.

Historico da rodada anterior: 18 testes de contratos Backend e 14 de politica Admin aprovados;
integracao PostgreSQL isolada confirma rejeicao sem IDs, sem aceite parcial e com
rollback integral das fixtures. Templates locais v0.3 sincronizados e verificados.
Solicitadas evidencias de regiao/backups e decisao sobre retirada da autorizacao
promocional. Sem commit/push/deploy.

Na rodada anterior, o check integral nao concluiu em uma unica execucao: a configuracao herdada de QA
afetou o teste de origem publica (URL HTTPS local) e quatro casos de ambiente
descartavel (NODE_ENV herdado). Com localhost, o check completo frontend passou.
Os tres arquivos backend afetados foram repetidos sem NODE_ENV: 15 testes passaram.
Backend Biome/runtime-deps/tipos passaram; a rodada ampla de testes teve somente
essas quatro falhas. Check completo Admin passou separadamente. A rodada ampla
registrou aviso de Node 24.16.0 abaixo do minimo declarado; preparar runtime
uniforme e repetir os gates finais antes de publicar. Builds e QA visual desta
etapa nao foram executados. Nao declarar a release pronta.
