# ADR-0677 - Conclusao de assinatura, reproducao e encerramento imediato

## Status

Aceito para implementacao local em 2026-11-05. Publicacao nao autorizada neste lote.

## Contexto

TASK-316 separa cadastro inicial de upgrade, ajusta reproducao de videos e permite
interromper beneficios em casos administrativos excepcionais, sem executar estorno.

## Decisao

- Os convites de upgrade identificam explicitamente a intencao no checkout.
  A intencao e os beneficios anteriores ficam por conta na sessionStorage por 24h.
  Isso controla apenas apresentacao: a conclusao sempre reconsulta assinatura e
  requisitos no backend. Sem intencao valida, usa a conclusao do cadastro inicial.
- O autoplay centralizado exige 50% da capacidade visivel por 500ms. Para video
  maior que o viewport, a capacidade considera a area que cabe na tela. Pausa
  manual, perda de foco e modais prevalecem. Sem IntersectionObserver nao ha autoplay.
- Discussao e feed descobrem novos posts usando a paginacao existente, mantendo
  deduplicacao e permissoes. Perfil continua limitado ao proprio contexto. Se
  esgotar todo conteudo acessivel, termina sem repetir artificialmente os videos.
- Cancelamento administrativo sem modo continua preservando o periodo pago.
  O modo imediato exige id da assinatura, motivo e confirmacao ENCERRAR AGORA.
  Confirma cancelamento no gateway antes da transacao local; falha externa nao
  remove beneficios. A transacao encerra o periodo, restaura o plano gratuito
  quando aplicavel e grava ator, motivo e antes/depois. Nao chama estorno nem
  altera aprovacao de registro. A politica de cancelamento existente impede que
  notificacoes atrasadas restabelecam o periodo encerrado.
- Convites publicos usam descricao curta inclusiva, sem chamar todo usuario de paciente.

## Consequencias

Sem migrations, variaveis novas ou novos pacotes. Contrato aditivo permite rollout
em versoes diferentes. Emissao fiscal, Video e autodeploys ficam fora do escopo.
Builder indisponivel; usados componentes Lectum existentes e referencias locais.
Ver evidencias e limites de validacao na TASK-316.
