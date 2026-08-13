type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

const PERMISSION_CODES = new Set(["42501", "PGRST301"]);
const SCHEMA_CODES = new Set(["42P01", "42703", "42883", "PGRST202", "PGRST204"]);

export function actionErrorMessage(
  error: DatabaseErrorLike | null | undefined,
  fallback: string,
  permissionMessage = "You don’t have permission to complete this action."
): string {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();

  if (
    PERMISSION_CODES.has(code) ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized") ||
    message.includes("not_authorized")
  ) {
    return permissionMessage;
  }

  if (
    SCHEMA_CODES.has(code) ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  ) {
    return "Causey needs a database update before this action is available.";
  }

  return fallback;
}
