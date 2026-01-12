"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type SignUpModalContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SignUpModalContext = createContext<SignUpModalContextType | undefined>(
  undefined
);

export function SignUpModalProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SignUpModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SignUpModalContext.Provider>
  );
}

export function useSignUpModal(): SignUpModalContextType {
  const context = useContext(SignUpModalContext);
  if (context === undefined) {
    throw new Error("useSignUpModal must be used within SignUpModalProvider");
  }
  return context;
}

