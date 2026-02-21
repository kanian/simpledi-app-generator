import { v7 as randomUUIDv7 } from 'uuid';
import { type UserInterface } from '@root/core/user/baseZodUserSchema';
import { PhoneNumberTypeEnum } from '@root/lib/types/PhoneNumberTypeEnum';
import { UserRoleEnum } from '@root/lib/types/UserRoleEnum';

// We need to define the enum values manually since we can't import them directly as values easily in all contexts,
// or fetch from where they are defined if it's a drizzle enum object.
// Based on file reads:
// UserTypePgEnum: ['ADMIN', 'USER']
// UserRolePgEnum: ['ADMIN', 'AUTHOR', 'EDITOR', 'AUTHENTICATED']

export const getOneUserSignupData = (
  overrides: Partial<UserInterface> = {},
) => ({
  id: randomUUIDv7(),
  firstName: 'Test',
  lastName: 'User',
  email: `${randomUUIDv7()}@example.com`,
  password: 'password123',
  phoneNumber: {
    countryCode: '+1',
    number: '1234567890',
    type: PhoneNumberTypeEnum.MOBILE,
  },
  userType: 'USER' as const,
  role: UserRoleEnum.AUTHENTICATED,
  ...overrides,
});
