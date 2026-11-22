# ADR-0709 — Consentimento anterior ao cadastro profissional Google

O formulário profissional omitia o token autorizado de visitante e as etapas de preparação e leitura do state aceitavam apenas pacientes. Reutilizamos a referência cifrada, vinculada ao navegador e com prazo original, para ambos os papéis no cadastro Google. O vínculo é consumido somente na transação de criação da conta, com consentimento válido e anterior ao cadastro; login existente não o consome.

A associação existente passa a admitir psicólogos exclusivamente no provedor Google e exige a versão documental da política de cadastro profissional. Preserva a data real do aceite e o identificador de navegador, e chama registrationConsentLinked para criar o evento profissional com identidade estável. Pacientes mantêm seu evento e cadastro manual mantém seu escopo atual. Termos não substituem consentimento de medição. Não reconstruímos vínculos ausentes nem reenviamos cadastros antigos.

Validar com PostgreSQL descartável local, sem transmissão externa: consumo único, prazo e revogação, evidência de entrega profissional e regressão dos pacientes. State cifrado deve manter a referência nas duas etapas e rejeitar troca de navegador.
