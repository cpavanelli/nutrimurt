using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class QuestionAlternatives
{
    [Required]
    public int Id { get; set; }

    [Required]
    [StringLength(500)]
    public string Alternative { get; set; } = string.Empty;

}
