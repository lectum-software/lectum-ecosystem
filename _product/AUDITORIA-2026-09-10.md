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

## Ainda pendente

- Documentos legais aprovados e links no cadastro: **bloqueiam recomendação de produção**.
- Concluir leitura de todos os arquivos e testes de todos os fluxos.
- Repetir cadastro completo e testar perfil profissional, Google e dispositivos reais.
- Avaliar senhas antigas e concluir verificações de permissão, pagamentos e vídeos.

Cobertura da base: **226 arquivos com leitura inicial**, 12 parciais e 2883 ainda não revisados.

[Evidências, versões e limitações](AUDITORIA-2026-09-10-EVIDENCIAS.md) · [Inventário](AUDITORIA-2026-09-10-INVENTARIO.tsv)
