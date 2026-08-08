# Auditoria de produção — correções de 07/08/2026

Concluída em 08/08/2026.

## Escopo conferido

- 2.070 arquivos versionados foram lidos sem erro.
- 7.778 arquivos autorais locais também foram lidos.
- Arquivos `.env` foram verificados sem mostrar seus valores.
- Dependências, caches e builds gerados ficaram fora do código autoral.
- Nenhuma credencial ou base de produção foi acessada.

## Itens corrigidos

1. O fluxo normal de trabalho foi fixado na branch `homolog`.
2. Push local direto em `main` passou a ser bloqueado.
3. As regras agora tratam homologação e produção como ambientes com dados reais.
4. Mudanças de banco ganharam regra segura de expansão, preenchimento e contração.
5. Novas variáveis obrigatórias passaram a exigir alerta antes do deploy.
6. Mensagens técnicas deixaram de aparecer para o usuário.
7. Erros públicos não mostram stack, SQL, URLs internas ou mensagens de fornecedores.
8. Logs críticos passaram a ocultar segredos e dados pessoais.
9. Frontend e admin passaram a mostrar erros curtos e em português.
10. Login Google ganhou proteção contra retorno falso.
11. Redirecionamentos externos maliciosos no login foram bloqueados.
12. Códigos temporários do Google passaram a funcionar uma única vez.
13. Sessões de usuário passaram a usar cookie `HttpOnly`.
14. Sessões do admin passaram a usar cookie `HttpOnly` mais restrito.
15. JWTs deixaram de ser devolvidos ao JavaScript dos clientes atuais.
16. A compatibilidade temporária com clientes antigos foi preservada no rollout.
17. Tokens e usuário do admin deixaram de ficar no `localStorage`.
18. Redux deixou de persistir dados de sessão no navegador.
19. “Visualizar como” não grava mais o token temporário em cookie JavaScript.
20. O token de “visualizar como” é removido da URL antes da navegação.
21. O logout passou a revogar a sessão atual no banco.
22. O logout remove apenas dados da Lectum no navegador.
23. Sessões antigas ganharam prazo máximo de validade.
24. Sockets passam a conferir novamente se a sessão ainda é válida.
25. Sockets deixam de enviar ou renovar tokens na hidratação.
26. Todas as rotas privadas do admin receberam proteção central.
27. Rotas legadas de paciente receberam verificação de perfil.
28. Recuperação de senha não revela se um e-mail existe.
29. Senhas novas usam hash forte e hashes antigos continuam compatíveis.
30. Confirmação de senha deixou de ser salva no banco.
31. Respostas com dados de sessão passaram a bloquear cache do navegador.
32. Uploads agora conferem o conteúdo real do arquivo.
33. Uploads ganharam limite de quantidade, tamanho, fila e concorrência.
34. Upload interrompido passa por limpeza segura.
35. A API não tenta mais criar bucket R2 durante uma requisição.
36. Arquivos privados deixaram de sair por uma rota pública genérica.
37. URLs de mídia passaram a aceitar apenas origens confiáveis.
38. Exportações CSV passaram a bloquear fórmulas maliciosas.
39. Exportações CSV passaram a usar um único helper seguro.
40. A API ganhou limite de tamanho para corpo das requisições.
41. O rate limit ganhou limite de memória.
42. A API ganhou `/health` e `/ready` com validação real do banco.
43. O servidor ganhou encerramento seguro para deploy e reinício.
44. Chamadas externas ganharam timeout para não travar telas.
45. Repetição de queries ficou restrita a falhas temporárias.
46. Telas globais de loading e erro foram adicionadas.
47. Campanhas antigas ficaram desligadas por padrão.
48. Tarefas agendadas deixaram de executar duas vezes ao mesmo tempo.
49. Falha no envio de e-mail não é mais tratada como sucesso.
50. Dados demonstrativos e placeholders ativos foram removidos.
51. Componentes repetidos de erro e loading foram centralizados.
52. Paginação repetida no admin virou um componente compartilhado.
53. Regras repetidas de datas e períodos foram centralizadas.
54. Cálculos de dias passaram a respeitar datas civis e horário de verão.
55. Formatação repetida da comunidade foi centralizada.
56. Textos expansíveis repetidos viraram um componente compartilhado.
57. Tratamento de imagens do admin foi centralizado.
58. Regras de URL da API foram centralizadas.
59. Acesso repetido a sessões da conta foi extraído para um repositório próprio.
60. Dependências de produção passaram a ter verificação de alcance no backend.
61. Warnings de Biome e ESLint agora quebram o check.
62. Dependências vulneráveis detectadas foram atualizadas.
63. O repositório ganhou verificação contra credenciais commitadas.
64. O repositório ganhou verificação das variáveis usadas e documentadas.
65. O repositório ganhou limite contra crescimento de arquivos gigantes.
66. Testes novos cobrem sessão, OAuth, upload, erros, datas e configuração.
67. A inicialização conjunta deixou de travar ao interpretar arquivos gerados do Prisma.
68. O admin ganhou ícone próprio e dimensões corretas da marca, sem aviso visual ou arquivo 404.

## Atenção no deploy

- Branch atual: `homolog`; o push publica homologação automaticamente.
- Não houve mudança de schema ou migration.
- Não houve coluna obrigatória nova.
- Não houve variável obrigatória nova.
- Sessões antigas demais podem pedir novo login.
- Campanhas automáticas devem continuar desligadas até revisão dos registros.
- Validar homologação antes de promover por merge para `main`.

## Validação final

- Checks de frontend, backend e admin: aprovados sem warning.
- 41 testes automatizados do backend: aprovados.
- Builds das três aplicações e da imagem Docker do backend: aprovados.
- Auditoria de dependências nos quatro escopos: nenhuma vulnerabilidade conhecida.
- Smoke local mobile/desktop, `/health` e `/ready`: aprovados.

## Riscos conhecidos para próximas tarefas

1. Remover `unsafe-inline` da CSP exige rollout próprio com nonce.
2. O rate limit atual é separado por instância da API.
3. Schedulers devem rodar em uma única réplica até existir lock distribuído.
4. Arquivos legados grandes ainda precisam ser divididos aos poucos.
5. Dez arquivos dos packages portados ainda usam `@ts-nocheck` por compatibilidade.
6. O fallback bearer deve ser removido só após confirmar o fim dos clientes antigos.
