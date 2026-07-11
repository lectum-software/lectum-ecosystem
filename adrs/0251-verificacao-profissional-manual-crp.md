# ADR-0251: Aprovação canônica de registro profissional por `crp_status`

## Status

Aceita

## Task relacionada

TASK-66: Verificação manual de CRP e origem genérica de verificação profissional.

## Contexto

A consulta automática do registro profissional pode ficar indisponível, limitada
ou retornar erro operacional. Antes desta task, parte dos gates e selos ainda
usava `psychologist_profile.cfp_verified_at` como principal evidência de
verificação, o que bloqueava psicólogos pagantes quando a API automática não era
concluída.

A task exige separar evidência técnica da API automática da aprovação de produto,
sem usar cortesia administrativa como workaround para pagantes e sem expor nome
de fornecedor externo em UI, toasts ou contratos consumidos pelo frontend.

Referências visuais locais consultadas:

- `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`;
- `_product/proto/Verificação de CPF - Consulta CFP.jpg`.

Builder/Quick Copy não esteve disponível como ferramenta neste ambiente; a
implementação usou as imagens locais e preservou a arquitetura existente.

## Decisão

Usar `psychologist_profile.crp_status="aprovado"` como aprovação canônica do
registro profissional no produto. `psychologist_profile.cfp_verified_at` passa a
representar apenas evidência técnica de aprovação pela API automática real e não
é preenchido em aprovações manuais.

Criar endpoints Admin privados reais em
`/api/admin/private/psychologists/:id/registry-verification` para visualizar,
aprovar e rejeitar manualmente a verificação. As decisões manuais reutilizam
`professional_registry_check` sem migration nova, com:

- `provider="manual_admin"`;
- `found=true` para aprovação e `found=false` para rejeição;
- `checked_at` da decisão;
- `raw.source="manual_admin"` com admin responsável, dados conferidos,
  observação/motivo e snapshots anterior/próximo.

A aprovação manual atualiza `cpf`, `crp`, `crp_registration_date` e
`crp_status="aprovado"`, preservando `cfp_verified_at`. A rejeição atualiza
apenas `crp_status="rejeitado"` e registra auditoria, sem apagar CPF/CRP/data ou
histórico.

Os helpers de entitlement e listagens passam a tratar profissional verificado
como assinatura profissional ativa não gratuita + (`crp_status="aprovado"` ou
`cfp_verified_at` existente ou cortesia administrativa ativa). A cortesia
administrativa existente continua funcionando como equivalência operacional, mas
não é criada nem alterada pelo fluxo manual de CRP.

Nos contratos e telas de produto, origens automáticas são normalizadas para
`api_automatica` / “API automática” e decisões manuais para `manual_admin` /
“Aprovação manual”. Valores legados do fornecedor externo ficam restritos ao
adapter/auditoria técnica e não são propagados para UI ou respostas do frontend.

## Consequências

- Psicólogos pagantes aprovados manualmente recebem os mesmos acessos de
  psicólogos aprovados automaticamente, desde que mantenham plano profissional
  ativo.
- O fluxo pago após WhatsApp pode seguir para perfil quando `crp_status` está
  aprovado, mesmo com `cfp_verified_at=null`.
- Selo/verificação em busca, perfil, comunidade, favoritos, follows, avaliações
  e notificações deixa de depender exclusivamente de `cfp_verified_at`.
- A aprovação manual não cria/cancela assinatura, não toca gateway e não concede
  cortesia.
- Não foi necessário alterar Prisma schema ou migrations; `db:migrate` não se
  aplica nesta task.
- A auditoria manual fica consultável junto das tentativas automáticas, mas com
  nomenclatura genérica para suporte/Admin.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile 390px com Chrome headless em `http://127.0.0.1:3002/psicologos/lista` e `http://127.0.0.1:3002/psicologos/00000000-0000-0000-0000-000000000000`; sem sessão Admin, as rotas renderizaram a tela real de login/proteção do Admin.
