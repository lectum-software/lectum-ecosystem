# Notas de privacidade — localização aproximada por IP

## Texto sugerido para política de privacidade

A Lectum pode coletar automaticamente uma localização aproximada derivada do endereço IP do visitante ou usuário, como cidade, estado/UF e país. Essa informação é usada para fins estatísticos, segurança, melhoria da plataforma, entendimento de demanda regional e planejamento de novos recursos.

A Lectum não solicita permissão de GPS do navegador para essa finalidade, não coleta localização precisa em tempo real e não exibe essa informação ao usuário no produto. Quando provedores técnicos retornarem latitude ou longitude como parte da resposta de geolocalização por IP, esses dados são descartados antes de qualquer persistência.

A localização aproximada pode ser associada a um identificador anônimo de visitante ou sessão e, quando o usuário estiver autenticado, também ao identificador da conta para permitir análises agregadas e conversão por região. A coleta é limitada por frequência para evitar chamadas excessivas e reduzir dados redundantes.

## Escopo do MVP

- Fonte da localização: IP (`source = "ip"`).
- Dados persistidos: cidade, estado/UF, país, fonte, confiança quando disponível, provedor, visitor/session id e user id quando autenticado.
- Dados não persistidos: latitude, longitude e IP bruto.
- Sem geolocalização do navegador e sem solicitação de permissão ao usuário.
