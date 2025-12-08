using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class PatientDiaryEntry
{
    [Required]
    public int Id { get; set; }

    [Required]
    public DateTime Time { get; set; }

    [Required]
    public string Food { get; set; } = string.Empty;

    [Required]
    public string Amount { get; set; } = string.Empty;
}
