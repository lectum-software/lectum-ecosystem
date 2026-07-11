# ADR-0252: Edição administrativa auditada de dados do psicólogo

## Status

Aceito — 2026-07-11

## Contexto

A TASK-67 liberou suporte operacional no detalhe Admin do psicólogo para corrigir Dados pessoais (sem e-mail) e Dados profissionais. Essas alterações não podem parecer ações do próprio psicólogo, nem abrir caminho para alterar bio, apresentação, formação, plano, pagamento, cortesia ou status de verificação profissional.

A aba Atividades já existia como linha do tempo de fontes reais, mas não havia trilha genérica para alterações administrativas de campos.

## Decisão

- Criar `admin_activity_log` / `admin_activity_logs` como tabela genérica de auditoria administrativa.
- Registrar as edições da TASK-67 com `source="admin_panel"`, `domain="psychologist_profile"`, `area="perfil_e_cadastro"` e ações:
  - `psychologist_personal_data_updated`;
  - `psychologist_professional_data_updated`.
- Armazenar apenas valores seguros em `safe_before`/`safe_after`: CPF mascarado, telefone parcial e endereço como estado resumido, sem e-mail, token, id técnico sensível ou endereço completo em listas de atividade.
- Expor os eventos no endpoint Admin de Atividades com ator humano seguro (`Admin Lectum` ou nome do admin), seção, tipo, campos alterados e motivo quando informado.
- Manter `user.email` somente leitura: os endpoints não aceitam `email` porque o validator é `strict` e o frontend não envia o campo.
- Alteração administrativa de CPF em psicólogo com `crp_status="aprovado"` exige confirmação explícita e motivo, mas não altera `crp_status` nem `cfp_verified_at`.
- Dados profissionais usam catálogos reais persistidos; valores já vinculados e atualmente inativos podem ser preservados, mas novas seleções precisam existir em catálogo ativo.
- Refinamento de UI: o aviso e a confirmação forte de CPF aprovado aparecem somente quando o valor do CPF foi efetivamente alterado no formulário.
- Refinamento de consistência: dropdowns estáticos do Admin em Perfil e cadastro devem espelhar as opções disponíveis ao psicólogo no fluxo de edição/cadastro profissional; quando o Admin precisa permitir limpeza de campo opcional, adiciona apenas a opção vazia `Não informado`.
- O WhatsApp administrativo usa máscara visual de telefone no formulário e continua normalizando para dígitos/E.164 antes de persistir.
- Datas de nascimento são exibidas como datas puras em UTC no Admin, sem conversão para o fuso local, para evitar regressão de um dia em valores persistidos como `DateTime` à meia-noite.
- A edição administrativa de Dados profissionais deve reproduzir os mesmos padrões de controle do psicólogo: especialidades e abordagens em lista suspensa com chips selecionados, idioma em select e serviços/público em chips de seleção.
- O motivo/observação interna em Dados profissionais passa a ser obrigatório também no contrato backend, mantendo auditoria explícita para qualquer correção operacional.

## Consequências

- O Admin consegue corrigir dados operacionais sem impersonar o psicólogo e sem criar sessão/token de psicólogo.
- A aba Atividades passa a mostrar edições administrativas novas, mas não retroage eventos antigos.
- O schema ganhou migration própria e `DATA-MODEL.md` passou a documentar o contrato de auditoria.
- O log foi desenhado para exibição operacional, não para exportação completa de auditoria ou retenção legal detalhada.
- A indicação de e-mail somente leitura permanece no card de leitura, mas a faixa informativa foi removida do modo de edição para reduzir ruído visual após a criação da aba Conta.
- A UI Admin fica mais próxima da autogestão do psicólogo sem reutilizar o formulário público inteiro, porque o escopo Admin continua excluindo bio, vídeo, formação, registro profissional e plano.
