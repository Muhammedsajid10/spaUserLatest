import React, { createContext, useContext, useState } from "react";

const HeaderTitleContext = createContext();
export const useHeaderTitle = () => useContext(HeaderTitleContext);

export const HeaderTitleProvider = ({ children }) => {
  const [headerTitle, setHeaderTitle] = useState("");
  return (
    <HeaderTitleContext.Provider value={{ headerTitle, setHeaderTitle }}>
      {children}
    </HeaderTitleContext.Provider>
  );
}; 