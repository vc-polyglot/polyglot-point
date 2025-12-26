export const safeJsonParse = <T>(
  jsonString: string | null | undefined,
  defaultValue: T,
  context?: string
): T => {
  try {
    if (!jsonString || !jsonString.trim()) {
      if (context) {
        console.warn(`⚠️ Empty JSON string in ${context}`);
      }
      return defaultValue;
    }

    const result = JSON.parse(jsonString);

    if (process.env.NODE_ENV === "development" && context) {
      const preview =
        jsonString.length > 200 ? `${jsonString.substring(0, 200)}...` : jsonString;
      console.log(`✅ JSON parsed successfully in ${context}:`, preview);
    }

    return result as T;
  } catch (error) {
    const str = jsonString ?? "";
    const preview = str.length > 200 ? `${str.substring(0, 200)}...` : str;

    console.error(
      `❌ JSON parse error${context ? ` in ${context}` : ""}:`,
      error,
      "String length:",
      str.length,
      "Preview:",
      preview
    );
    return defaultValue;
  }
};
