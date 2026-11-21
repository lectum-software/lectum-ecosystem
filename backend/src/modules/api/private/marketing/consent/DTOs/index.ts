export type ConsentDTO = {
  auth: { id: string };
  b: {
    accepted: true;
    document_version: string;
    expected_revision: number;
    campaigns?: Record<string, string>;
    guest_token?: string;
    authorize_transfer?: true;
  };
};
