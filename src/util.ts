/**
 * A valid password has at least 8 characters and contains letters and numbers.
 * This is required for PCI compliance through Stripe.
 */
export const isValidPassword = (password: string) => {
  if (!password) return false;
  if (password.length < 8) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[a-z]/i.test(password)) return false;
  return true;
};