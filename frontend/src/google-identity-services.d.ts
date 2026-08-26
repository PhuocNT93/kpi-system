interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (configuration: { client_id: string; callback: (response: { credential: string }) => void; hosted_domain: string }) => void;
        prompt: () => void;
      };
    };
  };
}