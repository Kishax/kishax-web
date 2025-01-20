export enum FlashLocalPath {
    AUTH = 'auth',
    MESSAGES = 'messages',
    ERRORS = 'errors',
    NON_PATH = 'non-path',
}

export enum FlashLocalVal {
    DEFAULT_UNDEFINED, DEFAULT_EMPTY,
}

export type FlashRequire = FlashLocalVal | any;

export interface FlashParams {
    [key: string]: FlashRequire;
}
