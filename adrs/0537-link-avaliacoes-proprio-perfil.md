# ADR-0537 - Link de avaliacoes no proprio perfil

## Status
Aceito em 2026-09-28.

## Contexto
O psicologo precisa acessar o mesmo bloco de compartilhamento do painel na aba de
avaliacoes do proprio perfil, sem alteracoes de texto e com a restricao do plano gratuito.

## Decisao
- Extrair ReviewsLinkCard e PremiumReviewsState para componentes compartilhados.
- Renderizar o bloco antes do resumo somente para o dono psicologo autenticado.
- Consultar o contrato existente de acesso a avaliacoes somente quando esse bloco monta.
- Manter o link desfocado e a copia desabilitada durante carregamento, erro ou sem
  permissao explicita full/can_receive_reviews; plano gratuito recebe o convite existente.
- Visitantes continuam vendo a aba publica sem ferramentas do proprietario.
- Desfoque e bloqueio de copia sao apresentacao, nao autorizacao: o backend continua
  responsavel pela elegibilidade para registrar avaliacoes.

## Consequencias
Textos, layout e feedback de copia sao identicos ao painel, sem duplicacao.
Sem backend, banco, env ou dependencia nova. Referencias: imagens enviadas pelo usuario
e inventario local; Builder/Quick Copy nao disponivel nesta execucao.
Publicacao primeiro em homolog; rollback por reversao revisada.
