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
  observação opcional, motivo obrigatório em rejeições e snapshots anterior/próximo.

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

## Complemento 2026-07-11: registro publico editavel na propria tela

Regional CRP, Numero CRP e Data de inscricao passam a ser campos editaveis
diretamente no card Registro profissional do Admin, sem modal. O card nao exibe
mais o rotulo "Dados publicos" nem o botao isolado "Salvar dados publicos"; os
botoes visiveis do bloco sao "Aprovar manualmente" e "Rejeitar verificacao".

Na aprovacao manual, os valores inline alimentam a decisao auditada e atualizam
`psychologist_profile.crp` e `psychologist_profile.crp_registration_date`. O
endpoint `PUT /api/admin/private/psychologists/:id/registry-verification/identity`
permanece como contrato administrativo de correcao controlada desses dados
publicos, sem alterar aprovacao, `cfp_verified_at`, assinatura, gateway ou
cortesia. Esses tres campos passam a ser retornados no contrato do perfil
publico para exibicao como dados do conselho profissional. O card Admin removeu
o campo Tempo de experiencia para evitar tratar a data de inscricao como
derivacao principal.

## Complemento 2026-07-11: CPF pendente visivel ao Admin

Quando o psicologo informa um CPF valido na etapa de verificacao profissional, o backend persiste esse CPF em `psychologist_profile.cpf` antes de consultar a API automatica. Assim, se a consulta externa falhar, estiver indisponivel, sem token operacional ou retornar erro, o Admin ainda visualiza o CPF em Dados pessoais no detalhe do psicologo para triagem manual.

Essa persistencia nao aprova o registro, nao preenche `cfp_verified_at`, nao altera CRP/data de inscricao e nao sobrescreve identidades ja bloqueadas por aprovacao profissional ou cortesia administrativa ativa. Para tentativas historicas que ja tenham CPF em `professional_registry_check`, o detalhe Admin usa esse CPF como fallback de exibicao, sem copiar retroativamente dados nem criar aprovacao.

## Complemento 2026-07-11: aprovacao manual sem observacao obrigatoria

O modal de aprovacao manual do CRP deixa de exibir a tag explicativa sobre uso
dos dados do card e remove o campo "Observacao/evidencia interna". A decisao
reduz atrito operacional porque Regional CRP, Numero CRP e Data de inscricao ja
sao editados no card, enquanto a confirmacao da aprovacao deve pedir apenas CPF,
situacao confirmada e confirmacao forte.

No backend, `notes` passa a ser opcional na aprovacao manual para manter
compatibilidade com clientes antigos sem obrigar a UI atual a coletar texto. A
auditoria continua registrando admin responsavel, dados conferidos, status
anterior/proximo e `situation_confirmed=true`; rejeicoes seguem exigindo motivo
obrigatorio.

## Complemento 2026-07-11: edicao persistente do registro pelo Admin

Regional CRP, Numero CRP e Data de inscricao ficam habilitados para edicao pelo
Admin independentemente do status atual do registro profissional. A persistencia
usa o endpoint administrativo existente de identidade do registro e nao altera
aprovacao, `cfp_verified_at`, assinatura, gateway ou cortesia.

Na pendencia profissional, o Admin pode salvar apenas a correcao cadastral ou
usar os valores atuais do formulario para seguir com "Aprovar manualmente". Em
registros ja ativos, "Salvar registro" permite corrigir dados publicos do
conselho sem reabrir uma decisao de verificacao.

## Complemento 2026-07-11: resumo do registro sem observacao fixa

O bloco operacional "Lectum" do card Registro profissional nao exibe mais a
linha fixa "Observacao". Motivos e observacoes permanecem preservados em
`professional_registry_check.raw` e podem aparecer no historico de ultimas
tentativas, mas o resumo do registro prioriza plano, aprovacao, origem,
responsavel e data de aprovacao.

## Complemento 2026-07-11: confirmacao forte para salvar registro

Salvar alteracoes diretas em Regional CRP, Numero CRP ou Data de inscricao passa
a exigir confirmacao forte `SALVAR REGISTRO` em modal mobile-first e tambem no
contrato backend `PUT /api/admin/private/psychologists/:id/registry-verification/identity`.

A decisao evita que uma alteracao de CRP seja persistida por clique acidental ou
automacao do cliente, sem transformar o salvamento em aprovacao/rejeicao: a
operacao continua sem alterar `crp_status`, `cfp_verified_at`, assinatura,
gateway ou cortesia.
