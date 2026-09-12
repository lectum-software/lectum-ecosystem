import { LegalReadRepository } from "@/modules/legal/repositories/LegalReadRepository";
export const current = () => new LegalReadRepository().current();
export const detail = (id: string) => new LegalReadRepository().publicDetail(id);
