export interface AuthContextType {
  isAuthenticated: boolean;
  token: string;
  username: string;
  login: (token: string, username: string) => void;
  logout: () => void;
}

//authModel.tsx
export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedirectClose: () => void;
  onSuccess: (token: string, username: string) => void;
}

// Define error types based on the backend response structure
export interface FormErrors {
  [key: string]: string | string[];
}
