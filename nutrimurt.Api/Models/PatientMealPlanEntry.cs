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
    [StringLength(100)]
    public string Food { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string Amount { get; set; } = string.Empty;

    public bool Substitution { get; set; }

    public bool Substitution2 { get; set; }
}
