// context/UserContext.tsx
'use client'; // Si estás en app router de Next.js

import { createContext, useContext, useState, ReactNode } from 'react';

const UserContext = createContext({
  user: null,
  setUser: (user) => {},
});


export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
