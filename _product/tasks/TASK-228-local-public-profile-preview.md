# TASK-228 - Perfis publicos no ambiente local

## Status

Done.

## Objetivo

Permitir consulta a perfis reais no localhost sem editar cadastros publicados.
A conta autenticada de desenvolvimento continua com o editor e persistencia locais.

## Escopo

- Ponte opt-in no launcher local, fora do boot produtivo. Consultar apenas GETs
  publicos do diretorio; nunca encaminhar sessao, cookies ou credenciais.
- Preservar aliases dos autores da amostra de videos. Identidades remotas nao
  passam a ser contas autenticaveis e nao recebem CPF ou dados privados ficticios.
- Perfis de consulta sem favoritos, avaliacao ou contato; comandos recusados na
  ponte. Fotos e videos usam referencias permitidas pelo contrato publico.
- Conta propria explicitamente excluida da ponte, inclusive quando incompleta.
  Completar perfil/Editar perfil e validacoes normais permanecem intactos.
- UI mobile-first reutiliza telas existentes da TASK-15; sem redesenho. Referencias
  em PROTO-INVENTORY.md. Builder indisponivel nesta execucao.

## Aceite

- [x] Perfil anteriormente indisponivel abre com dados reais e estado somente leitura.
- [x] Consulta anonima nao encaminha credenciais e nao efetua writes remotos.
- [x] Conta propria e editor permanecem locais e autenticados.
- [x] Abas e midias verificadas em desktop e mobile; falhas nao viram dados inventados.
- [x] Testes, check e build frontend executados; limitacoes registradas.

## Validacao

- Oito testes Node da ponte e leitura de midia; quatro testes de renderizacao do
  slot de favorito, incluindo estado somente leitura. Check frontend completo
  passou; alteracoes finais do favorito verificadas com Biome, teste focal e build.
- Build frontend 0.1.600 passou. Check raiz passa versionamento, segredos,
  encoding, ADR/tasks e env, mas falha no baseline de tamanho de
  community-post-card.tsx (724) e community-post-controls.test.mjs (916), intocados.
- Playwright com API real em 390/1440: foto, capa, tres abas e video pronto
  (readyState=4); sem overflow, erros JS ou favorito habilitado na previa.
- API local: ready/feed/diretorio/perfil 200; favorito da previa 403.
  Perfil proprio incompleto continua 404 publico, sem falso perfil publicado.
- Conta propria ativa e confirmada, com WhatsApp, ainda sem CPF/publicacao.
  Editor existente preservado. Login Google e salvamento autenticado pelo usuario
  ainda precisam de conferencia manual; nenhum token foi fabricado para o teste.
- Durante a verificacao a API local caiu com TimeoutError nao tratado no helper
  anterior. O consumo de segmentos passou a ser limitado a 24 MiB e aguardado
  dentro do catch da requisicao, sem ponte Web-to-Node de lifetime independente.
  Teste de timeout passa; API permaneceu ativa durante o smoke final de videos.

## Operacao

Sem migration, push ou deploy. Ativacao exige launcher isolado de desenvolvimento
com allowlist da conta propria. Remover a instalacao da ponte reverte a previa.
O launcher da maquina continua responsavel por banco, certificados e providers
desabilitados. A ponte nao e substituto de homologacao de pagamento, envio de
mensagens ou edicao dos profissionais reais. Conferencia autenticada do proprio
perfil requer sessao Google do usuario; nao fabricar tokens ou cadastros.

ADR: 0568.
