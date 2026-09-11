# Auditoria — fila de achados e decisões

Não é aprovação para produção. “Fonte” significa mecanismo identificado no código,
não exploração ou incidente observado no ambiente publicado. A lista de correções
já realizadas permanece em [Acompanhamento](AUDITORIA-2026-09-10.md).

## Admin

| ID | Pendência | Evidência / estado |
|---|---|---|
| A342-01 | Upload de avatar pode apagar texto ainda não salvo da comunidade. | Fonte; validar ciclo RHF/refetch e corrigir. |
| A342-02 | Reordenação de regras não possui alternativa por teclado. | Fonte; corrigir mantendo persistência e bloqueios. |
| A342-03 | Editar data incompleta removia os próprios filtros. | Corrigido344; repetido no Admin publicado. |
| A342-04 | Busca perde foco após atualizar a URL. | Pacientes reproduzido343 e psicólogos344; correção compartilhada em curso345. |
| A342-05 | Expansor de campo profissional e setas de publicações sem nome acessível. | Fonte; corrigir e conferir teclado/SSR. |
| A342-06 | Contador de cliques de Posts inclui cliques das Respostas. | Fonte; separar universos. |
| A342-07 | Cores de donut e legenda divergem quando há categorias zeradas. | Fonte; manter cor estável por categoria. |
| A342-08 | Menu mobile permite Tab para conteúdo atrás do modal. | Fonte; confirmar Browser e corrigir contenção de foco. |
| A342-09 | Métrica agrupada herda detalhes apenas da primeira origem. | Fonte; agregar detalhes coerentemente com o total. |

## Backend

| ID | Pendência | Evidência / estado |
|---|---|---|
| C17-A | Confirmação não aplica toda a compatibilidade/inequivocidade documentada. | Fonte; P2 proposto. Definir desambiguação antes de criar bloqueio mais amplo. Não é KYC/IDOR comprovado. |
| C17-B | Confirmação por outro caminho pode substituir CPF/CRP protegido. | Fonte; P2 proposto. Preservar trava transacional e idempotência sem revogar aprovações existentes. |
| C20 | Normalização estrutural deve evitar acesso a propriedades herdadas. | Fonte; impacto HTTP não comprovado. Nenhum teste/receita de exploração executado. Restrições operacionais anteriores permanecem. |
| C9/C10 | Decisões concorrentes de moderação podem reutilizar contador/snapshot antigo. | Fonte; planejar escrita atômica e coerência da auditoria, sem remover conteúdo real para testar. |
| C12 | Edição parcial pode regravar campos omitidos a partir de snapshot antigo. | Fonte; persistir apenas mudanças pretendidas e validar concorrência. |
| C13 | Campo chamado cpf_masked retornava todos os dígitos. | Fonte; correção local345 reutiliza máscara efetiva. Endpoint é administrativo; nenhum vazamento público demonstrado. |
| C15 | Numerador e denominador de taxa de ação usam conjuntos diferentes de sessões. | Fonte; uniformizar universo, não apenas limitar percentual. |
| C4 | Zero eventos no período pode virar contagem acumulada de comentários/salvamentos. | Fonte; confirmar semântica e usar fallback coerente. |
| C5 | Atividade pode incluir publicações anteriores ao intervalo. | Fonte; separar histórico de tráfego e atividade do período. |
| C6 | Views por conteúdo podem incluir visitas ao perfil. | Fonte; filtrar pelo alvo correto preservando atribuição histórica. |
| C18 | Limite de consultas CFP não reserva a tentativa antes do efeito externo. | Fonte; tratar concorrência sem chamadas pagas de teste. |
| C16 | Despublicação de perfil impede remover a própria relação de follow. | Fonte; separar criar vínculo de remover vínculo próprio. |
| C24 | Data de registro de hoje pode ser recusada pela manhã. | Fonte; comparar datas civis no fuso contratado, não horário artificial. |

## Hipóteses que exigem rastreio antes de mudar regras

- Universo histórico de membros, origem de tráfego, coortes e scores (C1/C2/C7/C8/C11).
- Fuso horário de gráficos (C3), precedência de evidência manual (C14), confirmação legada de telefone (C19).
- Validação genérica de CPF e limites zero/falsy (C21/C22): provar consumidor ativo.
- Métricas de mentoria e filtros de eventos próprios no ranking (C23/C25).
- Sucesso parcial de mutations encadeadas, idiomas, fallback de slices e listas administrativas.

### Decisões CFP ainda necessárias

O contrato atual aprova o registro profissional; prova de titularidade/KYC não está especificada.
Definir promessa do selo, desambiguação de múltiplos registros, garantia dos filtros do provider
e precedência de reconfirmação frente à decisão humana. Nome editável não comprova identidade.
Não é necessário introduzir KYC para corrigir a sobrescrita de campos já protegidos (C17-B).

## Dependências de conclusão

- Documentos legais aprovados e links acessíveis no cadastro.
- Completar leitura dos arquivos restantes e fluxos funcionais ainda não executados.
- Testes Safari/iOS/Android reais e integrações autorizadas de pagamento, identidade e vídeo.
- Rotacionar credenciais de auditoria ao final; não copiar senhas ou tokens para estes documentos.

Fontes e rastreio: relatórios laterais e hashes citados em
[Evidências](AUDITORIA-2026-09-10-EVIDENCIAS.md) e
[Leituras](AUDITORIA-2026-09-11-LEITURAS.tsv). Prioridades podem mudar após reprodução.
