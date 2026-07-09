# TASK-55: Detalhe administrativo do psicólogo — Geral e Perfil/Cadastro

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-55 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-54 |
| ADR alvo | ADR sobre exposição administrativa de dados sensíveis do psicólogo |

## Contexto

As abas "Geral" e "Perfil e cadastro" do detalhe do psicólogo usam como referências:

- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`.

Nesta V1, o Admin visualiza dados administrativos e públicos do profissional. Edição de perfil pelo Admin fica fora desta task, salvo ação mínima já existente e segura.

## Objetivo

Criar o shell de detalhe do psicólogo e as abas Geral e Perfil/Cadastro com dados reais, mantendo cuidado LGPD com CPF, endereço, telefone e dados profissionais.

## Pré-requisitos e bloqueios

- TASK-54 concluída com navegação para detalhe.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Definir em ADR como dados sensíveis serão exibidos para admin.

## Escopo frontend

- Criar rota protegida:
  - `/psychologists/[id]` ou equivalente.
- Criar cabeçalho reutilizável do detalhe:
  - avatar;
  - nome;
  - CRP;
  - status;
  - plano;
  - avaliação;
  - último acesso quando houver fonte real;
  - link "Ver perfil público".
- Criar tabs:
  - Geral;
  - Perfil e cadastro;
  - Plano e pagamentos;
  - Estatísticas;
  - Publicações;
  - Avaliações;
  - Atividades;
  - Denúncias.
- Implementar nesta task apenas:
  - aba Geral;
  - aba Perfil e cadastro.
- O botão "Editar psicólogo" deve ficar fora da V1 ou desabilitado com rota futura, sem falsa ação.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists/:id`
- Retornar dados reais de:
  - `user`;
  - `psychologist_profile`;
  - catálogos de especialidades/serviços/abordagens;
  - assinatura atual resumida;
  - métricas principais;
  - histórico resumido derivado de eventos reais;
  - integrações/status reais.

## Fora do escopo

- Editar perfil do psicólogo.
- Criar ou resetar senha.
- Aprovar/reprovar CRP manualmente.
- Criar psicólogo.
- Moderar avaliações.
- Alterar assinatura.

## Contrato técnico detalhado

- Dados sensíveis devem ser retornados apenas por rota admin autenticada.
- Não expor senha, tokens, hashes, dados de pagamento sensíveis, CPF completo em logs ou frontend público.
- Onde houver "Stripe" na imagem, substituir por **Mercado Pago** no produto real.
- Histórico da conta deve ser derivado de eventos existentes e não prometer auditoria completa.

## Critérios de aceite

- [ ] Detalhe só abre para admin autenticado.
- [ ] Header e tabs são reutilizáveis pelas tasks seguintes.
- [ ] Aba Geral usa dados reais.
- [ ] Aba Perfil e cadastro usa dados reais.
- [ ] Dados sensíveis têm tratamento documentado em ADR.
- [ ] "Stripe" não aparece; usar Mercado Pago quando aplicável.
- [ ] Botões de edição que não funcionam não aparecem/habilitam.
- [ ] UI mobile-first validada.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Imagens de referência foram citadas.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e psicólogo real.
