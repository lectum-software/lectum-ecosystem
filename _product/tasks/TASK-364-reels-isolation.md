# TASK-364 - Isolamento e primeira capa do Reels

Escopo: corrigir fundo exposto no teclado iOS, isolar feed e priorizar capa ativa.
Referencia visual: captura de iPhone enviada pelo usuario em 24/11/2026.
Builder indisponivel nesta sessao; manter layout existente e azul aprovado.

- [x] Usar dialogo nativo e backdrop opaco no Reels.
- [x] Priorizar somente capas ativas, mantendo vizinhas lazy.
- [x] Verificar avatar responsivo ja otimizado na TASK-360.
- [x] Preservar Favoritar original: usuario rejeitou fundo preto e ampliacao na previa.
- [x] Validar checks, build e navegador local sem mutacoes.
- [ ] Confirmar teclado em iPhone fisico com o usuario.

Validacao local: Chrome e WebKit, 390px e 1440px, dados reais via proxy somente leitura.
Feed sem foco sob o dialogo; comentarios aninhados fecham por botao e Escape sem
fechar Reels. Retorno de foco aguarda sincronizacao sem roubar foco de outro campo.
Viewport simulada em 450px com deslocamento de 40px preserva quadro de 844px e
compositor elevado em 394px. Sem erros JavaScript ou envio de formularios.
25 testes direcionados e guards de ADRs, tasks, fonte, tamanho, encoding, segredos
e versao passaram. Azul original preservado; nenhuma promessa de nota PageSpeed.
Frontend check e build de producao passaram. Teste visual SSR repetido apos o build:
10/10, incluindo viewport mobile/desktop. Versao local 0.1.867.

Sem push/deploy. Nao prometer nota PageSpeed nem equivalencia entre emulacao e iOS real.

Revisao visual: removido somente o override do Favoritar; tamanho, espacamento,
fundo e sombra voltam ao estilo anterior. Isolamento e prioridade de capa preservados.
Revisao 0.1.868: 25 testes direcionados e build de producao aprovados.
