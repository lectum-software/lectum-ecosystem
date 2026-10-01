# ADR-0550 - Autoplay compartilhado nas publicacoes do perfil

Status: Accepted
Data: 2026-10-01
Task: TASK-206

## Contexto

Os cards do perfil usavam CommunityMediaBlock sem habilitar o coordenador de
autoplay utilizado pelo feed/comunidade. Posts e respostas exigiam play manual.
O usuario solicitou paridade, incluindo a regra de volume explicito.

## Decisao

Habilitar enableCommunityAutoplay quando profilePublicationMode estiver ativo.
O bloco de midia ja resolve tanto o post quanto a resposta principal do perfil.
Reutilizar useCommunityVideoAutoplay sem novos listeners, estado de volume,
persistencia, thresholds ou chamadas diretas a play no perfil.

O coordenador seleciona um video elegivel (visibilidade minima de 58%), pausa
os demais, respeita pausa manual, suspensao por modal e atencao do documento,
e remove o registro ao desmontar. A preferencia explicita de som e o fallback
mudo da ADR-0545 sao os mesmos entre as superficies.

Mantidos analytics, caixinha de pergunta, fullscreen e controles. Imagens nao
participam do autoplay. Outros consumidores do card mantem opt-in desativado.
O video de apresentacao e o diretorio imersivo nao fazem parte deste ajuste.

## Consequencias e rollout

Sem duplicacao de politica de audio ou reproducao e sem mudanca de layout.
Pode aumentar consumo de midia no perfil. Sem dependencia, contrato, banco ou
env nova. Frontend publicado em homologacao antes de promover por PR revisado.
Rollback por reversao do opt-in. Teste de contrato protege os dois tipos de
publicacao e suite compartilhada protege fallback e consentimento de volume.
