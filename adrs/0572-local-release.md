# ADR-0572 - Promocao local sem builds intermediarios

## Status

Aceito.

## Contexto

Usuario autorizou publicar o lote local e confirmou salvamento e quatro
autodeploys Dokploy desligados. O bump comum nao deve reconstruir Backend/Video.
O check de tamanho falhava por card e suite de testes com mais de 700 linhas.

## Decisao

Manter gates existentes. Mover handlers de navegacao para o suporte do card e
dividir testes de apresentacao, sem remover assercoes ou aumentar o baseline.
Validar frontend e check geral antes de promover por PR homolog -> main.
Adicionar git.deploymentEnabled.homolog=false em frontend/admin para impedir
previews automaticos, sem desativar o deploy produtivo de main.
Nenhum token, dado local, arquivo MP4 ou helper de outputs entra no release.
Corrigir o transporte do teste de indisponibilidade do banco no Windows: porta
loopback efemera reservada e fechada antes do probe, em vez de caminho Unix que
pg interpreta como hostname DNS nesse SO. Preservar todos os asserts HTTP 503,
sanitizacao e bibliotecas reais. Nenhuma mudanca no runtime de autenticacao.

## Consequencias

Backend/Video mantem versao anterior em runtime; nao ha mudanca funcional nesses
servicos. Deploy Vercel produtivo continua sendo acompanhado por status e smoke.
Preview de homolog deixa de ser gate; checks obrigatorios nunca sao ignorados.

Referencia: https://vercel.com/docs/project-configuration/git-configuration
