export interface BaseEntityInterface {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deleted: boolean;
  createdBy: string | null;
  updatedBy: string | null;
}
