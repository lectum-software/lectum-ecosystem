# ADR-0737 - Restaurar convite de avaliacoes nas telas atuais

Data: 2026-11-26
Status: Aceita

As telas atuais de depoimentos substituem os componentes legados de avaliacoes.
O perfil ja fornece showOwnReviewsLink com autenticacao e autoria, mas a tela
atual nao consumia essa propriedade. Minhas Avaliacoes tambem nao montava o convite.

Restauramos o componente OwnReviewsLink nas duas superficies. Ele reutiliza o
cartao original e consulta o acesso no backend, bloqueando copia em erro ou
sem permissao. A rota de destino permanece a mesma e valida login/eligibilidade.
Nao restauramos regras antigas de contato, medias, ranking ou alteramos permissoes.

A consulta pequena de acesso do componente e mantida separada da lista paginada,
preservando o comportamento original e evitando modificar contratos nesta tarefa.
Nenhum convite aparece no perfil de outro profissional, por padrao em modais,
ou na lista de avaliacoes do paciente. Cores e estilos do cartao permanecem iguais.
