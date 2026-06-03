# Roadmap Revalidado por Telas

Este roadmap descreve a fila operacional atual por telas e jornadas. Ele existe para que usuários não-devs consigam validar cada entrega de forma objetiva.

## Decisão de replanejamento

- Manter `TASK-00`, `TASK-01`, `TASK-02` e `TASK-03` como fundação/governança.
- Executar `TASK-02` antes das primeiras telas funcionais com campos, para padronizar React Hook Form, Zod e controllers.
- Quebrar as jornadas visuais em tasks menores e validáveis.
- Cada task visual deve citar as imagens de `_product/proto` usadas.
- Builder/Quick Copy é fonte de contexto quando disponível no cliente; as imagens exportadas são fallback obrigatório e referência auditável.
- Nenhuma task pode aceitar código gerado automaticamente sem adequação à arquitetura do frontend/backend.

## Fila recomendada

| Ordem | Task | Tipo | Telas principais | Depende |
|---:|---|---|---|---|
| 00 | Setup do agente executor e governança | Governança | - | - |
| 01 | Design System Lectum Foundation | Fundação | tokens, componentes, shells | 00 |
| 02 | Form Composition Foundation | Fundação frontend | controllers, useFormList, erro inline | 01 |
| 03 | Decisões externas e integrações obrigatórias | Governança | pagamento, storage, e-mail, CFP | 00 |
| 04 | Seleção de perfil e login | Auth | Seleção de Perfil, Login | 01, 02, 03 |
| 05 | Recuperação de senha | Auth | Inserir Email, Link Enviado, Criar Nova Senha | 02, 04 |
| 06 | Verificação de e-mail por código | Auth | Verificação de E-mail, Confirmação de Código | 02, 04 |
| 07 | Cadastro de paciente | Paciente | Cadastro de Paciente | 02, 04, 06 |
| 08 | Boas-vindas do paciente | Paciente | Boas-vindas 1, 2, 3 | 07 |
| 09 | Cadastro inicial de psicólogo | Psicólogo | Cadastro de Psicólogo | 02, 04, 06 |
| 10 | Consulta CFP e resultado | Psicólogo | Consulta CFP, Carregando, Resultado encontrado/não encontrado | 02, 03, 09 |
| 11 | Envio e confirmação de CRP | Psicólogo | Confirmações de Envio de CRP | 02, 03, 10 |
| 12 | Shell privado mobile | Infra UI | navegação privada, estados vazios, proteção | 06, 08 ou 11 |
| 13 | Psicólogos: listagem e filtros | Descoberta | Psicólogos, Filtros expandidos | 02, 12 |
| 14 | Favoritos e seguindo | Descoberta | Favoritos, Seguindo | 13 |
| 15 | Perfil profissional público | Perfil | Sobre, Publicações, Avaliações | 13 |
| 16 | Contato por WhatsApp | Perfil | Confirmação de WhatsApp | 02, 03, 15 |
| 17 | Avaliações pelo paciente | Avaliações | Avaliar, Confirmação, Avaliações feitas | 02, 15, 16 |
| 18 | Perfil privado do psicólogo | Psicólogo | Perfil, Editar Perfil, Modal Atualização | 02, 11, 12 |
| 19 | Avaliações do psicólogo | Psicólogo | Minhas Avaliações | 18, 17 |
| 20 | Analytics do psicólogo | Psicólogo | Meus Analytics | 16, 17, 18 |
| 21 | Perfil privado do paciente | Paciente | Perfil do paciente, Editar Perfil | 02, 12 |
| 22 | Explorar e sugerir comunidades | Comunidades | Explorar, Sugerir, Confirmação sugestão | 02, 12 |
| 23 | Feed de comunidade | Comunidades | Feed Comunidade | 22 |
| 24 | Criar postagem | Comunidades | Criar Postagem Paciente/Psicólogo, Confirmação | 02, 23 |
| 25 | Dentro da comunidade | Comunidades | Dentro da Comunidade | 23 |
| 26 | Dentro do post | Comunidades | Dentro do Post | 02, 24, 25 |
| 27 | Ranking Top Mentores | Comunidades | Top 5 Mentores | 03, 23 |
| 28 | Meus posts e posts salvos | Posts | Meus Posts Paciente/Psicólogo, Posts Salvos | 24 |
| 29a | Notificações: fundação/recebimento | Conta | Notificações, Configurações de Notificações | 02, 12 |
| 29b | Notificações: eventos de domínio | Conta | (sem tela; dispara eventos) | 29a |
| 30 | Configurações de conta | Conta | Login Google, Editar E-mail e Senha | 02, 12 |
| 31 | Planos de assinatura | Assinatura | Planos de Assinatura | 03, 18 |
| 32 | Checkout de assinatura | Assinatura | Finalizar Assinatura, Endereço de Faturamento | 02, 03, 31 |
| 33 | Gestão de assinatura e cartão | Assinatura | Minha Assinatura, Alterar Cartão, Sucesso | 02, 32 |
| 34 | Qualidade, segurança, LGPD e operação | Qualidade | todas as rotas principais | 13-33 |

## Regras por task visual

Cada task visual deve conter:

- imagens de referência exatas;
- rota frontend;
- estados de loading, erro, vazio e sucesso;
- endpoint ou decisão de backend;
- query keys e callers esperados;
- componentes existentes a reutilizar;
- controllers de formulário da `TASK-02` quando houver qualquer campo, filtro avançado, edição ou submit;
- validação por browser local;
- bloqueio explícito quando uma integração externa estiver ausente.

## Telas que exigem cuidado especial

- `Editar Perfil - Psicólogo.jpg`: tela longa, deve virar seções/componentes e não um único componente gigante.
- `Dentro do Post.jpg`: tela muito longa, precisa paginação/âncoras e controle de respostas.
- `Planos de Assinatura.jpg`: depende de gateway real; sem decisão externa, task deve parar antes de checkout real.
- `Resultado CFP - Variação em Cards.jpg`: depende de contrato real de consulta CFP ou decisão registrada.
- `Confirmação de WhatsApp - Inserir Número.jpg`: não pode prometer integração se WhatsApp/SMS não estiver decidido.

## Estado documental

Os arquivos operacionais `TASK-00` a `TASK-34` foram materializados seguindo esta fila. O executor deve usar os arquivos reais em `_product/tasks`, não versões anteriores ou agrupamentos macro.
