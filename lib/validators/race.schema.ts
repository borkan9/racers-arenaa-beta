export function validate<T>(
  schema: z.ZodSchema<T>,
  input:  unknown,
): { success: true; data: T; error?: never } | { success: false; error: string; data?: never } {
  const result = schema.safeParse(input);

  if (!result.success) {
    const firstError = result.error.errors[0];
    const message    = firstError
      ? `${firstError.path.join(".")}: ${firstError.message}`
      : "Invalid input.";
    return { success: false, error: message };
  }

  return { success: true, data: result.data };
}