//Numbers

//Booleans
import boolean from "./functions/boolean";
import cep from "./functions/cep";
import cnpj from "./functions/cnpj";

//Strings
import cpf from "./functions/cpf";
//Dates
import date from "./functions/date";
import email from "./functions/email";
import enumeric from "./functions/enum";
//Null
import nullish from "./functions/null";
import numeric from "./functions/number";
import password from "./functions/password";
import phone from "./functions/phone";
//Prisma
import prisma from "./functions/prisma";
import string from "./functions/string";
//Array
import string_array from "./functions/string_array";
import year from "./functions/year";

export const f = {
  //Numbers
  year,
  numeric,

  //Strings
  cpf,
  cep,
  cnpj,
  email,
  phone,
  string,
  enumeric,
  password,

  //Date
  date,

  //Booleans
  boolean,

  //Null
  nullish,

  //Array
  string_array,

  //Prisma
  prisma,
};
