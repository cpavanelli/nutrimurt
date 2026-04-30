using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class PatientMealPlan
{
    [Required]
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    [Required]
    public int PatientId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public int TotalCals { get; set; }

    [Required]
    public DateOnly MealPlanDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<PatientMealPlanEntry> Entries { get; set; } = new();
}
