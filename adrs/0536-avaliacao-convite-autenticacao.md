# ADR-0536 - Avaliacao com convite contextual de autenticacao

## Status
Aceito em 2026-09-28.

## Contexto
O link direto de nova avaliacao enviava visitantes ao login sem explicar o motivo.
A referencia aprovada e a area restrita existente em Favoritos, enviada pelo usuario.
Builder nao foi utilizado; reutilizamos o componente e os tokens atuais, mobile-first.

## Decisao
Permitir o shell de /app/avaliacoes/nova sem sessao no proxy, mantendo o formulario
protegido pelo PrivateTemplate e as autorizacoes da API inalteradas. Mostrar o
convite Avalie seu psicologo, criar conta, fazer login e voltar ao perfil selecionado.
Nao consultar elegibilidade sem presenca de sessao. Preservar psychologist_id/id
na URL de retorno apos login/cadastro usando o fluxo compartilhado ja existente.
O alias legado /app/reviews/new continua redirecionando para a rota canonica.

## Aceite
- [x] Visitante visualiza explicacao, cadastro e login em vez de redirecionamento automatico.
- [x] Link Voltar ao perfil usa o profissional selecionado.
- [x] Login/cadastro preservam o destino da avaliacao.
- [x] Formulario e envio continuam autenticados; leitura publica permanece inalterada.

## Validacao
Regressoes em auth-redirect.test.mjs e verificacao local do fluxo anonimo.
