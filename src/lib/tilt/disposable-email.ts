import isDisposableEmailLibrary from "is-disposable-email";

export const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isDisposableEmail(email: string): boolean {
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return false;
  }

  const domain = email.slice(atIndex + 1).toLowerCase();
  return isDisposableEmailLibrary(`local@${domain}`);
}
