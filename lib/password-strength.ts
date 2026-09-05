/**
 * Standard new-password bar: 8+ characters, mixed case, and a number
 * (or a long passphrase). Common / repeating strings stay weak.
 */

export const PASSWORD_HINT =
  "Use 8 or more characters with mixed case and a number.";

export const WEAK_PASSWORD_MESSAGE =
  "Choose a stronger password. Use 8 or more characters with mixed case and a number.";

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "abc12345",
  "abcdefgh",
  "abcdefg1",
  "letmein",
  "welcome",
  "welcome1",
  "iloveyou",
  "monkey",
  "dragon",
  "baseball",
  "football",
  "princess",
  "sunshine",
  "shadow",
  "master",
  "login",
  "admin",
  "admin123",
  "changeme",
  "secret",
  "trustno1",
  "11111111",
  "00000000",
  "aaaaaaaa",
  "causey",
  "causey123",
]);

export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordStrengthScore;
  label: "Weak" | "Fair" | "Good" | "Strong";
  acceptable: boolean;
};

function clampScore(value: number): PasswordStrengthScore {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

export function scorePassword(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Weak", acceptable: false };
  }

  const lower = password.toLowerCase();
  const common = COMMON_PASSWORDS.has(lower);
  const repeating = new Set(password).size < 4;
  const longEnough = password.length >= 8;
  const longer = password.length >= 12;
  const passphrase = password.length >= 15;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let points = 0;
  if (longEnough) points += 1;
  if (longer) points += 1;
  if (hasLower && hasUpper) points += 1;
  if (hasDigit) points += 1;
  if (hasSymbol) points += 1;

  if (!longEnough || common || repeating) {
    return { score: 1, label: "Weak", acceptable: false };
  }

  const score = clampScore(Math.min(4, points));
  const acceptable = score >= 3 || passphrase;
  const label =
    score >= 4 ? "Strong" : score === 3 || passphrase ? "Good" : "Fair";

  return {
    score: acceptable && score < 3 ? 3 : score,
    label,
    acceptable,
  };
}

export function isPasswordAcceptable(password: string): boolean {
  return scorePassword(password).acceptable;
}
