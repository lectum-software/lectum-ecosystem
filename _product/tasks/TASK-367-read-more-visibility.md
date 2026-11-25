# TASK-367 - Visibilidade do ver mais

Corrigir regressao do limite CSS introduzido na TASK-365, preservando cores e estrutura.

- [x] Limitar linhas no HTML inicial antes da medicao.
- [x] Remover o limite CSS depois da medicao, evitando cortar o botao inline.
- [x] Testar textos curtos, longos e multiline em 320, 375, 390, 430, 768 e 1440px.
- [x] Verificar expandir e recolher com o componente React real no Chrome isolado.
- [x] Concluir check e build do frontend.

Referencia visual: capturas enviadas pelo usuario, sem redesenho. Builder indisponivel.
Teste isolado: frontend/scripts/inline-expandable-browser.mjs; PLAYWRIGHT_MODULE pode apontar para o runtime instalado.
Sem backend, banco, push ou deploy. Safari/iPhone fisico permanece pendente.
