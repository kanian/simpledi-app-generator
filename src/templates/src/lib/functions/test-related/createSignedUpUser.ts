import { getOneUserSignupData } from './getOneUserSignupData';
import { AuthenticationUtils } from '@root/lib/AuthenticationUtils';
import type { UserRepository } from '@root/core/user/UserRepository';
import type { UserInterface } from '@root/core/user/baseZodUserSchema';
import type { TokenPayload } from '@root/lib/types';

const users: Partial<UserInterface>[] = [];

export const createOneSignedUpUser = async (
  userRepository: UserRepository,
  overrides: Partial<UserInterface> = {},
) => {
  const userData = getOneUserSignupData(overrides);
  userData.password = await AuthenticationUtils.hashPassword(
    userData.password as string,
  );

  const createdUser = await userRepository.create(userData as any);

  // We need to cast createdUser to UserInterface because repository might return something slightly different
  // or TypeScript might infer it differently, but for tests this is usually fine.
  const user = createdUser as UserInterface;

  const token = await AuthenticationUtils.generateToken(user);
  const payload = AuthenticationUtils.verifyToken(token) as TokenPayload;

  users.push(user);
  return { token, payload, user };
};

export const deleteCreatedSignedUsers = async (
  userRepository: UserRepository,
) => {
  // Check if delete method exists and accepts ID, assuming standard repository pattern
  // If delete is not implementing in repository yet, we might need to use DB directly or skip this.
  // Based on User.ts, we have a base repository.

  await Promise.all(
    users.map((user) =>
      user.id ? userRepository.delete(user.id) : Promise.resolve(),
    ),
  );
  users.length = 0;
};
