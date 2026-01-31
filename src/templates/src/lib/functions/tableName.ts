import type { TableNameToken } from '../types/TableNameToken';

export const tableName = (tableName: string): TableNameToken => {
  return tableName as TableNameToken;
};
