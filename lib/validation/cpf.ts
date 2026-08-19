/** Validates a Brazilian CPF, accepting either punctuated or digit-only input. */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateDigit = (length: number) => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    Number(digits[9]) === calculateDigit(9) &&
    Number(digits[10]) === calculateDigit(10)
  );
}
