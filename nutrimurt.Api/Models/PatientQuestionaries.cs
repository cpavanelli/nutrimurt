using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace nutrimurt.Api.Models;

public class PatientQuestionary
{
    [Required]
    public int Id { get; set; }

    [Required]
    [Column(TypeName = "CHAR(32)")]
    public string UrlId { get; set; } = string.Empty;

    [Required]
    public int PatientId { get; set; }

    [Required]
    public int QuestionnaryId { get; set; }

    public List<PatientQuestionAnswer> Answers { get; set; } = new List<PatientQuestionAnswer>();
}
