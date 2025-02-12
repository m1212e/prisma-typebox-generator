import type { DMMF } from "@prisma/generator-helper";
import {
  extractAnnotations,
  isTypeOverwriteVariant,
} from "../annotations/annotations";
import { generateTypeboxOptions } from "../annotations/options";
import { getConfig } from "../config";
import type { ProcessedModel } from "../model";
import { processedComposites } from "./composite";
import { processedEnums } from "./enum";
import {
  type PrimitivePrismaFieldType,
  isPrimitivePrismaFieldType,
  stringifyPrimitiveType,
} from "./primitiveField";
import { wrapWithArray } from "./wrappers/array";
import { wrapWithNullable } from "./wrappers/nullable";
import { wrapWithOptional } from "./wrappers/optional";

export const processedPlain: ProcessedModel[] = [];

export function processPlain(models: DMMF.Model[] | Readonly<DMMF.Model[]>) {
  for (const m of models) {
    const o = stringifyPlain(m);
    if (o) {
      processedPlain.push({ name: m.name, stringRepresentation: o });
    }
  }
  Object.freeze(processedPlain);
}

export function stringifyPlain(
  data: DMMF.Model,
  isInputModelCreate = false,
  isInputModelUpdate = false
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
      const annotations = extractAnnotations(field.documentation);
      if (
        annotations.isHidden ||
        ((isInputModelCreate || isInputModelUpdate) &&
          annotations.isHiddenInput) ||
        (isInputModelCreate && annotations.isHiddenInputCreate) ||
        (isInputModelUpdate && annotations.isHiddenInputUpdate)
      )
        return undefined;

      // ===============================
      // INPUT MODEL FILTERS
      // ===============================
      // if we generate an input model we want to omit certain fields

      if (
        getConfig().ignoreIdOnInputModel &&
        (isInputModelCreate || isInputModelUpdate) &&
        field.isId
      )
        return undefined;
      if (
        getConfig().ignoreCreatedAtOnInputModel &&
        (isInputModelCreate || isInputModelUpdate) &&
        field.name === "createdAt" &&
        field.hasDefaultValue
      )
        return undefined;
      if (
        getConfig().ignoreUpdatedAtOnInputModel &&
        (isInputModelCreate || isInputModelUpdate) &&
        field.isUpdatedAt
      )
        return undefined;

      if (
        (isInputModelCreate || isInputModelUpdate) &&
        (field.name.toLowerCase().endsWith("id") ||
          field.name.toLowerCase().endsWith("foreign") ||
          field.name.toLowerCase().endsWith("foreignkey"))
      ) {
        return undefined;
      }

      // ===============================
      // INPUT MODEL FILTERS END
      // ===============================

      let stringifiedType = "";

      if (isPrimitivePrismaFieldType(field.type)) {
        const overwrittenType = annotations.annotations
          .filter(isTypeOverwriteVariant)
          .at(0)?.value;

        if (overwrittenType) {
          stringifiedType = overwrittenType;
        } else {
          stringifiedType = stringifyPrimitiveType({
            fieldType: field.type as PrimitivePrismaFieldType,
            options: generateTypeboxOptions({ input: annotations }),
          });
        }
      } else if (processedEnums.find((e) => e.name === field.type)) {
        // biome-ignore lint/style/noNonNullAssertion: we checked this manually
        stringifiedType = processedEnums.find(
          (e) => e.name === field.type
        )!.stringRepresentation;
      } else if (processedComposites.find((c) => c.name === field.type)) {
        // biome-ignore lint/style/noNonNullAssertion: we checked this manually
        stringifiedType = processedComposites.find(
          (c) => c.name === field.type,
        )!.stringRepresentation;
      } else {
        return undefined;
      }

      if (field.isList) {
        stringifiedType = wrapWithArray(stringifiedType);
      }

      let madeOptional = false;

      if (!field.isRequired) {
        stringifiedType = wrapWithNullable(stringifiedType);
      }

      if (isInputModelUpdate || (isInputModelCreate && !field.isRequired && !field.hasDefaultValue)) {
        stringifiedType = wrapWithOptional(stringifiedType);
        madeOptional = true;
      }

      if (
        !madeOptional &&
        field.hasDefaultValue &&
        (isInputModelCreate || isInputModelUpdate)
      ) {
        stringifiedType = wrapWithOptional(stringifiedType);
        madeOptional = true;
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
