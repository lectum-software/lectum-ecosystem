# TASK-87: Padronizar gráficos de donut no Admin

## Objetivo

Substituir todos os gráficos de pizza visíveis do painel administrativo por gráficos de donut, alinhados ao layout de referência do dashboard de pacientes.

## Escopo

- Dashboards administrativos de pacientes, psicólogos e comunidades.
- Blocos de distribuição por cadastro, devices/sistemas, formatos de conteúdo e tração.
- Detalhes administrativos de paciente, psicólogo e comunidade onde houver distribuição radial.

## Critérios de aceite

- [x] Nenhum gráfico radial do Admin é apresentado ou anunciado como gráfico de pizza.
- [x] Os gráficos radiais usam anel com vazado central e total no centro quando há dados.
- [x] As legendas e dados reais existentes continuam sendo usados, sem mocks.
- [x] A implementação não adiciona package novo nem altera contrato de API/banco.
- [x] Validação visual considera a referência mobile-first do Admin e usa fallback local quando Builder/Quick Copy não está disponível.

## Notas de execução

- Builder/Quick Copy não estava acessível no ambiente; a referência usada foi a captura fornecida pelo usuário e os protótipos exportados em `_product/proto/admin`.
- A alteração é somente visual no app `admin/`.
