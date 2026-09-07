export const SANDBOX_ROLES = [
  "executive",
  "sales_manager",
  "warehouse_manager",
  "customer_support",
] as const;

export type SandboxRole = (typeof SANDBOX_ROLES)[number];

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: SandboxRole;
  roleLabel: string;
  organizationId: string;
  organizationName: string;
  permissions: string[];
}

export interface SandboxSession extends AuthenticatedUser {
  issuedAt: number;
  expiresAt: number;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidLoginInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLoginInputError";
  }
}
