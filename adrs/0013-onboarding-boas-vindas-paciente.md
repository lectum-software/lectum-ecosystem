# ADR-0013: Onboarding de boas-vindas do paciente

## Status

Accepted

## Task relacionada

TASK-08: Boas-vindas do paciente.

## Contexto

A TASK-08 precisava iniciar a jornada privada do paciente apos cadastro e confirmacao de
e-mail. A verdade do progresso deve ser o `patient_profile` criado na TASK-07, porque o
onboarding nao pode depender de localStorage/redux nem repetir em outro dispositivo.

As referencias visuais foram consultadas pelas imagens locais:

- `_product/proto/Boas-vindas Paciente - 1.jpg`;
- `_product/proto/Boas-vindas Paciente - 2.jpg`;
- `_product/proto/Boas-vindas Paciente - 3.jpg`.
- asset solicitado pelo usuário:
  `frontend/public/images/patient-welcome-hug.svg`.

Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao as
imagens locais foram usadas como fallback auditavel.

## Decisao

- Criar os endpoints privados reais:
  - `GET /api/private/patient/profile` para retornar ou garantir o `patient_profile` de
    `req.auth.id`;
  - `PUT /api/private/patient/onboarding` para persistir `gender`, `goal`, campos
    opcionais legados (`birthdate`, `phone`) e setar `onboarding_completed_at`.
- Permitir que o onboarding atualize `user.name` quando a etapa de identificação coletar
  nome, mantendo o nome canônico do usuário fora de `patient_profile`.
- Adicionar `patient_profile.gender` como `String?`, com os valores aceitos
  `"feminino" | "masculino" | "nao_binario" | "prefiro_nao_dizer"`.
- Implementar `requireRole("paciente")` agora, antes da TASK-12, porque a TASK-08 ja
  introduz o namespace `/api/private/patient/*` e o guard fail-closed e criterio de
  aceite obrigatorio. O guard fica aplicado no mount de `write.ts`, depois do `_auth`.
- Manter redundancia no service: mesmo com guard no mount, os services recusam
  `req.auth.role !== "paciente"` com `403`.
- Nao criar modelo Prisma novo. O onboarding usa somente `patient_profile`.
- O `PUT` e idempotente: se `onboarding_completed_at` ja existe, retorna o estado atual
  sem erro e sem sobrescrever campos.
- Implementar `/patient/welcome` no frontend, com fluxo mobile-first em 3 etapas
  alinhadas aos prototipos: acolhimento, identificação e objetivo.
- Usar a fundacao da TASK-02 para o campo de nome (`input`) e controles por React Hook
  Form/Zod para genero e objetivo.
- Atualizar o redirecionamento de usuario paciente para `/patient/welcome`; a rota
  consulta o backend e pula para `/dashboard` quando o onboarding ja esta concluido.
- Remover o cabecalho privado do onboarding a pedido do usuario, mantendo a tela
  focada/mobile-first e sem reintroduzir shell paralelo.
- Remover os botoes "Voltar" da etapa 2 e "Finalizar boas-vindas"/"Voltar" da etapa 3
  a pedido do usuario. Como a etapa 3 nao deve exibir CTA final, a selecao de um
  objetivo passa a concluir o onboarding imediatamente pelo mesmo endpoint real.

## Consequencias

- Pacientes sem onboarding concluido passam pelo fluxo depois de confirmar e-mail ou
  fazer login.
- Pacientes com `onboarding_completed_at` preenchido nao repetem o fluxo em outro
  dispositivo.
- O onboarding deixa de pedir data de nascimento e telefone na interface atual, mas o
  backend preserva esses campos opcionais legados para compatibilidade.
- `gender` passa a ser persistido no perfil do paciente para orientar tratamento futuro
  pelos profissionais.
- A etapa de objetivo passa a ter comportamento de acao direta: clicar em um objetivo
  seleciona e conclui o fluxo, evitando estado sem saida apos a remocao dos botoes.
- Rotas de paciente passam a ter uma primeira implementacao de `requireRole`, que deve
  ser reutilizada e auditada na TASK-12 para os demais namespaces privados.
- A Home privada real do paciente ainda e futura; apos concluir, o destino temporario e
  `/dashboard`, usando o shell minimo existente.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir backend db:migrate`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `http://localhost:3000/patient/welcome` validando:
  - remocao do cabecalho e das copias auxiliares de etapa/progresso;
  - uso do asset `patient-welcome-hug.svg` na primeira etapa;
  - segunda etapa com nome e genero, sem data de nascimento/telefone;
  - segunda etapa sem botao "Voltar";
  - terceira etapa sem "Escolha do objetivo"/"Seu objetivo fica salvo";
  - terceira etapa sem botoes "Finalizar boas-vindas" e "Voltar";
  - conclusao automatica ao selecionar um objetivo;
  - carregamento do profile real;
  - fluxo completo ate `PUT /api/private/patient/onboarding`;
  - persistencia de `gender`, `goal` e `onboarding_completed_at` no banco;
  - atualizacao de `user.name`;
  - reentrada com onboarding ja concluido pulando para `/dashboard`.

## Pendencias

- Substituir o shell minimo pelo shell privado mobile da TASK-12 quando ele existir.
- Redirecionar para a Home/busca/comunidade real quando as tasks privadas do paciente
  forem implementadas.
