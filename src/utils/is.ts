export function isUrl(str: string): boolean {
  const pattern = new RegExp(
    '^(https?:\\/\\/)' +
    '((([a-zA-Z0-9\\-]+\\.)+[a-zA-Z]{2,})|' +
    '((\\d{1,3}\\.){3}\\d{1,3}))' +
    '(\\:\\d+)?' +
    '(\\/[-a-zA-Z0-9@:%._\\+~#=]*)*' +
    '(\\?[;&a-zA-Z0-9@:%._\\+~#=-]*)?' +
    '(\\#[-a-zA-Z0-9@:%._\\+~#=]*)?$'
  );

  return pattern.test(str);
}
