enum WebType {
  MC_AUTH = "mc_auth",
  TODO = "todo",
  OTHER = "other",
}

enum FlashLocalPath {
  AUTH = 'auth',
  MESSAGES = 'messages',
  ERRORS = 'errors',
  NON_PATH = 'non-path',
}

enum FlashLocalVal {
  DEFAULT_UNDEFINED, DEFAULT_EMPTY,
}

type FlashRequire = FlashLocalVal | any;

interface FlashParams {
  [key: string]: FlashRequire;
}
export {
  WebType,
  FlashRequire,
  FlashParams,
  FlashLocalVal,
  FlashLocalPath,
}
