# prismabox
Generate versatile [typebox](https://github.com/sinclairzx81/typebox) schemes from your [prisma](https://github.com/prisma) schema.

Install it in your project,
```bash
npm i -D prismabox
pnpm i -D prismabox
bun add -D prismabox
```

 then add
```prisma
generator prismabox {
  provider = "prismabox"
  // you can optionally specify the output location. Defaults to ./prismabox
  output = "./myCoolPrismaboxDirectory"
  // if you want, you can customize the imported variable name that is used for the schemes. Defaults to "Type" which is what the standard typebox package offers
  typeboxImportVariableName = "t"
  // you also can specify the dependency from which the above import should happen. This is useful if a package re-exports the typebox package and you would like to use that
  typeboxImportDependencyName = "elysia"
  // by default the generated schemes do not allow additional properties. You can allow them by setting this to true
  additionalProperties = true
  // optionally enable the data model generation. See the data model section below for more info
  inputModel = true
}
```
to your `prisma.schema`. You can modify the settings to your liking, please see the respective comments for info on what the option does.
> There are additional config options available which are mostly irrelevant to the average user. Please see [config.ts](src/config.ts) for all available options.

## Annotations
Prismabox offers annotations to adjust the output of models and fields.

| Annotation | Example | Description |
---|---|---
| @prismabox.hide | - | Hides the field or model from the output |
| @prismabox.hidden | - | Alias for @prismabox.hide |
| @prismabox.input.hide | - | Hides the field or model from the output only in the input model |
| @prismabox.create.input.hide | - | Hides the field or model from the outputs only in the input create model|
| @prismabox.update.input.hide | - | Hides the field or model from the outputs only in the input update model|
| @prismabox.options | @prismabox.options{ min: 10, max: 20 } | Uses the provided options for the field or model in the generated schema. Be careful to use valid JS/TS syntax! |
| @prismabox.typeOverwrite | @prismabox.typeOverwrite=Type.CustomName | Overwrite the type prismabox outputs for a field with a custom string. See [m1212e/prismabox#29](https://github.com/m1212e/prismabox/issues/29) for an extended usecase |

> For a more detailed list of available annotations, please see [annotations.ts](src/annotations/annotations.ts)

A schema using annotations could look like this:
```prisma
/// The post model
model Post {
  id        Int      @id @default(autoincrement())
  /// @prismabox.hidden
  createdAt DateTime @default(now())
  title     String   @unique

  User   User? @relation(fields: [userId], references: [id])
  /// @prismabox.options{max: 10}
  /// this is the user id
  userId Int?
}

/// @prismabox.hidden
enum Account {
  PASSKEY
  PASSWORD
}

```
> Please note that you cannot use multiple annotations in one line! Each needs to be in its own!
## Generated Schemes
The generator will output schema objects based on the models:
```ts
// the plain object without any relations
export const PostPlain = ...

// only the relations of a model
export const PostRelations = ...

// a composite model of the two, providing the full type
export const Post = ...

// a schema for validating the prisma where input for this model
export const PostWhere = ...

// a schema for validating the prisma unique where input for this model
export const PostWhereUnique = ...

// a schema for validating the prisma order by input for this model
export const PostOrderBy = ...

// a schema for validating the prisma include input for this model
export const PostInclude = ...

// a schema for validating the prisma select input for this model
export const PostSelect = ...
```

### Input models
To simplify the validation of input data, prismabox is able to generate schemes specifically for input data.
These are called "InputModels" and need to be explicitly enabled in the generator settings (`inputModel = true`) because they expect some conventions/field naming patterns to work properly.
> If you want to see the specifics on how the model behaves, see [here](src/generators/relations.ts) and [here](src/generators/plain.ts).

1. Foreign Ids need to end in Id (case is ignored, e.g. `userId` or `userid` will work)
2. createdAt will be detected and ignored if it follows exactly this pattern: `createdAt DateTime @default(now())`
3. updatedAt will be detected and ignored if it follows exactly this pattern: `updatedAt DateTime @updatedAt`
4. Hide annotations marked for imports (`@prismabox.input.hide`) are respected.

If enabled, the generator will additonally output more schemes for each model which can be used for creating/updating entities. The model will only allow editing fields of the entity itself. For relations, only connecting/disconnecting is allowed, but changing/creating related entities is not possible.
