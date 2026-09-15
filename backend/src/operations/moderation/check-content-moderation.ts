import { moderatePatientText } from "@/utils/content-moderation";

type Case = {
  expected: ReturnType<typeof moderatePatientText>["decision"];
  name: string;
  text: string;
};

const cases: Case[] = [
  {
    expected: "allow_sensitive",
    name: "relato de vício em pornografia não bloqueia",
    text: "Tenho vício em pornografia e quero parar",
  },
  {
    expected: "block",
    name: "URL externa bloqueia",
    text: "Vejam meu relato em https://example.com/fora-da-lectum",
  },
  {
    expected: "block",
    name: "solicitação sexual direta bloqueia",
    text: "Quem quer trocar nudes comigo? Me chama no privado",
  },
  {
    expected: "allow_sensitive",
    name: "termo sensível em relato terapêutico vira sensível",
    text: "Tenho pensado em suicídio, mas não tenho plano e preciso de ajuda",
  },
  {
    expected: "safety_hold",
    name: "intenção imediata de autolesão segura publicação",
    text: "Hoje eu vou me matar e já separei remédios",
  },
];

for (const item of cases) {
  const result = moderatePatientText({
    authorRole: "paciente",
    content: item.text,
    targetType: "post",
  });

  if (result.decision !== item.expected) {
    throw new Error(
      `[content-moderation] ${item.name}: esperado ${item.expected}, recebido ${result.decision} (${result.reasonCode})`,
    );
  }
}

console.log(`[content-moderation] ${cases.length} casos validados com sucesso.`);
