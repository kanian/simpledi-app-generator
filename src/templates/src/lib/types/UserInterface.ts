export interface UserInterface {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: any;
  roles: any[];
  inviteCode?: string;
  // Add other fields as necessary
}
