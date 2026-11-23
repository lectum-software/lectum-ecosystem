# TASK-348 - Comentario sobreposto e perfil sem efeito na capa

Status: implementacao local; publicacao depende de aprovacao visual.

- [x] Preservar dimensoes do video durante abertura e fechamento do teclado.
- [x] Restaurar compositor escuro Lectum com camera e envio na mesma linha.
- [x] Remover sobreposicao da capa e aumentar avatar de 76 para 88 pixels.
- [x] Validar componentes, tipos e previa fiel em navegador.
- [ ] Obter aprovacao antes de qualquer push ou deploy.

Escopo somente frontend. Sem alteracoes de API, banco, consentimento ou Meta.
Referencia: imagens enviadas em 23/11/2026. Ver ADR-0713.
Chrome permite verificar geometria com viewport reduzida, mas nao substitui
o teclado nativo do iPhone. Previa deve declarar essa limitacao.

Validacao: 142 testes de reels e 21 de perfil aprovados sem skips; typecheck
e build frontend aprovados. Captura local do perfil publico real e reel real,
com transporte somente leitura para a API e bloqueio de POST/PUT/DELETE.
No Chrome390, o video manteve x=0,y=0,width=390,height=780 antes/depois do foco
e visualViewport de460px. O compositor terminou em y=460, sobre o video.
Previa local em .tmp/previa-perfil-88.png e .tmp/previa-reels-comentario.png.
