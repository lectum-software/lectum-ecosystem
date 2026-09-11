# Auditoria — cobertura funcional em andamento

Não é uma certificação de todos os fluxos. O inventário de rotas é estático; esta matriz
registra ações executadas e lacunas. Testes isolados não substituem o ambiente publicado.

| Fluxo | Evidência executada | Falta / limite |
| --- | --- | --- |
| Login paciente/Admin | Vazio, mensagens PT-BR, sessões reais e acesso privado recusado sem sessão | Google, todos os cenários de expiração em dispositivos reais |
| Cadastro paciente | Cadastro e confirmação reais; controles de senha/código em mobile | Recuperação com entrega real de e-mail até a conclusão |
| Cadastro profissional | Vazio inválido; conta criada, e-mail confirmado, plano grátis e WhatsApp autorizado salvos | CPF/CRP autorizados, CFP, aprovação humana e publicação do perfil |
| Formulário profissional | Obrigatórios recusados em português, foco em CPF e sem overflow horizontal em mobile | Perfil não publicado; visibilidade desmarcada apenas no formulário ainda incompleto |
| Perfil paciente | Campo vazio recusado; edição e logout pela UI | Imagem, limites e todos os estados de falha |
| Credenciais | PostgreSQL/HTTP reais: confirmação, recuperação, troca de e-mail/senha e concorrência | Provedor de e-mail não simulado nem certificado por essas suítes |
| Comunidade/Admin | Comunidade própria criada, formulário vazio recusado, regra criada/editada, filtro sem resultado | Avatar, ordenação/regras múltiplas, desativação/reativação e moderação |
| Indicadores/Admin | Conteúdo próprio e contadores conferidos após recarregar | Atualização em tempo real não foi requisito presumido |
| Regras/Admin | Campo vazio recusado, edição persistida; IDs/rótulos/erro/foco corrigidos e repetidos na .326 publicada | Ordenação e combinações adicionais de regras |
| Seguir comunidade | Comunidade seguida e listada; .327 publicada mantém Seguindo em Salvos | Combinações adicionais de membros/comunidades |
| Post profissional | Vazio inválido, criação textual, edição, listagem própria e detalhe | Mídia exige profissional verificado; não contornado |
| Comentário profissional | Criação, edição e persistência; link direto e listagem própria | Moderação, denúncia e permissões entre contas |
| Resposta aninhada | Criação, cancelar/excluir só a filha; .327 publicada sem filha na lista nem contagem/Ver mais fantasma | Concorrência validada em PG isolado, não carga no ambiente publicado |
| Preservação de resposta profissional | Paciente impedido de excluir seu post respondido; alternativa silenciar e reativar funcionaram | Corridas protegidas na suíte PG; repetição com nova versão publicada |
| Salvos | Post e comentário após reload; segunda conta salva/remove sem afetar a primeira; .327 confirma seguimento e contagem | Combinações adicionais de mídia |
| Votos | Segunda conta vota, alterna positivo/negativo e remove voto no post próprio da auditoria | Concorrência e todos os tipos de resposta |
| Denúncias | Denúncia própria resolvida Improcedente; .327 publicada carrega registro e filtra tipo longo/status; erro e retry testados localmente com PG real | Outras decisões não executadas em terceiros |
| Conteúdo/Admin | Reproduzido erro no filtro de psicólogo não verificado e zero enganoso | Correção e regressão em andamento na continuação .328 |
| Post anônimo | Paciente cria/edita; anonimato e comunidade imutáveis na edição; após logout não há nome/link de autor nem ações de dono | Inspeção pública de mídia/metadados e todos os endpoints por objeto |
| Denúncia anônima | Envio sem sessão encaminha ao login, sem conclusão de denúncia | Autenticação é solicitada somente depois de preencher o modal; possível perda de contexto |
| Leitura anônima | Após logout, post e discussão próprios legíveis; salvar solicita login | Ainda não equivale a todos os tipos de vídeo e comunidades |
| Vídeo/player | Reprodução Stream real e testes de teclado anteriores, registrados nas evidências | Upload e render social após hardening, Safari/iPhone/Android reais |
| Serviço de vídeo | Imagem integral .327: Redis/BullMQ/HTTP/FFmpeg/Range/limpeza reais; operador confirmou .327 privada, autenticação válida e ready pelo backend homolog | Upload/render publicado com Stream/R2 após hardening |
| Histórico financeiro | 13 cenários HTTP/Prisma/PostgreSQL reais na imagem integrada local | Nenhuma cobrança/provider de pagamento executado nesta prova |
| Checkout/cancelamento | Revisão estática; compatibilidade de plano e idempotência de cartão com regressões | Concorrência, resultado incerto e reconciliação financeira não certificados |
| Notificações | Resposta profissional chegou ao paciente; abrir levou ao post e retirou não lida/indicador | Preferências, entrega push, deduplicação e todos os eventos |
| Favoritos/busca/avaliações | Inventário e revisão parcial | Jornada completa entre paciente e profissional verificado |
| Termos/privacidade | Falta de links identificada; documentação a confirmar | Conteúdo oficialmente aprovado; bloqueia recomendação de produção |

## Limites operacionais

- Somente homologação e dados de auditoria; nenhuma exclusão em massa, reset ou cobrança real.
- WhatsApp autorizado foi salvo sem envio de OTP nesse fluxo. A conta aguarda dados profissionais
  autorizados; não inventar CPF, CRP ou aprovação. Não publicar o perfil de auditoria.
- Browser conectado não comprova Safari ou Android/iPhone reais. Viewport de 390px comprova apenas
  o layout naquele motor de navegação.
- Cenários concorrentes usam PostgreSQL/Redis reais descartáveis. Dados de teste não permanecem
  no produto nem substituem integrações externas.
- Screenshots 38–48 e logs sanitizados acompanham as evidências; não versionar senhas, códigos,
  tokens, respostas privadas ou dados de outras pessoas.

Provas adicionais: screenshots 49 (erro de denúncias), 50 (controllers corrigidos publicados)
e 51 (post anônimo após logout). A denúncia de teste foi encerrada sem penalizar ninguém;
nenhum conteúdo de terceiros foi alterado.


### Atualização local .328

- Preferências: GET real falho → erro sem formulário → retry → opt-outs preservados → PUT/reload.
  Prova Browser mobile e PG local, não entrega dos canais nem permissão nativa do navegador.
- Conteúdo Admin: oito filtros, vazio legítimo, erro real de rede e recuperação;390/1280px.
- Perfil: limites PT-BR e link com DDD preservado; três seletores abertos por Enter sem upload.
  Capa de vídeo, processamento/render, publicação e dados profissionais reais ainda pendentes.
- Modal de denúncia: foco sai para o fundo; confirmação visual59. Correção reutilizável em análise.
