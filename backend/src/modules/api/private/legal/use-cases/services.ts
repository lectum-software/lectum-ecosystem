import { LegalReadRepository } from "@/modules/legal/repositories/LegalReadRepository";
import { LegalWriteRepository } from "@/modules/legal/repositories/LegalWriteRepository";
import type { LegalUserDTO } from "../DTOs";
export const status = (d: LegalUserDTO) => new LegalReadRepository().status(d.auth.id);
export const accept = (d: LegalUserDTO) => new LegalWriteRepository().accept(d.auth.id, d.b);
