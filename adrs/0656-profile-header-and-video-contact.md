# ADR-0656 - Header compacto e CTA integral nos videos

Date: 2026-10-30
Status: Accepted
Task: TASK-291

## Contexto

O usuario aprovou uma previa local do perfil inspirada no header YouTube,
abas Substack e CTA de anuncios Instagram. Os contratos de contato, permissao,
assinatura e depoimentos continuam os existentes.

## Decisao

Mover o contato principal do rodape para o header e usar sua visibilidade real
como limite para o header compacto. Preservar o contexto de origem do contato
e o fluxo autenticado de WhatsApp. O estado de favorito selecionado tem apenas
coracao, com nome acessivel; o estado inicial preserva + Favoritar.

Separar altura visual da aba (32px) de seu alvo de toque (44px), com raio 12px,
padding horizontal 10px e fonte 13px. Contadores das abas usam o mesmo estilo;
o destaque de quantidade dentro da secao Depoimentos permanece.

Reutilizar o temporizador de reproducao visivel do CTA, sem contar pausas,
seeks, buffering ou pagina oculta. Substituir a expansao da pilula por faixa
integral, preenchida da esquerda para direita em 900ms apos 3s assistidos.
Usar --lectum-whatsapp-contact e manter icone/texto antes/depois da animacao.
Movimento reduzido elimina a transicao, sem atrasar a disponibilidade da acao.

## Consequencias

Sem nova dependencia, schema ou env. Testar mudanca de abas, nome longo,
favorito, header fixo, telas estreitas, video pausado e retorno ao video.
Somente frontend nesta task; lote de depoimentos exige backend primeiro.
Nao alterar botoes circulares de acao dos reels nem o verde compartilhado.
