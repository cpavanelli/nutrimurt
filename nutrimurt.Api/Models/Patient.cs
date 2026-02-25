using System.ComponentModel.DataAnnotations;
using nutrimurt.Api.Validation;

namespace nutrimurt.Api.Models;

public class Patient
{
    [Required]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [RegularExpression(@"^\(\d{2}\)\d{5}-\d{4}$",
    ErrorMessage = "O telefone deve estar no formato (11)11111-1111")]
    [Required]
    public string Phone { get; set; } = string.Empty;

    [Required, CPF]
    public string CPF { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateOnly? Birth { get; set; }
    public int Weight { get; set; }
    public int Height { get; set; }

    [Required]
    public List<PatientLink> PatientLinks { get; set; } = new();
    
}
