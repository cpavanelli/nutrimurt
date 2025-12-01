using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class Questionnaries
{
    [Required]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public List<Question> Questions { get; set; } = new();
}
