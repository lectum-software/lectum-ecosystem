# TASK-292 - Refinamento visual do perfil

Status: implementacao e validacao local concluidas. Sem autorizacao de publicacao deste ajuste.

## Referencias e escopo

Screenshots do usuario em 30/10/2026: perfil Lectum e abas YouTube.
PROTO-INVENTORY e ARCHITECTURE consultados; Builder indisponivel.
Mobile-first, base 390px, com verificacao em 320px e desktop.
Reutilizar header da comunidade e RelationshipButton do feed.
Sem mudancas de API, dados, notificacoes ou regras dos depoimentos.

## Aceite

- [x] Header com quinas inferiores de 28px e sombra da comunidade.
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
