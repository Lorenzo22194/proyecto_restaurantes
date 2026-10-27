"use client";

// Cliente de autenticación para componentes de navegador. Es la única pieza de Identity que puede
// importarse desde el cliente (excepción explícita en .dependency-cruiser.cjs).
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
