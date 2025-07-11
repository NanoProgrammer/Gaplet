import { UserProvider } from '../../context/UserContext';

export default function RootLayout({ children }) {
  return (
        <UserProvider>{children}</UserProvider>
  );
}