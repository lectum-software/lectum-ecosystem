# TASK-292 - Refinamento visual do perfil

Status: publicacao autorizada em 30/10/2026; integracao e validacao final concluidas, aguardando promocao.

## Referencias e escopo

Screenshots do usuario em 30/10/2026: perfil Lectum e abas YouTube.
PROTO-INVENTORY e ARCHITECTURE consultados; Builder indisponivel.
Mobile-first, base 390px, com verificacao em 320px e desktop.
Reutilizar header da comunidade e RelationshipButton do feed.
Sem mudancas de API, dados, notificacoes ou regras dos depoimentos.

## Aceite

- [x] Header com quinas inferiores de 28px; sombra removida no refinamento solicitado.
- [x] Favoritar com tipografia compacta do feed, coracao sem texto quando marcado.
- [x] Texto do CTA sem recorte e altura externa preservada em 44px.
- [x] Header fixo proporcional: nome 15px, icone 18px e verde visual de 34px.
- [x] Chevron de voltar com alvo de 44px e handler de navegacao existente.
- [x] Tres abas centralizadas, contadores iguais e indicador ativo fino.
- [x] Testes focados, checks, build e QA local com dados temporarios removidos.

## Decisao

ADR-0657. Preservar o reset global de fontes; estilizar spans do contato/abas
e reutilizar a tipografia explicita do RelationshipButton, sem ampliar escopo.
Manter limite de aparicao do header fixo baseado no CTA principal.

## Evidencias locais

Frontend check completo aprovado: Biome, lint, TypeScript e suites.
Gates raiz de versao, segredos, encoding, ADRs, tasks, env, tamanho,
seguranca de fontes e ciclos aprovados. Revisao independente sem achados.
QA com API real e banco local isolado em 320/390/1440px: fonte computada
do favorito 11px/600, CTA com 44px e caixa do texto 26px, header arredondado,
tres abas de largura igual, nome longo e transicao do header no scroll.
Acao de favorito persistida e estado selecionado sem texto. Handler do
chevron e encaminhamento pelo header cobertos por testes de componente.
Fixtures removidas: zero usuarios/depoimentos temporarios restantes.
Capturas em .tmp/task292-profile-* e .tmp/task292-sticky-390.png.
Build frontend 0.1.749 aprovado com um worker e cache desabilitado.
837 fontes da copia de build conferidas por hash, sem diferencas.
Validacao em Chromium; nao foi executada em iPhone/Safari fisico.

## Publicacao

Somente commit local em homolog; nenhum push ou deploy nesta rodada.
Sem variavel nova, migration, pacote novo ou alteracao em Admin/Video.

## Refinamento posterior

Usuario pediu remover a sombra na quina. Mantido raio 28px e removida
somente a sombra do hero. Perfil local indicado nao possui whatsapp_url;
por isso nao apresenta CTA ou header fixo, conforme regra existente.
Nao cadastrar numero ficticio, modificar o banco ou liberar contato indisponivel.
Complemento validado em 0.1.750: frontend check completo, gates raiz e build
aprovados. Browser local em 390/1440px confirmou raio de 28px sem sombra
visivel e header fixo oculto no perfil sem contato. Fontes da copia de build
conferidas por hash (837 arquivos, zero diferencas). Sem push/deploy.

## Cor de favorito

Reutilizar FavoriteHeart ativo no perfil, com token vermelho text-favorite
ja usado na confirmacao do feed. Estado inicial segue + Favoritar azul.
Nao alterar o desaparecimento da confirmacao no feed nem o toggle do perfil.
Complemento de favorito validado: frontend check, gates raiz e build aprovados.

## Integracao da previa aprovada

Integrar em 0.1.751 o selo verificado fora do nome truncado no header fixo,
aproximar nome e chevron preservando alvo de 44px e usar fundo primary-soft
nos dois contadores de abas. Preservar todos os blocos abaixo do menu.
Usuario confirmou novamente autodeploys desligados em 30/10/2026.
Somente frontend requer deploy; sem migration, variavel ou contrato novo.

Validacao final 0.1.751: frontend check completo, testes focados apos ajuste
de fonte em 320px, Biome, gates raiz e build aprovados. Browser Chromium
320/390/1440px usando SSR real dos componentes e CSS/fontes do build:
coracao vermelho, contadores legiveis, selo preservado com nome longo,
alvo de voltar 44px, contato e header condicionado a rolagem conferidos.
Previa somente leitura nao dispara HTTP, contatos ou mutacoes. CSS sem
overrides exclusivos de demonstracao no header/menu. Conteudo inferior
da previa continua demonstrativo e nao integra o produto.
Producao anterior 0.1.748 e health/ready 200 conferidos antes da promocao.
Rollback: restaurar o deployment anterior do frontend; nenhuma mudanca de dados.
