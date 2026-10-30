# TASK-293 - Controles e comentarios nos reels

Status: publicada em 0.1.753 pelo PR #146, merge a1172c2, em 30/10/2026.

## Referencias e escopo

Previa reels-controls-preview v4 aprovada pelo usuario. PROTO-INVENTORY e
ARCHITECTURE consultados; Builder indisponivel. Mobile-first em 320/390px,
com verificacao desktop. Preservar gradiente de contexto e regras de midia.
Inclui a padronizacao de Seguir/Favoritar ja validada localmente em 0.1.752.

## Aceite

- [x] Chevron de voltar, contexto centralizado e + branco maior.
- [x] + reutiliza CreateCommunityPostLogic e seus controles de descarte.
- [x] Composer real de comentarios com midia a esquerda conforme permissoes.
- [x] Campo escuro translucido; enviar escuro desabilitado e azul habilitado.
- [x] Subtitulo proximo ao nome e espacamento lateral alinhado ao diretorio.
- [x] Experiencia opcional respeita a configuracao efetiva do profissional.
- [x] Revisao independente sem achados pendentes e QA com API/banco local reais.
- [x] Checks completos e build final do lote.
- [x] Promocao revisada homolog para main e smoke dos deployments.

## Seguranca e publicacao

ADR-0658. Sem migration, pacote ou variavel nova. Contrato aditivo opcional.
Backend primeiro, frontend depois; nao publicar Admin ou Video.
Autodeploys desligados confirmados pelo usuario. Producao inicial saudavel:
frontend 0.1.751, backend 0.1.748, health/ready 200.
Nao usar as previas HTML como produto ou inserir dados permanentes de teste.
Rollback por restauracao dos deployments anteriores; sem reversao de dados.

## Evidencias locais

QA Chromium em 320/390/1440px: 11 cenarios aprovados, sem erros de pagina
ou falhas de API. Envio real de comentario com alvo no video, contagem na
folha, foco/caret, protecao de rascunho, midia profissional e experiencia
oculta conferidos. Criacao real de post pelo modal existente, cancelamento,
confirmacao de descarte e retorno da rolagem apos sucesso conferidos.
Banco isolado 127.0.0.1:55432, API propria 3003 e frontend 3102, sem efeitos
externos. Fixtures removidas por IDs exatos: zero usuarios/comunidades/posts/
respostas de teste restantes. Evidencias .tmp/task293-browser-results.json
e .tmp/task293-qa-status.json; arquivos de QA nao integram o produto.

O teste de rolagem em 390px foi repetido apos expandir o conteudo recolhido:
documento 1348px, viewport 844px, scrollY 504, overflow visivel e viewer
desmontado. Falha inicial era a precondicao do teste, nao bloqueio de scroll.
Fonte externa bloqueada no QA isolado; fallback usado. Nao validado em
iPhone/Safari fisico. Revisao adicional em Chrome confirmou foco/Escape no
aviso de midia e descarte no top layer do dialog nativo.

Gates da raiz e checks das quatro aplicacoes aprovados. O comando agregado
parou na configuracao local ausente do backend; seu check foi repetido com
DATABASE_URL inerte e JWT_SECRET_KEY exclusivo de teste: 1116 testes, zero
falhas ou skips. Frontend e backend tiveram builds finais aprovados no Node
24.22.1. Build frontend isolado com um worker e cache desabilitado: 845
arquivos fonte comparados, nenhuma diferenca em relacao ao checkout.
Admin e Video sem mudancas funcionais; Video conserva 13 skips de integracao.
Logs de validacao em .tmp/task293-*-check*.log e .tmp/task293-*-build*.log.
Sem migration, efeitos externos ou alteracao de configuracao produtiva.

Deploys manuais feitos pelo usuario: frontend/backend retornam 0.1.753 e
health/ready HTTP 200 no smoke de 30/10/2026 16:38 UTC. Capturas do usuario
mostram controles e composer em iPhone. Sem escritas de teste em producao;
QA autenticado permanece restrito ao ambiente local. Refinamentos visuais
posteriores de foco e espacamento acompanhados separadamente na TASK-294.
