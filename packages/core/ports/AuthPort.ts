export interface AuthPort {
  getCurrentUserId(): Promise<string | null>;
}
