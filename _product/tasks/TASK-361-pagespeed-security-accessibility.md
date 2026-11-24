# TASK-361 - CSP, descoberta e acessibilidade

Status: Concluida localmente.

## Escopo

Investigar os alertas PageSpeed de CSP e llms.txt, preservando a politica de
seguranca. Revisar teclado/foco nos controles publicos, mobile-first (390px).
Sem redesign. Capturas do usuario e interface existente sao a referencia.

## Aceite

- [x] Eliminar a tentativa de avaliacao dinamica do Zod sem permitir unsafe-eval.
- [x] llms.txt com links Markdown publicos, sem alterar politica de crawlers.
- [x] Revisao pratica de teclado/foco documentada com limites explicitos.
- [x] Testes e build locais aprovados.

## Evidencias locais

Check frontend completo e build production aprovados. Dez testes focados passaram,
incluindo validacao real Zod sem Function e resposta real do route handler llms.txt.
Cinco destinos publicos responderam HTTP 200. Header local continua sem unsafe-eval.

Chrome isolado em 390px e 1440px, API real somente leitura com adaptacao de CORS
no harness; nenhuma escrita remota permitida. Browser integrado indisponivel;
uso do Chrome autorizado pelo usuario. Sequencia e resultados:

1. Home: aviso de privacidade com foco inicial visivel; Tab chega a Preferencias.
2. Preferencias: Enter abre, Tab nao acessa controles do fundo, Escape fecha e
   retorna ao aviso de decisao apos o intervalo existente do coordenador de prompts.
3. Post publico: 24 passos de Tab sem aprisionamento; botoes com nomes; Enter
   alterna o estado das legendas. Sem overflow horizontal nos dois tamanhos.
4. Menu do post: Enter abre, Escape fecha e mantem foco no acionador.

Nenhuma violacao CSP nas paginas locais verificadas. O primeiro build foi
descartado para browser QA por incorporar api.invalid do ambiente local;
o build final usa explicitamente API e site publicos corretos.

Capturas inspecionadas: out/seo-post-preview/a11y-{390,1440}-01-home.png,
02-preferences.png, 03-post.png e 04-menu.png (mesmo prefixo). Harness local:
out/seo-post-preview/accessibility-smoke.cjs. Logs check/build na mesma pasta.
Nao foi necessario modificar a UI para os comportamentos testados.

Limites: sem NVDA/VoiceOver, aparelho fisico, fluxo autenticado, avaliacao completa
de contraste ou todas as rotas. Zoom havia sido liberado e verificado na TASK-360;
pinça fisica nao testada. Nenhuma nova nota PageSpeed afirmada antes de publicar.

## Publicacao

Somente local; sem push/deploy, banco, pacote ou variavel nova.
Rollback: reverter inicializacao CSP-compatible e links do llms.txt.
ADR-0725. Nao constitui certificacao WCAG nem auditoria completa de seguranca.
