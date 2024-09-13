import type { DMMF } from "@prisma/generator-helper";
import { extractAnnotations } from "../annotations/annotations";
import { generateTypeboxOptions } from "../annotations/options";
import { getConfig } from "../config";
import type { ProcessedModel } from "../model";
import { processedEnums } from "./enum";
import { isPrimitivePrismaFieldType } from "./primitiveField";
import { wrapWithArray } from "./wrappers/array";

export const processedRelationsInputCreate: ProcessedModel[] = [];

export function processRelationsInputCreate(
  models: DMMF.Model[] | Readonly<DMMF.Model[]>
) {
  for (const m of models) {
    const o = stringifyRelationsInputCreate(m, models);
    if (o) {
      processedRelationsInputCreate.push({
        name: m.name,
        stringRepresentation: o,
      });
    }
  }
  Object.freeze(processedRelationsInputCreate);
}

export function stringifyRelationsInputCreate(
  data: DMMF.Model,
  allModels: DMMF.Model[] | Readonly<DMMF.Model[]>
) {
  const annotations = extractAnnotations(data.documentation);
  if (
    annotations.isHidden ||
    annotations.isHiddenInput ||
    annotations.isHiddenInputCreate
  )
    return undefined;

  const fields = data.fields
    .map((field) => {
      const annotations = extractAnnotations(field.documentation);

      if (
        annotations.isHidden ||
        annotations.isHiddenInput ||
        annotations.isHiddenInputCreate ||
        isPrimitivePrismaFieldType(field.type) ||
        processedEnums.find((e) => e.name === field.type)
      ) {
        return undefined;
      }

      let typeboxIdType = "String";

      switch (
        allModels.find((m) => m.name === field.type)?.fields.find((f) => f.isId)
          ?.type
      ) {
        case "String":
          typeboxIdType = "String";
          break;
        case "Int":
          typeboxIdType = "Integer";
          break;
        case "BigInt":
          typeboxIdType = "Integer";
          break;
        default:
          throw new Error("Unsupported id type");
      }

      let connectString = `${getConfig().typeboxImportVariableName}.Object({
				id: ${
          getConfig().typeboxImportVariableName
        }.${typeboxIdType}(${generateTypeboxOptions({ input: annotations })}),
			},${generateTypeboxOptions({ input: annotations })})`;

      if (field.isList) {
        connectString = wrapWithArray(connectString);
      }

      let stringifiedType = `${getConfig().typeboxImportVariableName}.Object({
				connect: ${connectString},
			}, ${generateTypeboxOptions()})`;

      if (!field.isRequired || field.isList) {
        stringifiedType = `${
          getConfig().typeboxImportVariableName
        }.Optional(${stringifiedType})`;
      }

      return `${field.name}: ${stringifiedType}`;
    })
    .filter((x) => x) as string[];

  return `${getConfig().typeboxImportVariableName}.Object({${fields.join(
    ","
  )}},${generateTypeboxOptions({ input: annotations })})\n`;
}
