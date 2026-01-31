import { pgTable } from 'drizzle-orm/pg-core';
import type { TableNameToken } from '../types/TableNameToken';
import { baseSchema } from '@root/core/baseSchema';

export const withBaseSchema = <T>(
  tableName: TableNameToken | string,
  schemaObj: T,
  extraConfig?: any,
  baseSchemaOverrides: any = {},
) => {
  let _baseSchema = { ...baseSchema };
  const overridesKeys: string[] = Object.keys(baseSchemaOverrides);
  const baseSchemaKeys: string[] = Object.keys(baseSchema);
  overridesKeys.forEach((key) => {
    if (baseSchemaKeys.includes(key)) {
      _baseSchema = {
        ..._baseSchema,
        [key]: baseSchemaOverrides[key],
      };
    }
  });
  return pgTable(
    tableName,
    {
      ...schemaObj,
      ..._baseSchema,
    },
    extraConfig,
  );
};
