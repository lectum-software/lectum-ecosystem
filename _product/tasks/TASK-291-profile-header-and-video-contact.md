# TASK-291 - Header do perfil e contato nos videos

Status: implementacao e validacao local concluidas. Publicacao autorizada em 30/10/2026.

## Referencias e escopo

Previa aprovada: .tmp/profile-cta-preview. Referencias enviadas pelo usuario:
header YouTube, abas Substack e CTA de anuncio Instagram. PROTO-INVENTORY
consultado; Builder indisponivel. Mobile-first, base 390px, com QA em 320px
e desktop. Sem alterar regras dos depoimentos da TASK-290.

## Aceite

- [x] Bio compacta e tempo de experiencia no lugar da media de estrelas.
- [x] Beneficios cinza bold, icones originais, sem contorno e alinhados a esquerda.
- [x] Contato em pilula no header, sem CTA fixo no rodape.
- [x] Header compacto com nome e WhatsApp apenas quando o CTA principal sair acima.
- [x] Favoritar azul sem borda; estado marcado mostra somente o coracao.
- [x] Abas com fundo visual de 32px, raio de 12px e alvo de toque de 44px.
- [x] Contadores de Publicacoes e Depoimentos iguais nas abas.
- [x] CTA inferior dos videos com largura integral, icone/texto brancos e chevron.
- [x] Verde compartilhado preenche da esquerda apos 3s de reproducao visivel.
- [x] Animacao de 900ms respeita movimento reduzido e mantem acao/analytics reais.
- [x] Checks, builds, testes focados e navegacao local aprovados.

## Evidencias

Backend check completo: 1109 testes aprovados; build aprovado. Frontend Biome,
lint, TypeScript e suites aprovados, com retomada das suites finais apos atualizar
duas expectativas do layout anterior. Perfil: 30 testes; depoimentos: 17;
contato: 73 aprovados e 2 testes browser opt-in ignorados no comando padrao.
Os testes browser do CTA foram executados separadamente em 320/390/1440px.
Build frontend 0.1.748 aprovado em copia fiel dos fontes, um worker e cache
desabilitado para limitar memoria/disco. Nenhuma alteracao de seguranca no build.

QA autenticado no banco local isolado: publicar, editar, impedir duplicacao e
acesso de terceiro, resposta, ocultar/reexibir, downgrade e scroll da modal.
Perfil real validado em 320/390/1440px: beneficios, favorito, abas 44/32px,
limite de aparicao do header fixo e ausencia de overflow. Fixtures removidas:
zero usuarios e zero depoimentos temporarios restantes. Gates raiz aprovados.
Revisao independente corrigiu retorno ao formulario depois de login e incluiu
regressoes. Sem P1 pendente identificado. Evidencias em .tmp/release-0748-*,
.tmp/task290-approved-profile-* e .tmp/task290-approved-sticky-*.

## Publicacao

Lote inclui TASK-289, TASK-290 e TASK-291. Usuario confirmou novamente que
Ignored Build Step de frontend/Admin permanece Don't build anything e os
autodeploys Dokploy de Backend/Video estao desligados nos dois ambientes.
Preflight produtivo: frontend 0.1.744; backend 0.1.740, health/ready HTTP200.
Publicar Backend primeiro e frontend depois. Nao publicar Admin/Video: seus
manifests recebem somente o bump obrigatorio. Nenhuma migration.
TESTIMONIAL_INVITATIONS_ENABLED e opcional e inicia false: ativar no backend
somente depois do frontend novo publicado. Ausente/false impede novos convites,
mas nao bloqueia depoimentos ou outras notificacoes. Nao ha campanha retroativa.
Nao ativar autodeploys nem executar campanhas retroativas. Acesso automatizado
aos paineis indisponivel nesta sessao; operacao manual pode ser necessaria.

## Rollback

Reverter frontend ao artefato 0.1.744 se necessario. Backend anterior e 0.1.740;
antes de reverter conferir status de depoimentos gravados, conforme ADR-0655.
Nao restaurar/apagar dados nem remover depoimentos durante rollback de codigo.
