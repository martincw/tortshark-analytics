
export interface HyrosLead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  creationDate?: string;
  phoneNumbers?: string[];
  firstSource?: {
    id?: string;
    sourceLinkId?: string;
    [key: string]: any;
  };
  lastSource?: {
    id?: string;
    sourceLinkId?: string;
    [key: string]: any;
  };
  tags?: string[];
  [key: string]: any;
}
