# TASK-365 - Primeiro desenho do post

Relatorio mobile de 24/11/2026: LCP no paragrafo do post, CLS 0.106 na discussao
e avatares de 512px entregues sem otimizacao. Cores aprovadas nao podem mudar.
Builder indisponivel; referencia visual e relatorio enviados pelo usuario.

- [x] Limitar texto recolhido desde o HTML inicial, preservando expandir/recolher.
- [x] Reutilizar otimizacao HTTPS de avatares com fallback HTTP local.
- [x] Preservar cores, tipografia e layout final.
- [x] Validar testes, build e navegador local com dados reais.

Validacao: frontend check e build aprovados; guardas de ADRs, tarefas, fontes,
encoding, secrets e versao aprovadas. Chrome em 390px e 1440px sem erros;
expandir/recolher preserva altura. Clamp presente no HTML do servidor.
Avatares HTTP do proxy local mantem fallback; HTTPS coberto por regressao.
Versao 0.1.869, somente local, sem push ou deploy. Ganho PageSpeed nao medido.

Zoom, CSP e llms.txt ja possuem ajustes locais anteriores; sem duplicar alteracoes.
Contraste permanece pendente onde exige mudar cores. Nao publicar automaticamente.
