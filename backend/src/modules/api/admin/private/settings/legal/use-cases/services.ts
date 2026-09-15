import { LegalReadRepository } from "@/modules/legal/repositories/LegalReadRepository";
import { LegalWriteRepository } from "@/modules/legal/repositories/LegalWriteRepository";
import type { LegalAdminDTO } from "../DTOs";

const read = new LegalReadRepository();
const write = new LegalWriteRepository();
export const list = (d: LegalAdminDTO) => read.list(d.q.page ?? 1);
export const detail = (d: LegalAdminDTO) => read.detail(d.p.id);
export const create = (d: LegalAdminDTO) => write.create(d.admin.id, d.b);
export const edit = (d: LegalAdminDTO) => write.edit(d.admin.id, d.p.id, d.b);
export const duplicate = (d: LegalAdminDTO) => write.duplicate(d.admin.id, d.p.id);
export const publish = (d: LegalAdminDTO) =>
  write.publish(d.admin.id, d.p.id, d.b.revision, d.b.review_confirmed);
export const acceptances = (d: LegalAdminDTO) => read.acceptances(d.p.id, d.q.page ?? 1);
