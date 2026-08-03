/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    userId: number | null;
    user: { id: number; email: string; name: string | null; token_version: number } | null;
  }
}
