
// Type definitions for Asaas SDK
declare global {
  interface Window {
    Asaas: {
      CreditCard: {
        createToken: (
          cardData: {
            number: string;
            expiryMonth: string;
            expiryYear: string;
            ccv: string;
            holderName: string;
          },
          successCallback: (token: string) => void,
          errorCallback: (error: any) => void
        ) => void;
      };
    };
  }
}

export {};
