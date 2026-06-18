import type { TFunction } from "i18next";

export function alertServerError(t: TFunction, err: { message?: string }): void {
  const message = err.message?.trim();
  alert(message ? t("errors.serverError", { message }) : t("errors.generic"));
}
