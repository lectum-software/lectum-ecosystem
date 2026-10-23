import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = new URL(process.env.DATABASE_URL);
assert.equal(db.hostname, "127.0.0.1");
assert.equal(db.port, "55432");
assert.ok(["/lectum_whatsapp_dev_20261017", "/lectum_privacy_dev"].includes(db.pathname));
const { default: prisma } = await import("../src/infra/database/prisma/index.ts");
const { StoreRepository } = await import(
  "../src/modules/api/public/user/store/repositories/StoreRepository.ts"
);
const { LoginRepository } = await import(
  "../src/modules/api/public/auth/login/repositories/LoginRepository.ts"
);
const { ProfileRepository } = await import(
  "../src/modules/api/private/patient/profile/repositories/ProfileRepository.ts"
);
const emails = [];
try {
  for (const provider of ["email", "google"]) {
    for (const role of ["paciente", "psicologo"]) {
      const email = `birthdate-${randomUUID()}@example.invalid`;
      emails.push(email);
      const body = {
        name: "QA nascimento",
        email,
        role,
        provider,
        professional_first_name: role === "psicologo" ? "QA" : undefined,
        professional_last_name: role === "psicologo" ? "Local" : undefined,
        password: "test-only-not-a-real-password",
        password_confirm: "test-only-not-a-real-password",
        adult_confirmed: true,
        birthdate: "1990-04-03",
      };
      if (provider === "google") {
        delete body.password;
        delete body.password_confirm;
      }
      const repo = provider === "google" ? new LoginRepository() : new StoreRepository();
      const user = await repo.store({ b: body });
      const model = role === "paciente" ? prisma.patient_profile : prisma.psychologist_profile;
      const saved = await model.findUniqueOrThrow({ where: { user_id: user.id } });
      assert.equal(saved.birthdate.toISOString(), "1990-04-03T00:00:00.000Z");
      if (role === "paciente") {
        const profiles = new ProfileRepository();
        await profiles.update({
          auth: user,
          b: { name: user.name, birthdate: new Date("1991-05-06T00:00:00Z") },
        });
        await profiles.update({ auth: user, b: { name: user.name } });
        const edited = await model.findUniqueOrThrow({ where: { user_id: user.id } });
        assert.equal(edited.birthdate.toISOString(), "1991-05-06T00:00:00.000Z");
      }
      console.log("PASS real database birthdate persistence", provider, role);
      const invalidEmail = `birthdate-${randomUUID()}@example.invalid`;
      emails.push(invalidEmail);
      await assert.rejects(
        repo.store({ b: { ...body, email: invalidEmail, birthdate: "2020-01-01" } }),
      );
      assert.equal(await prisma.user.count({ where: { email: invalidEmail } }), 0);
    }
  }
} finally {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
}
