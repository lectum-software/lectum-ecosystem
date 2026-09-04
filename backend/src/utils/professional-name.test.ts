import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
  normalizeProfessionalNamePart,
} from "./professional-name";
import { buildLectumWhatsappUrl } from "./whatsapp-contact";

describe("professional name normalization", () => {
  it("remove titulos profissionais do campo de nome profissional persistido", () => {
    assert.equal(normalizeProfessionalNamePart("Psicóloga Rafaela"), "Rafaela");
    assert.equal(normalizeProfessionalNamePart("Dra. Ana Rúbia"), "Ana Rúbia");
    assert.equal(normalizeProfessionalNamePart("Psi - Camila"), "Camila");
  });

  it("monta nome publico e saudacao de WhatsApp sem prefixo profissional", () => {
    const displayName = buildProfessionalFullDisplayName({
      fallbackName: "Psicóloga Rafaela Gomes Geraldo",
      firstName: "Psicóloga Rafaela",
      lastName: "Gomes Geraldo",
    });
    const whatsappName = getProfessionalWhatsappDisplayName({
      fallbackName: displayName,
      firstName: "Psicóloga Rafaela",
    });
    const url = buildLectumWhatsappUrl({
      phone: "+5511999999999",
      psychologistName: displayName,
      psychologistWhatsappName: whatsappName,
      source: "profile",
    });
    const message = url ? new URL(url).searchParams.get("text") : null;

    assert.equal(displayName, "Rafaela Gomes Geraldo");
    assert.equal(whatsappName, "Rafaela");
    assert.equal(
      message,
      "Olá Rafaela, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.",
    );
  });
});
