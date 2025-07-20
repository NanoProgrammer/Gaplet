'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext({
  user: null,
  setUser: (user) => {}, // ✅ acepta un argumento
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && refreshToken) {
      setUser({ accessToken, refreshToken });
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
