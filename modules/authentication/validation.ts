import { InvalidLoginInputError, type LoginCredentials } from "./domain";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLoginCredentials(input: unknown): LoginCredentials {
  if (!input || typeof input !== "object") {
    throw new InvalidLoginInputError("Email and password are required");
  }

  const candidate = input as Record<string, unknown>;
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const password = typeof candidate.password === "string" ? candidate.password : "";

  if (!email || !password) throw new InvalidLoginInputError("Email and password are required");
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new InvalidLoginInputError("Enter a valid email address");
  }
  if (password.length > 1024) throw new InvalidLoginInputError("Invalid login request");

  return { email, password };
}
