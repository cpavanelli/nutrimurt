using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class PatientMealPlanEntry
{
    [Required]
    public int Id { get; set; }

    [Required]
    public int PatientMealPlanId { get; set; }

    [Required]
    public MealType MealType { get; set; }

    [Required]
    public string Food { get; set; } = string.Empty;

    [Required]
    public string Amount { get; set; } = string.Empty;

    public bool Substitution { get; set; }
}
