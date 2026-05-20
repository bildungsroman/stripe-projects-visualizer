export interface StateJson {
  version: number;
  providers: Record<string, { name: string }>;
  resources: Record<
    string,
    {
      name: string;
      providerName: string;
      serviceId: string;
    }
  >;
}
