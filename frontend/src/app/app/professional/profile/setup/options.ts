import type { FieldOption } from "@/hooks/form";

export const CRP_REGION_OPTIONS = [
  { label: "1ª Região - DF", value: "1ª Região - DF" },
  { label: "2ª Região - PE", value: "2ª Região - PE" },
  { label: "3ª Região - BA", value: "3ª Região - BA" },
  { label: "4ª Região - MG", value: "4ª Região - MG" },
  { label: "5ª Região - RJ", value: "5ª Região - RJ" },
  { label: "6ª Região - SP", value: "6ª Região - SP" },
  { label: "7ª Região - RS", value: "7ª Região - RS" },
  { label: "8ª Região - PR", value: "8ª Região - PR" },
  { label: "9ª Região - GO", value: "9ª Região - GO" },
  { label: "10ª Região - PA/AP", value: "10ª Região - PA/AP" },
  { label: "11ª Região - CE", value: "11ª Região - CE" },
  { label: "12ª Região - SC", value: "12ª Região - SC" },
  { label: "13ª Região - PB", value: "13ª Região - PB" },
  { label: "14ª Região - MS", value: "14ª Região - MS" },
  { label: "15ª Região - AL", value: "15ª Região - AL" },
  { label: "16ª Região - ES", value: "16ª Região - ES" },
  { label: "17ª Região - RN", value: "17ª Região - RN" },
  { label: "18ª Região - MT", value: "18ª Região - MT" },
  { label: "19ª Região - SE", value: "19ª Região - SE" },
  { label: "20ª Região - AM/RR", value: "20ª Região - AM/RR" },
  { label: "21ª Região - PI", value: "21ª Região - PI" },
  { label: "22ª Região - MA", value: "22ª Região - MA" },
  { label: "23ª Região - TO", value: "23ª Região - TO" },
  { label: "24ª Região - AC/RO", value: "24ª Região - AC/RO" },
] satisfies FieldOption[];

export const GENDER_OPTIONS = [
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não informar", value: "nao_informar" },
] satisfies FieldOption[];

export const RACE_COLOR_OPTIONS = [
  { label: "Branca", value: "branca" },
  { label: "Preta", value: "preta" },
  { label: "Parda", value: "parda" },
  { label: "Amarela", value: "amarela" },
  { label: "Indígena", value: "indigena" },
  { label: "Prefiro não informar", value: "nao_informar" },
] satisfies FieldOption[];

export const RELIGION_OPTIONS = [
  { label: "Católica", value: "catolica" },
  { label: "Evangélica", value: "evangelica" },
  { label: "Espírita", value: "espirita" },
  { label: "Umbanda/Candomblé", value: "umbanda_candomble" },
  { label: "Judaica", value: "judaica" },
  { label: "Islâmica", value: "islamica" },
  { label: "Budista", value: "budista" },
  { label: "Sem religião", value: "sem_religiao" },
  { label: "Ateu/Agnóstico", value: "ateu_agnostico" },
  { label: "Outra", value: "outra" },
  { label: "Prefiro não informar", value: "nao_informar" },
] satisfies FieldOption[];

export const LANGUAGE_OPTIONS = [
  { label: "Português", value: "Português" },
  { label: "Inglês", value: "Inglês" },
  { label: "Espanhol", value: "Espanhol" },
  { label: "Francês", value: "Francês" },
  { label: "Italiano", value: "Italiano" },
] satisfies FieldOption[];

export const PUBLIC_TARGET_OPTIONS = [
  { label: "Crianças (até 11)", value: "criancas" },
  { label: "Adolescentes (12-17)", value: "adolescentes" },
  { label: "Adultos (18-59)", value: "adultos" },
  { label: "Idosos (60+)", value: "idosos" },
  { label: "Casais", value: "casais" },
  { label: "Famílias", value: "familias" },
  { label: "LGBTQIA+", value: "lgbtqia_plus" },
] satisfies FieldOption[];

export const MODALITY_OPTIONS = [
  { label: "Online", value: "online" },
  { label: "Presencial", value: "presencial" },
  { label: "Presencial e Online", value: "hibrido" },
] satisfies FieldOption[];

export const WEEKDAY_OPTIONS = [
  { label: "Segunda", value: "segunda" },
  { label: "Terça", value: "terca" },
  { label: "Quarta", value: "quarta" },
  { label: "Quinta", value: "quinta" },
  { label: "Sexta", value: "sexta" },
  { label: "Sábado", value: "sabado" },
  { label: "Domingo", value: "domingo" },
] satisfies FieldOption[];

export const STATE_OPTIONS = [
  { label: "Acre", value: "AC" },
  { label: "Alagoas", value: "AL" },
  { label: "Amapá", value: "AP" },
  { label: "Amazonas", value: "AM" },
  { label: "Bahia", value: "BA" },
  { label: "Ceará", value: "CE" },
  { label: "Distrito Federal", value: "DF" },
  { label: "Espírito Santo", value: "ES" },
  { label: "Goiás", value: "GO" },
  { label: "Maranhão", value: "MA" },
  { label: "Mato Grosso", value: "MT" },
  { label: "Mato Grosso do Sul", value: "MS" },
  { label: "Minas Gerais", value: "MG" },
  { label: "Pará", value: "PA" },
  { label: "Paraíba", value: "PB" },
  { label: "Paraná", value: "PR" },
  { label: "Pernambuco", value: "PE" },
  { label: "Piauí", value: "PI" },
  { label: "Rio de Janeiro", value: "RJ" },
  { label: "Rio Grande do Norte", value: "RN" },
  { label: "Rio Grande do Sul", value: "RS" },
  { label: "Rondônia", value: "RO" },
  { label: "Roraima", value: "RR" },
  { label: "Santa Catarina", value: "SC" },
  { label: "São Paulo", value: "SP" },
  { label: "Sergipe", value: "SE" },
  { label: "Tocantins", value: "TO" },
] satisfies FieldOption[];
