import { InvalidCredentialsError, type AuthenticatedUser, type LoginCredentials } from "./domain";
import { authenticateSandboxUser } from "./sandbox-users";

export async function authenticateWithPassword(
  credentials: LoginCredentials
): Promise<AuthenticatedUser> {
  const user = authenticateSandboxUser(credentials.email, credentials.password);
  if (!user) throw new InvalidCredentialsError();
  return user;
}
