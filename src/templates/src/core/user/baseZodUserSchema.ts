import { z } from "zod";
import { baseZodSchema } from "@root/core/baseZodSchema";
import { AdminRoleEnum } from "@root/lib/types/AdminRoleEnum";
import { UserRoleEnum } from "@root/lib/types/UserRoleEnum";
import { phoneNumberSchema } from "@root/lib/schemas/phoneNumberSchema";

export const adminZodUserSchema = baseZodSchema.extend({
  email: z.string().email().optional(),
  password: z.string().optional(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phoneNumber: phoneNumberSchema.optional(),
  userType: z.literal('ADMIN'),
  role: z.nativeEnum(AdminRoleEnum),
});

export const userZodUserSchema = baseZodSchema.extend({
  email: z.string().email().optional(),
  password: z.string().optional(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phoneNumber: phoneNumberSchema.optional(),
  userType: z.literal('USER'),
  role: z.nativeEnum(UserRoleEnum),
});

export const baseZodUserSchema = z.discriminatedUnion('userType', [
  adminZodUserSchema,
  userZodUserSchema,
]);
export type UserInterface = z.infer<typeof baseZodUserSchema>;
