using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class PatientQuestionAnswer
{
    [Required]
    public int Id { get; set; }

    [Required]
    public int QuestionId { get; set; }

    [Required]
    public string Answer { get; set; } = string.Empty;

    [Required]
    public int PatientLinkId { get; set; }

    [Required]
    public PatientLink? PatientLink { get; set; }

}