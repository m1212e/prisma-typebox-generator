import type { DMMF } from "@prisma/generator-helper";
import { extractAnnotations } from "../annotations/annotations";
import { generateTypeboxOptions } from "../annotations/options";
import { getConfig } from "../config";
import type { ProcessedModel } from "../model";
import { processedEnums } from "./enum";
import {
  type PrimitivePrismaFieldType,
  isPrimitivePrismaFieldType,
  stringifyPrimitiveType,
} from "./primitiveField";
import { wrapWithArray } from "./wrappers/array";
import { wrapWithNullable } from "./wrappers/nullable";
import { wrapWithOptional } from "./wrappers/optional";

export const processedComposites: ProcessedModel[] = [];

export function processComposites(
  types: DMMF.Model[] | Readonly<DMMF.Model[]>,
) {
  for (const t of types) {
    const o = stringifyComposite(t);
    if (o) {
      processedComposites.push({ name: t.name, stringRepresentation: o });
    }
  }
  Object.freeze(processedComposites);
}

export function stringifyComposite(
  data: DMMF.Model,
  isInputModelCreate = false,
  isInputModelUpdate = false,
) {
  const annotations = extractAnnotations(data.documentation);

  if (
    annotations.isHidden ||
    ((isInputModelCreate || isInputModelUpdate) && annotations.isHiddenInput) ||
    (isInputModelCreate && annotations.isHiddenInputCreate) ||
    (isInputModelUpdate && annotations.isHiddenInputUpdate)
  )
    return undefined;

  const fields = data.fields
    .map((field) => {
      let stringifiedType = `${getConfig().typeboxImportVariableName}.Object({
      })`;

      if (isPrimitivePrismaFieldType(field.type)) {
        stringifiedType = stringifyPrimitiveType({
          fieldType: field.type as PrimitivePrismaFieldType,
          options: generateTypeboxOptions({ input: annotations }),
        });
      } else if (processedEnums.find((e) => e.name === field.type)) {
        // biome-ignore lint/style/noNonNullAssertion: we checked this manually
        stringifiedType = processedEnums.find(
          (e) => e.name === field.type,
        )!.stringRepresentation;
      }

      if (field.kind === "object") {
        stringifiedType = field.type;
      }

      return `${field.name}: ${stringifiedType}`;
    })
    .filter((x) => x) as string[];

  return `${getConfig().typeboxImportVariableName}.Object({${[
    ...fields,
    !(isInputModelCreate || isInputModelUpdate)
      ? (getConfig().additionalFieldsPlain ?? [])
      : [],
  ].join(",")}},${generateTypeboxOptions({ input: annotations })})\n`;
}
