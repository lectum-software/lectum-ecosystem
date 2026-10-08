# TASK-237 - Avatar e cor na criacao de comunidade

## Escopo

Selecionar avatar antes de criar, visualizar avatar/nome/header e sugerir cor
predominante no navegador. Cor manual tem prioridade; botao permite restaurar
a sugestao. Reutilizar upload/preparacao e paleta existentes. Admin apenas,
sem banco, API nova, IA, dependencia ou deploy. ADR-0577.

Referencia: captura do usuario de 07/10/2026, criacao no Admin.
PROTO-INVENTORY consultado; Builder indisponivel nesta sessao. Layout existente,
mobile-first 390px e desktop. Nao alterar comunidades existentes.

## Aceite

- [x] Avatar opcional JPEG/PNG/WebP ate 5 MB antes do submit, com previa/remocao.
- [x] Cor sugerida por amostra pequena; transparencia e detalhes neutros tratados.
- [x] Ajuste manual nao sobrescrito por analise/troca de imagem; restaurar sugestao.
- [x] Preview acompanha nome, avatar e cor; falha da sugestao nao bloqueia upload.
- [x] Criacao + upload ligados aos contratos existentes; retry preserva ID no codigo.
- [x] Testes, admin check/build e verificacao local responsiva.
- [x] Validar persistencia/autenticacao/upload reais e retry no Admin local.

## Riscos e rollout

Operacao em duas etapas: comunidade e criada ativa antes do upload. Se avatar
falhar, preservar ID e rascunho, congelar dados ja salvos e oferecer retry ou
abrir comunidade criada. Nunca afirmar sucesso completo se avatar falhou.
Rollback apenas do Admin; sem migration/env. Publicacao exige novo pedido.

## Evidencias e limite

Admin check aprovado (Biome, ESLint, TypeScript, suite completa e sete testes
novos). Build webpack aprovado, 34 paginas; aviso de cache nao bloqueante.
Gates tasks, ADRs, source-size, source-safety, ciclos e diff-check aprovados.
Teste de recuperacao e verificacao estrutural de wiring, nao prova de persistencia.

outputs/check-community-create.cjs monta o componente real com providers reais
em browser isolado, sem simular endpoints nem sucesso de submit. Em 320/390/1440:
avatares existentes ansiedade/relacionamentos, sugestoes #FB883C/#FA4A4A,
edicao manual protegida, restauracao, remocao, formato/tamanho invalidos,
validacao Zod, imagens decodificadas e ausencia de overflow/pageerrors.
Nenhuma requisicao de escrita; capturas inspecionadas em mobile e desktop.

Admin de desenvolvimento criado com autorizacao do usuario. Login e hidratacao
validados pela API local contra Lectum Development; nenhuma credencial produtiva
usada. Previa aprovada pelo usuario e publicacao solicitada em 07/10/2026.

Revisao de pre-publicacao identificou dependencia pendente: o launcher local nao
configura Cloudflare R2, e o storage real exige R2 para o upload de avatar.
Existem credenciais na configuracao antiga, mas seu isolamento de producao nao
foi confirmado; nao foram copiadas nem usadas para upload de teste.
Falta configurar armazenamento de desenvolvimento e validar criacao, upload e
retry reais. Task em andamento; sem commit, bump, push ou deploy enquanto essa
validacao nao for concluida. Nenhuma comunidade de teste criada nesta revisao.

Verificacao de storage solicitada pelo usuario: ListBuckets autenticado retornou
HTTP 200 e dois buckets, public e outro de nome tecnico, nenhum identificado como
desenvolvimento. Configuracao antiga aponta para public. Consulta limitada ao
prefixo community/avatar/ encontrou um avatar antigo em public e nenhum no outro
bucket. Nenhum possui configuracao CORS. HEAD do avatar atual consultado pela API
produtiva nao encontrou esse objeto em nenhum dos dois buckets; HEAD pela API
produtiva do avatar antigo retornou 404. Isso nao comprova isolamento: nao foi
possivel vincular os buckets a ambientes com evidencia suficiente. Apenas leituras,
sem uploads, exclusoes, mudancas de configuracao ou exposicao de credenciais.

## Desbloqueio e validacao autenticada

Usuario autorizou criar lectum-development. Bucket criado e verificado por
HeadBucket; buckets anteriores intactos. Launcher fora do repositorio fixa esse
destino e mantem banco Lectum Development, schedulers e pagamentos desligados.
Nenhum segredo de desenvolvimento ou alteracao do launcher entra no release.

outputs/check-community-create-auth.cjs validou login no Admin local e duas
comunidades temporarias: cor manual #123456 preservada e sugestao #FB883C salva.
Falha de rede provocada apenas no primeiro upload do segundo caso, sem simular
respostas: retry enviou avatar ao mesmo ID, com uma unica requisicao de criacao.
Detalhe real confirmou nome/cor/avatar, imagens retornaram HTTP 200 e HeadObject
confirmou ambos os arquivos exclusivamente no bucket escolhido para o teste.
Sem erros de pagina. Captura do detalhe inspecionada. Ambas as comunidades foram
desativadas pela API local apos o teste (HTTP 200), sem exclusoes.

Publicacao autorizada pelo usuario; fluxo segue PR homolog -> main. Evidencias
operacionais em outputs/community-create-auth-result.json, fora do repositorio.

## Verificacao de release 0.1.609

Bump executado uma vez, ainda sem commit/push. Guards e check do frontend passaram.
Check do Admin completo passou, incluindo os sete testes novos. Check do backend
passou Biome, dependencias e TypeScript com a URL loopback isolada de verificacao,
mas o runner tsx falhou antes dos testes: os.userInfo/uv_os_get_passwd retorna
ENOMEM neste executor Windows, inclusive em um processo Node isolado. Solicitada
nova execucao de outputs/validar-release-local.ps1 no PowerShell normal, sem
alterar testes, usar banco real nessa suite ou contornar a falha. Resultado antigo
de 13:57 nao valida este release. Aguardar resultado novo antes de promover.

Usuario executou novamente: resultado 0 em 07/10/2026 22:38:58, log confirma
0.1.609 e todas as etapas do check completo. Bloqueio do runner resolvido pela
execucao normal, sem modificar testes.

Build 0.1.609 compilou e gerou as paginas, mas a etapa final de protecao contra
source maps detectou arquivos antigos em admin/.next/dev. Servidor Admin parado;
limpeza desse cache foi bloqueada pela politica do executor mesmo apos permissao
de escrita especifica concedida. Solicitada exclusao manual apenas da subpasta
gerada dev. Aguardar limpeza e repetir o build completo antes de commit/push.

## Validacao final

Sem apagar o cache bloqueado, copiados codigo/configuracao/public/scripts do Admin
para outputs/release-0609-admin-clean, sem .next nem envs locais, reutilizando
somente node_modules por junction. Build completo 0.1.609 aprovado (exit 0),
incluindo protecao de source maps e sincronizacao de 34 manifests de rotas.
Comparacao binaria confirmou 429 arquivos de src/scripts/public identicos ao
checkout, alem de package/config/lockfile. Sem mudanca no build ou relaxamento de
checagens. Avisos de snapshot do cache webpack nao bloqueantes.

Check global aprovado pelo usuario e build limpo concluido liberam o release.
Autodeploys Vercel homolog continuam desativados nos dois arquivos de configuracao;
nenhum arquivo do trigger de deploy Cloudflare foi alterado. Mantida a confirmacao
do usuario de Backend/Video desligados para autodeploy nos dois ambientes.
