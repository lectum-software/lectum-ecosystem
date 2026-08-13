# ADR-0455: Autopreenchimento de endereço por CEP na assinatura

## Status

Accepted

## Task relacionada

Ajuste solicitado em 2026-08-13 para a etapa de endereço da assinatura profissional.

## Contexto

Na etapa de endereço após pagamento do Plano Profissional, o psicólogo informa um endereço
profissional usado também para salvar Cidade e Estado no perfil público e nos filtros de
localidade. O preenchimento manual de logradouro, bairro, cidade e UF após digitar o CEP gera
fricção, especialmente em dispositivos móveis.

## Decisão

Usar o webservice público ViaCEP diretamente no frontend como consulta opcional de conveniência
quando o CEP tiver 8 dígitos. O retorno, quando encontrado, preenche os campos compatíveis do
formulário (`logradouro`, `complemento`, `bairro`, `cidade` e `UF`). Caso o CEP não seja encontrado
ou a consulta falhe, nenhuma mensagem é exibida e todos os campos permanecem editáveis.

Atualização de 2026-08-13: os campos de UF e cidade na etapa de endereço de faturamento reutilizam
a mesma base de estados/cidades da edição do perfil profissional. O usuário escolhe primeiro o
estado e depois a cidade em dropdown filtrável; quando o CEP retorna cidade/UF, a UF é preenchida
antes da cidade para manter a dependência entre os campos. Se o estado for alterado manualmente, uma
cidade incompatível é limpa.

O frontend libera `https://viacep.com.br` no `connect-src` da CSP para permitir a consulta no
navegador. A requisição usa `credentials: "omit"`, `referrerPolicy: "no-referrer"` e não registra o
CEP em logs.

## Consequências

- Reduz digitação manual no fluxo de assinatura em mobile.
- Mantém o fluxo resiliente: falhas do ViaCEP não bloqueiam a etapa nem exibem erro técnico.
- Evita divergência entre localidade do faturamento e localidade do perfil ao usar a mesma lista de
  UF/cidade já adotada no perfil profissional.
- Introduz dependência externa pública sem variável de ambiente e sem pacote novo.
- O CEP digitado é consultado no provider externo; a consulta não envia credenciais da Lectum e não
  salva dados antes do submit do formulário.

## Produção e rollout

- Compatibilidade com dados existentes: sem alteração de banco; os mesmos campos do endereço
  continuam sendo enviados ao backend.
- Migrations: nenhuma.
- Envs novas: nenhuma.
- Compatibilidade entre versões: frontend novo funciona com backend atual; backend não depende do
  ViaCEP.
- Ordem de deploy: somente frontend precisa da mudança funcional, mas os manifests seguem
  versionamento sincronizado do monorepo.
- Rollback: reverter o commit remove a consulta externa e a liberação CSP, mantendo preenchimento
  manual.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Atualização de 2026-08-13: validação de fonte confirmou Estado antes de Cidade, cidade
  dependente de `state`, uso de `CITY_OPTIONS_BY_STATE` e seta após o texto do botão.
- Atualização de 2026-08-13: smoke local com `next start -p 3211` confirmou a rota PT-BR de
  endereço protegida por login e o alias legado redirecionando para a rota PT-BR.
- Smoke de homologação após push.

## Pendências

- Se houver requisito futuro de não expor CEP consultado ao provider a partir do navegador, criar
  uma rota backend com política de privacidade/cache apropriada.
