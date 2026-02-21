import type { z } from 'zod';
import type { phoneNumberSchema } from '../schemas/phoneNumberSchema';

export type PhoneNumberInterface = z.infer<typeof phoneNumberSchema>;
