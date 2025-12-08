namespace nutrimurt.Api.Validation;
using System.Security.Cryptography;

public static class IDGeneration
{
    public static string GenerateUrlId()
    {
        var bytes = RandomNumberGenerator.GetBytes(16);
        var id = Convert.ToHexString(bytes).ToLower();
        return id;
    }
}