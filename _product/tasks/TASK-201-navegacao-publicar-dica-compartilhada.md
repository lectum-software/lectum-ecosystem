# TASK-201 - Publicar no centro da navegacao e dica compartilhada

Dependencia: TASK-200 (Completed). Status: Completed.

## Escopo

Mobile-first (390px): substituir Favoritos pelo + central integrado a barra,
sem sobrepor videos; colocar Favoritos no Perfil abaixo dos posts do usuario.
Manter a barra fixa no feed e nas comunidades. Preservar ocultacao explicita no
modo imersivo dos videos de apresentacao em Psicologos e navegacao desktop.

Mostrar a dica atual tambem para visitante anonimo que entra diretamente na
comunidade. Texto e titulo originais preservados. Uma mesma lembranca local
compartilhada entre feed/comunidades, conciliada com a preferencia existente da
conta apos login. Nao resetar por campanha, nova comunidade ou recarga.

Referencia: captura mobile e organizacao explicitamente aprovadas pelo usuario
em 01/10/2026. PROTO-INVENTORY consultado; Builder/Quick Copy nao disponivel nesta
sessao. Reutilizar tokens e componentes atuais, sem novo framework ou pacote.

## Criterios de aceite

- [x] Inicio, Psicologos, +, Notificacoes, Perfil nas cinco posicoes mobile.
- [x] Favoritos abaixo de Meus posts no Perfil para paciente e psicologo.
- [x] Barra fixa ao rolar feed/comunidade; excecao imersiva preservada.
- [x] Criacao contextual e retorno de autenticacao preservam a comunidade.
- [x] Visitante anonimo recebe a mesma dica no primeiro contexto elegivel.
- [x] Sem repeticao entre paginas/recargas/login; preferencia de conta preservada.
- [x] Dica central usa offsets da barra em mobile/tablet; FAB desktop preservado.
- [x] Testes, check/build frontend, inspecao local e plano de smoke de homolog.

## Deploy e rollback

Somente frontend. Sem migration, env ou dependencia nova. Preferencia existente
has_seen_community_post_tip continua compativel. Novas chaves locais armazenam
apenas conclusao da dica, sem conteudo de posts. Storage indisponivel usa memoria
do documento. Risco: navegacao compartilhada e sincronizacao anonimo/conta.
Rollback por reversao revisada; nao requer apagar preferencias. Publicar primeiro
em homolog. Producao depende de solicitacao explicita posterior.

## Validacao

Check frontend completo aprovado: Biome, ESLint, TypeScript e suites (um skip
preexistente de symlink no Windows). Testes de navegacao/autenticacao: 10/10,
incluindo quatro novas regressoes de storage, rotas e contratos de composicao.
Build Next 16.3.3 aprovado. Guards de versao, encoding, segredos, ADRs, tasks,
source-safety, source-size, env e ciclos aprovados. Versao 0.1.536.

Preview local em localhost:3004 inspecionado em 390x844: cinco acoes, + central,
position=fixed e limite inferior alinhado ao viewport. Conteudo real nao carregou
no cliente local: API de homolog nao permite essa origem por CORS. Sem contornar
essa politica. Validacao visual da dica, rolagem com conteudo e criacao contextual
deve ser concluida no deploy homolog e registrada fora do repo em
outputs/navegacao-publicar-0536.md. Historico por conta coberto por teste local;
nao declarar login de conta real ou teste de aparelho fisico sem executa-los.
