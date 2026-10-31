# TASK-299 - Identificacao profissional e depoimentos do paciente

## Escopo

Igualar o nome do psicologo na identificacao principal da modal de escrever/editar
ao peso do feed: font-black (900), mantendo Manrope, tamanho e entrelinha.
Nao alterar cargo/data, identidade compacta da resposta, nome dos autores,
elegibilidade ou regras de envio. Referencias: feed existente e captura
WhatsApp Image 2026-10-31 at 14.59.09.jpeg. PROTO-INVENTORY consultado na TASK-298;
Builder indisponivel. Frontend apenas; sem dependencias, banco ou configuracao.

Complemento solicitado pelo usuario: conferir Meus Depoimentos do paciente no
mesmo layout de reviews da TASK-298. Reutilizar TestimonialCard, preservar contexto
do destinatario e resposta cinza recuada, padronizar o vazio com EmptyState e
alinhar editar/excluir na lateral. Incluir a pagina real na previa de componentes,
com dados sinteticos apenas no harness local, em 320/390/1440 (mobile-first).
Remover o aviso de nome/foto do formulario, conforme pedido posterior, sem
alterar a identificacao publica do depoimento ou o contrato de autoria.

## Aceite

- [x] Nome principal em font-black, igual ao feed.
- [x] Cargo/data e resposta compacta preservados.
- [x] Tela do paciente com reviews, contexto, acoes laterais e vazio compartilhado.
- [x] Testes, check/build e QA em 320/390/1440 aprovados.
- [x] Previa local atualizada; sem push/deploy.

Validacao: frontend check e build isolado completos; 24 cenarios locais de
componentes no Chrome (oito telas em tres larguras), incluindo editar/cancelar,
modal, ausencia do aviso de autoria e peso computado 900 na identificacao.
Evidencias ignoradas em .tmp/task299-*.log e .tmp/task298-*-390.png.

## Decisao

Complementa ADR-0662. O usuario confirmou em 31/10/2026 que deseja o mesmo peso
visual do feed, apos comparar o semibold (600) usado anteriormente.
