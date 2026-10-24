import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPsychologistsKeys } from "@/api/cache/keys";
import {
  type FiscalIdentityInput,
  getFiscalIdentity,
  saveFiscalIdentity,
} from "@/api/req/psychologists/fiscal-identity";

const key = (id: string) => [...adminPsychologistsKeys.registryVerification(id), "fiscal-identity"];
export const useFiscalIdentity = (id: string) =>
  useQuery({
    queryKey: key(id),
    queryFn: () => getFiscalIdentity(id),
    enabled: Boolean(id),
  });
export function useSaveFiscalIdentity(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: FiscalIdentityInput) => saveFiscalIdentity(id, input),
    onSuccess: async (data) => {
      client.setQueryData(key(id), data);
      await client.invalidateQueries({ queryKey: adminPsychologistsKeys.registryVerification(id) });
    },
  });
}
