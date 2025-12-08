using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Validation;

public class CPFAttribute : ValidationAttribute
{
    public CPFAttribute() : base("CPF inválido.") { }

    public override bool IsValid(object? value)
    {
        if (value is null)
            return true; // let [Required] handle nulls

        var digits = new string(value.ToString()!.Where(char.IsDigit).ToArray());
        if (digits.Length != 11 || digits.Distinct().Count() == 1)
            return false;

        var calculated = CalculateCheckDigits(digits);
        return digits[9] == calculated.first && digits[10] == calculated.second;
    }

    private static (char first, char second) CalculateCheckDigits(string digits)
    {
        int firstSum = 0;
        for (int i = 0; i < 9; i++)
            firstSum += (digits[i] - '0') * (10 - i);

        var firstDigit = GetDigit(firstSum);

        int secondSum = 0;
        for (int i = 0; i < 10; i++)
            secondSum += (digits[i] - '0') * (11 - i);

        var secondDigit = GetDigit(secondSum);
        return (firstDigit, secondDigit);
    }

    private static char GetDigit(int sum)
    {
        var remainder = sum % 11;
        var digit = remainder < 2 ? 0 : 11 - remainder;
        return (char)('0' + digit);
    }
}