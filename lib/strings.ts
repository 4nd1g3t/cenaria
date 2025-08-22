"use client";
import { useEffect } from "react";

export function ConsoleLog({ label, data }: { label: string; data: unknown }) {
  useEffect(() => {
    // Evita loggear secretos: tokens, claves, etc.
    console.log(`[${label}]`, data);
  }, [label, data]);
  return null;
}

export function normalizeName(input: string): string {
  if (!input) return "";
  const lower = input.toLowerCase().trim();
  // NFD + eliminar diacríticos
  return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}