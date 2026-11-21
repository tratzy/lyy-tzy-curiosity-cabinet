// Username-only auth: the backend needs an email, so each username maps to a
// deterministic synthetic address that never receives mail.
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;
export const USERNAME_EMAIL_DOMAIN = "users.lyytzy.app";

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidUsername(input: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(input));
}

export function usernameToEmail(input: string): string {
  return `${normalizeUsername(input)}@${USERNAME_EMAIL_DOMAIN}`;
}
