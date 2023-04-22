export type Server = {
  id: string;
  update_url: string;
  adv_url: string;
  cps: string;
  channel_id: number;
  subchannel_id: number;
  removed: {
    file: string;
    tag?: string;
  }[];
  product_name: string;
  executable: string;
  dataDir: string;
  THE_REAL_COMPANY_NAME: string;
  added: {
    file: string;
    url: string;
  }[];
  patched: {
    file: string;
    diffUrl: string;
    tag?: string;
  }[];
  hosts: string; // ?
};
