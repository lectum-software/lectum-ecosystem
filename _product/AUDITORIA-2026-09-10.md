# Auditoria Lectum — acompanhamento

**Em andamento. Não é uma liberação para produção.**

## Correções validadas localmente

1. Atualizadas bibliotecas com alertas de segurança no frontend, Admin e backend.
2. Reforçada a recusa de campos de upload malformados, antes de consumir memória excessiva.
3. Preservado o limite exato dos arquivos após a atualização da biblioteca de uploads.
4. Ajustada a navegação interna para cadastro/login ao atualizar o Next, sem recarregar toda a página.
5. Campos obrigatórios e inválidos passaram a ter mensagens compreensíveis, sem `string`/`undefined`.
6. Corrigidos acentos perdidos nas mensagens de sugestões de comunidades.
7. Retiradas referências técnicas das mensagens de sessão, SMS e sugestões.
8. Falha de verificação profissional não atribui mais indisponibilidade ao Conselho sem evidência.
9. Corrigido texto de campos alternativos que mostrava um marcador de tradução quebrado.
10. Campos com tamanho fixo informam a quantidade exata, sem sugerir apenas mínimo/máximo.
11. Corrigido o build do backend no servidor: traduções faltavam durante a compilação.
12. Botão de mostrar/ocultar senha acessível por teclado, com foco visível e respeito ao campo desabilitado.
13. Rótulos de campos separados dos botões, descrições e erros para não confundir leitores de tela.
14. Apagar um dígito do código de confirmação não desloca mais os números seguintes.
15. Confirmação de e-mail descarta o estado antigo da navegação, que podia devolver a pessoa à verificação.
16. Opções de seleção respondem a Enter/Espaço, não apenas ao pressionar o mouse.
17. Escape fecha a lista e devolve o foco ao campo, preservando a escolha.
18. Falha ao validar uma sessão não é mais confundida com navegação de visitante.
19. Erros padrão de validação em inglês são substituídos por orientação segura em português.
20. Aviso de conexão Google não expõe mais configuração interna da integração.
21. Novas senhas longas passam a considerar todos os caracteres, inclusive acentos e o final da senha.
22. Publicações anônimas não entregam mais o identificador interno do autor a outros leitores.
23. Comentários do autor anônimo continuam anônimos também na lista de itens salvos.
24. Apelidos anônimos usam uma regra centralizada, sem cálculo público baseado no usuário.
25. E-mails com `+` ou domínio longo não são mais recusados apenas pelo backend.
26. Endereços malformados recebem mensagem de e-mail inválido em português.
27. Código de confirmação expira no prazo configurado, sem ganhar tempo por arredondamento.
28. Confirmação aceita somente seis números e preserva zeros à esquerda.
29. Duas tentativas simultâneas não conseguem reutilizar a mesma confirmação.
30. Link de recuperação de senha também respeita o prazo configurado.
31. Um link de recuperação não pode concluir duas trocas de senha simultâneas.
32. Trocar a senha pelas duas rotas da conta invalida os links de recuperação anteriores.
33. Limite do nome de categoria explica o que corrigir em português.
34. Campos do Admin separam rótulo e erro, sem mudar o espaço do formulário.
35. Recursos privados exigem confirmação do e-mail também no servidor, sem depender da tela.
36. Trocar a senha não confirma mais o e-mail indevidamente.
37. Senhas temporárias precisam ser trocadas antes de usar recursos privados.
38. Trocar o e-mail invalida links de recuperação enviados ao endereço anterior.
39. Controles de vídeo não desaparecem enquanto são usados pelo teclado.
40. Escape sai do vídeo ampliado sem voltar ao início ou pausar indevidamente.
41. Trocar o e-mail pelo Admin invalida links de recuperação enviados ao endereço antigo.
42. Envios iniciados antes de uma troca de e-mail ou senha não conseguem reativar códigos antigos.
43. Falha em um envio de recuperação não apaga o link de uma tentativa posterior.

44. Campos de formulários e modais simultâneos não confundem mais rótulos e mensagens de erro.

### Correções publicadas na 0.1.327

