import { z } from 'zod';
import { PhoneNumberTypeEnum } from '../types/PhoneNumberTypeEnum';

export const phoneNumberSchema = z.object({
  countryCode: z.string(),
  number: z.string(),
  type: z.nativeEnum(PhoneNumberTypeEnum),
});

