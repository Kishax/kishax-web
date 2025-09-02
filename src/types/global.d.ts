declare global {
  var otpResponses:
    | Map<
        string,
        {
          success: boolean;
          message: string;
          timestamp: number;
          received: boolean;
        }
      >
    | undefined;
}

export {};
