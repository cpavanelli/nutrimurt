using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public enum MealType
{
    CafeDaManha = 1,
    Almoco = 2,
    CafeDaTarde = 3,
    Jantar = 4,
    Lanche = 5
}

public class PatientDiaryEntry
{
    [Required]
    public int Id { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Required]
    public MealType MealType { get; set; }

    public DateTime? Time { get; set; }

    [Required]
    public string Food { get; set; } = string.Empty;

    [Required]
    public string Amount { get; set; } = string.Empty;
}