45. Histórico financeiro não associa mais cobranças pelo simples aparecimento de um identificador no texto.
46. Referências financeiras conflitantes não vinculam o mesmo evento a duas assinaturas.
47. Parcela processada ou assinatura autorizada não são confundidas com pagamento confirmado.
48. Valores monetários malformados não viram valores aparentemente válidos.
49. Trocas diferentes de cartão não reutilizam a mesma identificação da operação.
50. Webhooks recusam assinaturas malformadas ou cabeçalhos ambíguos.
51. Plano externo precisa corresponder a preço, moeda, estado e periodicidade mensal esperados.
52. Consulta/download de renderização exige vínculo assinado com autor e conteúdo.
53. Mídias legadas não aceitam endereços arbitrários como se fossem arquivos da aplicação.
54. Partes de upload precisam ter o tamanho esperado antes da conclusão.
55. Perfil removido não continua expondo nome, imagem e contato no conteúdo público.
56. Processamento de vídeo restringe playlists remotas e verifica certificados HTTPS.
57. Download valida o endereço usado na conexão e recusa redirecionamentos inesperados.
58. Limpeza de vídeos protege diretórios estruturais e uploads reservados ainda na fila de entrada.
59. Textos com apóstrofos e separadores não quebram a renderização social.
60. Processamento possui prazo total, cancelamento e retomada de saída válida após falha da fila.
61. Respostas criadas ou excluídas ao mesmo tempo são revalidadas na transação, sem reutilizar permissões antigas.
62. Exclusões concorrentes não descontam respostas duas vezes nem deixam contadores calculados antes da operação.
63. Edição de publicação do paciente passa pela moderação; uma tentativa recusada preserva a versão anterior.
64. Filtros de denúncias aceitam os valores oferecidos na tela; datas vazias não bloqueiam a consulta inicial.
65. Falha ao consultar denúncias não aparece como zero denúncias ou lista vazia.
66. Identificadores especiais não alteram o tipo dos dados de origem enviados pela API.
67. Respostas excluídas não permanecem na contagem de filhas ou no link “Ver mais”.
68. Comunidades seguidas mantêm o estado correto em posts próprios e itens salvos.

### Correções publicadas na 0.1.328

69. WhatsApp preserva o DDD mesmo quando ele coincide com o código do país.
70. Número longo demais é recusado, em vez de perder dígitos silenciosamente.
71. Limites do perfil explicam o problema em português, incluindo o nome completo.
72. Seletores de arquivos não duplicam controles invisíveis na navegação por teclado.
73. Falha ao carregar preferências não oferece opções padrão que apaguem escolhas anteriores.
74. Salvar preferências preserva opções não mostradas e bloqueia novas edições durante o envio.
75. Filtros de conteúdo do Admin aceitam todos os tipos oferecidos na tela.
76. Erro ao consultar conteúdo não é apresentado como uma lista vazia ou contagem zerada.

### Correções publicadas na 0.1.329

77. A denúncia bloqueia interação com o fundo e mantém a navegação por teclado no modal.
78. Fechar ou concluir retorna ao botão do post/comentário correto, inclusive respostas encadeadas.
79. Escape fecha primeiro o seletor aberto; formulário e texto permanecem após falha de rede.
80. Títulos/campos têm identificadores próprios; rolagem é liberada ao fechar a denúncia.

### Correções publicadas na 0.1.330

81. Status desconhecido ou recusado não é confundido com pagamento aprovado.
82. Valores malformados não viram quantias financeiras; zero conhecido é distinto de valor ausente.
83. Referências parecidas ou conflitantes não atribuem pagamentos a outra conta.
84. Histórico financeiro não entrega explicações técnicas brutas do pagamento.
85. Atualizações simultâneas não diminuem o tempo já registrado de uma visita.
86. Visita removida não recebe nova duração enquanto outra atualização aguarda.

### Correções publicadas na 0.1.331

87. Páginas com sessão ativa não começam mais com uma renderização diferente da enviada pelo servidor.
88. Presença da sessão usa uma única fundação compartilhada, sem duplicar temporizadores.

### Correções publicadas na 0.1.332

89. Consultar metadados públicos não altera mais configurações no banco.
90. Aberturas simultâneas do painel não conflitam ao preparar configurações iniciais.
91. Atualização automática de rotas não sobrescreve uma edição feita ao mesmo tempo.
92. Configurações removidas, identificadores existentes e datas reais são preservados.

### Correções publicadas na 0.1.333

93. Cancelamento e publicação simultâneos não deixam um vídeo salvo apontando para um arquivo cancelado.
94. Abandonar um envio não é mais confundido com remover o vídeo já salvo no perfil.
95. Limpeza só pede exclusão remota após confirmação segura no banco.
96. Um envio antigo não substitui o mais recente; a migração respeita alterações feitas no vídeo e na capa.

### Correções publicadas e verificadas na 0.1.335

97. Recuperação de senha mantém o endereço realmente enviado; reenvio não usa outro valor do campo.
98. Preservado o ajuste paralelo de Cidade: trocar Estado limpa a cidade anterior e atualiza as opções.

Publicação0.1.335 confirmada com17 verificações aprovadas.

### Correções publicadas e verificadas na 0.1.336

99. WhatsApp profissional preserva o DDD e usa a mesma conversão nas duas telas.
100. Durante a confirmação do registro, seleção e reinício ficam bloqueados.
101. Perfil presencial não anuncia atendimento online.

