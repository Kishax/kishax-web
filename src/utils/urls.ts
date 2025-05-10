const isUrl = (str: string): boolean => {
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

const isHttps = (str: string): boolean => {
  if (!isUrl(str)) return false;
  return str.startsWith('https://');
}

const extractHost = (url: string): string | null => {
  if (!isUrl(url)) return null;

  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return null;
  }
}

const extractHostWithPort = (url: string): string | null => {
  if (!isUrl(url)) return null;

  try {
    const { host } = new URL(url);
    return host;
  } catch {
    return null;
  }
}

const extractWebSocketHostWithPort = (url: string): string | null => {
  if (!/^wss?:\/\//.test(url)) return null;

  try {
    const { host } = new URL(url);
    return host;
  } catch {
    return null;
  }
}

export {
  isUrl,
  isHttps,
  extractHost,
  extractHostWithPort,
  extractWebSocketHostWithPort
}