- Consulta read-only ao banco local confirmou existencia de dados reais de Admin e psicologos.
- `showRegistryVerification` retornou `status=200` para um psicologo real em consulta read-only, sem mutacao.
- Mutacoes manuais de aprovacao/rejeicao nao foram executadas para nao alterar registros reais do ambiente.

## Pendências

- Validar manualmente approve/reject em um psicólogo real elegível quando houver
  autorização explícita para alterar dados do banco de desenvolvimento.

## Complemento 2026-07-11: cortesia como ativacao manual

Uma cortesia administrativa ativa (`professional_subscription.source="admin_grant"`) tambem deve ser exibida no registro profissional como ativacao manual. A decisao preserva a cortesia como assinatura/entitlement operacional, mas evita que o card de registro pareca pendente quando o Admin ja concedeu acesso apos verificacao administrativa do registro profissional.

O CPF permanece obrigatorio para a acao de aprovacao manual auditada, mas deixou de ser exibido no card Admin de registro profissional e nas ultimas tentativas do card.

## Complemento 2026-07-11: acoes manuais por plano

O card de registro profissional separa os dados publicos do conselho dos dados operacionais Lectum. A aprovacao/rejeicao manual fica disponivel apenas quando ha plano Profissional ativo e o registro ainda nao esta ativo. Plano Gratuito nao demanda aprovacao manual; Cortesia ja representa verificacao manual administrativa; Profissional com registro ativo ja foi aprovado pela origem existente.

## Complemento 2026-07-11: responsavel e historico de cortesia

Quando o registro aparece ativo por cortesia administrativa, o card usa o mesmo `granted_by` da assinatura de cortesia como responsavel, mas normaliza a apresentacao para o nome do Admin no formato "Admin Lectum", sem e-mail ou id. Tambem mostra "Aprovacao manual via Cortesia." quando nao houver tentativas registradas em `professional_registry_check`. Para aprovacao via API, o responsavel exibido e "Via API".

## Complemento 2026-07-11: alerta no item Perfil e cadastro

O menu de abas do detalhe Admin exibe alerta em "Perfil e cadastro" somente quando ha plano Profissional ativo nao cortesia e o registro ainda nao esta ativo. A mesma fronteira visual evita alertar Gratuito, Cortesia ou Profissional ja aprovado, que tambem nao devem expor acao de verificacao manual.

## Complemento 2026-07-11: layout sticky do registro profissional

Na aba Perfil e cadastro do Admin, Registro profissional fica isolado na segunda coluna e usa sticky no topo em desktop. A primeira coluna concentra os demais dados de perfil, conteudo e formacao. A decisao reduz a sensacao de area vazia durante rolagem longa e mantem a informacao de aprovacao profissional sempre acessivel sem duplicar dados de conselho em Dados profissionais.

## Complemento 2026-07-11: copy objetiva em dados pessoais

Dados pessoais no Admin usa "WhatsApp" e "Endereco" para alinhar a leitura ao canal operacional real e reduzir ruido visual. A decisao nao altera contratos, persistencia nem regras de verificacao profissional.

## Complemento 2026-07-11: tom vermelho para pendencia acionavel

Quando a pendencia de registro profissional e acionavel pelo Admin, o status "Pendente" e o icone de alerta em "Perfil e cadastro" usam tom vermelho. O CTA primario usa "Aprovar manualmente" sem quebra de linha para comunicar uma acao objetiva e caber no layout de duas colunas.

## Complemento 2026-07-11: status ativo como listagem publica

No detalhe Admin do psicologo, a tag "Ativo/Inativo" do header passa a significar presenca na lista publica de psicologos, nao apenas `user.active`. A decisao reaproveita os candidatos do ranking/listagem publica ja calculados no backend; se o perfil nao aparece entre esses candidatos, o header mostra "Inativo" mesmo com a conta de usuario ativa.
