//@ts-nocheck

import fs from "node:fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

export const analyzeRoutesWithAST = (file) => {
  const routes = [];

  file.cases.forEach((item) => {
    const validatorPath = `${file.base}/${file.module}/${file.model}/${file.folder}/${item}/index.ts`;

    if (!fs.existsSync(validatorPath)) return;

    const code = fs.readFileSync(validatorPath, "utf-8");
    const ast = parse(code, { sourceType: "module", plugins: ["typescript"] });

    traverse(ast, {
      CallExpression(path) {
        const { node } = path;

        if (
          node.callee.object?.name === "routes" &&
          ["get", "post", "put", "delete"].includes(node.callee.property.name)
        ) {
          const method = node.callee.property.name.toUpperCase();
          const routePath = node.arguments[0].value;

          const middlewares = [];
          let uploadConfig = null;

          node.arguments.slice(1).forEach((arg) => {
            if (arg.type === "Identifier") {
              middlewares.push(arg.name);
            } else if (arg.type === "MemberExpression") {
              const objectName = arg.object.name;
              const propertyName = arg.property.name;
              middlewares.push(`${objectName}.${propertyName}`);
            } else if (arg.type === "CallExpression" && arg.callee.name === "up") {
              uploadConfig = arg.arguments[0];
            }
          });

          const uploads = [];
          if (uploadConfig && uploadConfig.type === "ObjectExpression") {
            let fieldsProperty = null;
            let singleProperty = null;
            let arrayProperty = null;
            let allowedProperty = null;
            let sizeProperty = null;

            uploadConfig.properties.forEach((prop) => {
              const propKey = prop.key.name;

              if (propKey === "fields") {
                fieldsProperty = prop.value;
              } else if (propKey === "single") {
                singleProperty = prop.value;
              } else if (propKey === "array") {
                arrayProperty = prop.value;
              } else if (propKey === "allowed") {
                allowedProperty = prop.value;
              } else if (propKey === "size") {
                sizeProperty = prop.value;
              }
            });

            let allowedFormats = [];
            let maxSize = null;

            if (allowedProperty?.type === "ArrayExpression" && allowedProperty.elements?.length) {
              allowedFormats = allowedProperty.elements.map((el) => el.value);
            }

            if (sizeProperty?.type === "NumericLiteral") {
              maxSize = sizeProperty.value;
            }

            const buildDescription = () => {
              const parts = [];
              if (allowedFormats.length) {
                parts.push(`Allowed: ${allowedFormats.join(", ")}`);
              }
              if (maxSize) {
                parts.push(`Max size: ${maxSize}MB`);
              }
              return parts.join(". ");
            };

            const description = buildDescription();

            if (fieldsProperty?.type === "ArrayExpression") {
              fieldsProperty.elements.forEach((element) => {
                let fieldName = "";
                if (element.type === "ObjectExpression") {
                  element.properties.forEach((p) => {
                    if (p.key.name === "name") {
                      fieldName = p.value.value;
                    }
                  });

                  uploads.push({
                    in: "formData",
                    name: fieldName,
                    required: false,
                    schema: {
                      type: "file",
                      format: "binary",
                    },
                    description,
                  });
                }
              });
            }

            if (singleProperty?.type === "StringLiteral") {
              uploads.push({
                in: "formData",
                name: singleProperty.value,
                required: false,
                schema: {
                  type: "file",
                  format: "binary",
                },
                description,
              });
            }

            if (arrayProperty?.type === "StringLiteral") {
              uploads.push({
                in: "formData",
                name: `${arrayProperty.value}[]`,
                required: false,
                schema: {
                  type: "array",
                  items: {
                    type: "file",
                    format: "binary",
                  },
                },
                description,
              });
            }
          }

          const validator = `${file.base}/${file.module}/${file.model}/${file.folder}/${item}/validator/index.ts`;

          const fullPath = `/${file.module}/${file.model}/${file.folder}/${item}${routePath}`;

          routes.push({
            tag: `[${file.module?.toUpperCase()}] - ${file.folder
              ?.replace("_", " ")
              .toUpperCase()}`,
            validator,
            path: fullPath,
            model: file.model,
            isPrivate: file.isPrivate,
            method,
            middlewares,
            uploads,
          });
        }
      },
    });
  });

  return routes;
};
