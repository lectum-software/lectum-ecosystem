# TASK-206 - Autoplay nas publicacoes do perfil

Dependencia: TASK-205 (Completed). Status: Completed.

## Escopo

Ligar os videos de posts e respostas nas publicacoes do perfil publico do
psicologo ao mesmo autoplay e preferencia de audio do feed/comunidade. Inclui
a previa de publicacoes na aba Sobre, que usa o mesmo card. Nao altera o
video de apresentacao nem o modo imersivo do diretorio de psicologos.

Arquitetura e PROTO-INVENTORY consultados. Referencia: captura enviada pelo
usuario em 01/10/2026 e componentes existentes. Sem nova composicao visual;
Builder indisponivel nesta sessao e desnecessario para o opt-in. Mobile-first.

## Criterios de aceite

- [x] Posts e respostas do perfil registrados no coordenador compartilhado.
- [x] Um video visivel por vez; pausa manual, modal, perda de foco e saida
  da tela obedecem as mesmas regras existentes.
- [x] Preferencia de volume explicita compartilhada; fallback mudo nao
  reativa audio sozinho, sem criar outra persistencia.
- [x] Caixinha Pergunta, controles, tela cheia e rastreamento preservados.
- [x] Regressao de integracao e suites existentes aprovadas.
- [x] Frontend check/build aprovados; smoke local executado e limitacao registrada.

## Validacao

Frontend check completo aprovado (um skip preexistente de symlink Windows),
incluindo fallback mudo e novo contrato de opt-in nos dois tipos de publicacao.
Build e guards de versao, ADRs, tasks, encoding, segredos, source-safety,
source-size e ciclos aprovados em 0.1.541. Aviso de cache webpack nao bloqueante.

Smoke local 390px: a pagina carrega, mas a API remota nao libera acesso da
origem localhost:3004; exibido o estado de erro existente, sem simulacao de
dados ou sessao. Validacao efetiva de playback mobile/desktop sera registrada
apos deploy em outputs/autoplay-perfil-0541.md. Antes da mudanca, em homolog,
primeira resposta de Ana Rubia carregava manualmente; duas outras midias ja
estavam indisponiveis, limitacao de dados externa a este opt-in.

## Deploy

ADR-0550. Somente frontend, sem API, migration, env ou dependencia nova.
Risco: maior consumo de video no perfil, igual ao feed. Rollback: remover
o opt-in em revisao posterior. Nenhuma acao manual de configuracao. Publicar
primeiro em homologacao; producao exige solicitacao explicita desta mudanca.
