using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class PatientQuestionAnswerAlternative
{
    [Required]
    public int Id { get; set; }

    [Required]
    public int QuestionId { get; set; }

    [Required]
    public string Alternative { get; set; } = string.Empty;

    [Required]
    public int PatientLinkId { get; set; }

    [Required]
    public PatientLink? PatientLink { get; set; }

}