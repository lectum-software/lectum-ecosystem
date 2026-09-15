// @ts-nocheck
// Compatibilidade: despacha refinements declarativos por chave em tempo de execução.

//Types
import type { RefinementCtx } from "zod";
//Utils
import r from "../conditions";

export const refinesServer = (cont: any, ctx: RefinementCtx, refines: any) => {
  refines.forEach((item: any) => {
    const act = r[item.type];
    if (!act) throw new Error(`Relação "${item.type}" não encontrada!`);
    act({ keys: item.keys, ctx, cont });
  });
};