Publicação336 confirmada com16 verificações aprovadas; confirmaçãoCFP real ainda pendente.

### Correções publicadas e verificadas na 0.1.337

102. Campo de telefone com seletor de país não esconde nem corta dígitos.
103. Opção de postagem anônima volta à navegação por Tab.
104. Avisos de respostas e comentários usam concordância correta.
105. Resumo do Admin reconhece as categorias de denúncia de maior gravidade.
106. Gênero informado usa rótulo legível, com proteção para valores antigos inesperados.
107. Explicações das métricas de notificações estão em português.
108. Tipo do comando administrativo de suspensão contém sua duração.

Publicação337 confirmada com16 verificações aprovadas. Telefone conferido sem salvar;
teclado de paciente, confirmaçãoCFP e aparelhos reais continuam pendentes.

### Correções publicadas e verificadas na 0.1.338

109. Consulta administrativa de atividades deixa de esconder a conta apenas por estar inativa.
110. Títulos inesperados de notificações recebem um texto seguro em vez de quebrar a lista.
111. Diagnósticos de vídeo mantêm códigos conhecidos mesmo diante de mensagens inesperadas.

Sem alteração de banco, variáveis ou dados. Prova da conta inativa é de contrato da consulta;
não suspendemos usuários para testar. Checks758, builds e imagens aprovados;18/18 testes pós-deploy
aprovados. Quatro apps na338; conexão privada de vídeo confirmada pelo operador.

### Correções locais na 0.1.339

112. Demora na análise do vídeo não é mais confundida com arquivo inválido; permite tentativa limitada.
113. Script de testes informa quando o cancelamento não foi testado, em vez de anunciar sucesso.

774 testes locais, build e imagem de vídeo aprovados. Publicação339 confirmada:18/18 smoke;
backend, frontend e Admin339. Última prova privada anterior:vídeo338.
Sem alteração de banco ou novas variáveis.

### Correções locais na 0.1.340

114. Votos e itens salvos nos cards acompanham dados atualizados, sem apagar uma ação em andamento.
115. Falha ao votar ou salvar não desfaz outras ações; respostas antigas ou de outro item são ignoradas.
116. Vídeos de compartilhamento respeitam as dimensões configuradas, sem rejeitar a própria saída.

Testes de cache106/106 e render real17/17 aprovados; sem alterar banco nem criar variáveis.
Minutas legais foram localizadas, mas não estão aprovadas; as duas páginas previstas retornam404.
Publicação340 confirmada:18/18 smoke e três apps públicas340. Voto/salvamento reais nos
cards de auditoria validados em390px. Vídeo privado e demais fluxos completos ainda pendentes.

### Correção local na 0.1.341

117. Convite para criar conta não permanece aberto após reconhecer uma pessoa já autenticada.

Regressões locais, build e repetição em homologação aprovados;18/18smoke e três apps341.
Mais97 arquivos de migrations lidos, sem executar mudanças no banco.

### Correções locais na 0.1.342

118. Período personalizado recusa datas vazias, impossíveis ou invertidas antes da consulta.
119. Cancelar a edição do período preserva o filtro e os dados anteriores.
120. Remover anexos voltou a funcionar por Tab, Enter e Espaço, mantendo o bloqueio durante envio.
121. Gráfico de retenção respeita o ponto desenhado e permite navegação por setas, início e fim.
122. Verificador de dependências passou a considerar imports TypeScript do serviço de vídeo.

Regressões locais e build aprovados; publicação e repetição autenticada ainda pendentes.
O gráfico foi testado como componente real, não como reprodução de vídeo pago.

## Ainda pendente

- Documentos legais aprovados e links no cadastro: **bloqueiam recomendação de produção**.
- Concluir leitura de todos os arquivos e testes de todos os fluxos.
- Repetir cadastro completo e testar perfil profissional, Google e dispositivos reais.
- Avaliar senhas antigas e concluir verificações de permissão, pagamentos e vídeos.
- Reconciliar checkout de resultado incerto e eventos financeiros com o recurso oficial do gateway.
- Concluir foco dos demais modais, Safari/iOS e testes de mídia/perfil com requisitos reais.

Cobertura da base: **1643 arquivos com leitura inicial**, 5 parciais e 1473 ainda não revisados.
Leituras dos subagentes têm proveniência registrada; isso não equivale a testar cada fluxo.

[Evidências, versões e limitações](AUDITORIA-2026-09-10-EVIDENCIAS.md) · [Inventário](AUDITORIA-2026-09-10-INVENTARIO.tsv) · [Fluxos](AUDITORIA-2026-09-10-FLUXOS.md) · [Leituras adicionais](AUDITORIA-2026-09-11-LEITURAS.tsv)
