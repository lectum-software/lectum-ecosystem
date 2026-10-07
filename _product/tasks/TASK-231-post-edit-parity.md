# TASK-231 - Edicao de post alinhada a criacao

## Objetivo e referencias

Pedido de 07/10/2026: mesma apresentacao da criacao, com Editar Post e Salvar,
upload de novas midias preservado e miniatura dos anexos existentes. Referencias:
screenshots WhatsApp de 06/10 20:00:34 e 07/10 10:25:52, criacao real atual,
PROTO-INVENTORY, ARCHITECTURE e PACKAGES. Builder indisponivel nesta sessao.
ADR-0571. Escopo frontend, mobile-first (390px), sem escrita em producao.

## Aceite

- [x] Controllers contenteditable da criacao, labels acessiveis e visualmente ocultos.
- [x] Botao de camera circular, upload multiplo e permissoes existentes preservados.
- [x] Miniatura persistida de video; Stream resolve playback em vez de usar JSON como video.
- [x] Dialog nativo acima do compositor de comentarios, com fundo inerte e scroll lock.
- [x] Scroll interno, footer no fluxo e ajuste de teclado compartilhado com a criacao.
- [x] Comunidade e anonimato continuam imutaveis; editar texto nao modifica os anexos.
- [x] Check frontend completo e testes focados aprovados.
- [x] Validacao visual e de interacao no navegador.
- [x] Build frontend completo.
- [ ] Conferencia autenticada do usuario no PWA fisico e salvamento local.

## Operacao

Validacao inicial interrompida por disco cheio. Frontend local foi parado e usuario
limpou caches regeneraveis; aproximadamente 4,8 GB disponiveis na retomada.
Nao foram apagados bancos, fontes, uploads ou arquivos pessoais pelo agente.
Sem novas dependencias/migrations. Flag opcional LECTUM_LOW_DISK_MODE=1 desliga
cache Webpack apenas em next dev --webpack; padrao e builds de producao intactos.
Rollback: reverter os componentes desta task e remover a flag local.
Sem push/deploy; a aprovacao local precede qualquer promocao.

## Evidencias

Check frontend completo aprovado. Build 0.1.603 concluido, incluindo TypeScript,
90 paginas e verificacao de ausencia de source maps publicados. Webpack emitiu
avisos de cache de dependencias sem impedir o build.

Harness isolado com componentes reais, RHF e CSS da aplicacao (fora das rotas):
Playwright/Chrome em 320, 390 e 1440px. Texto longo editavel, miniatura Stream via
cache de teste, geometria do footer, comentarios de fundo inertes, remocao de
anexo, Tab, Escape e reabertura passaram sem pageerror. Capturas inspecionadas em
outputs/edit-post-*.png. Fixtures nao entram no produto; nenhum request de escrita
foi enviado. O submit do harness testa o evento de formulario, nao persistencia.

Check raiz: versao, segredos, UTF-8, tasks, ADRs, source-safety e env aprovados;
limites preexistentes de community-post-card.tsx (724 linhas) e
community-post-controls.test.mjs (916) bloqueiam a sequencia restante.

Build validado separadamente: a politica de producao bloqueia APIs localhost,
portanto next start nao e usado como runtime local nem essa protecao foi relaxada.
Frontend local usa next dev --webpack com LECTUM_LOW_DISK_MODE=1 para evitar o
cache persistente do compilador. Artefatos e outros caches ainda ocupam disco.
API local mantida sem reiniciar a sessao nem trocar banco.
Feed confirmado no navegador apos a retomada; cerca de 4,9 GiB livres.
Flag de cache validada em quatro combinacoes de dev/valor, preservando producao;
Biome e TypeScript revalidados apos a configuracao opcional.
