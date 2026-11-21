# TASK-334 - Diagnostico privado da cadeia de proxies

| Campo | Valor |
| --- | --- |
| Status | Em andamento |

Publicar um diagnostico administrativo sem IPs, cookies ou tokens na resposta para observar a selecao de req.ip antes de habilitar metadados de rede na medicao.

- [x] Rota protegida pelo adminAuth canonico.
- [x] Comparacoes e contagem apenas; resposta privada sem cache.
- [x] Testes HTTP de trust 1/2, headers invalidos e rejeicao sem sessao.
- [ ] Validar o checkout isolado e publicar PR revisado.
- [ ] Consultar em producao com sessao administrativa existente.

O resultado nao autentica cabecalhos nem autoriza alterar TRUST_PROXY. Nenhuma migracao, dependencia ou ativacao Meta integra este lote. O proprietario confirmou previews/homolog frontend/admin desligados; backend/video homolog ja desativados no fluxo local-producao. O workflow do router Cloudflare nao e afetado pelos caminhos deste lote.

Runbook: [consulta privada](proxy-diagnostic-runbook.txt). Decisao: ADR-0699.
Rollback: reverter a rota e sua montagem por PR; nenhuma alteracao de dados.
A validacao isolada encontrou falha preexistente dos testes Glob em Windows. Incluida somente normalizacao de separadores nos tres testes de dependencias (backend/admin/frontend), mantendo versoes e assercoes. Nenhuma dependencia foi alterada.
