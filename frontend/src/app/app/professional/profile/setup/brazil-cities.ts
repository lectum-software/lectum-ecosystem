import type { FieldOption } from "@/hooks/form";
import cityOptionsByState from "./brazil-cities.json";

// Lista oficial de municípios brasileiros consultada na API de Localidades do IBGE em 2026-06-08.
// Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome
export const CITY_OPTIONS_BY_STATE: Record<string, FieldOption[]> = cityOptionsByState;
