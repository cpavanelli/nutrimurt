using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using nutrimurt.Api.Validation;

namespace nutrimurt.Api.Models;

public enum PatientLinkTypes
{
    Question= 1,
    Diary =2 
}

public class PatientLink
{
    [Required]
    public int Id { get; set; }
    public int PatientId { get; set; }

    [Required]
    [Column(TypeName = "CHAR(32)")]
    public string UrlId { get; set; } = string.Empty;
    public Patient? Patient { get; set; }

    [Required]
    public PatientLinkTypes Type { get; set; }

    [Required]
    public int QuestionnaryId { get; set; }
    public Questionnaries? Questionnary { get; set; }

    public int? DiaryId { get; set; }
    public DateTime? LastAnswered { get; set; }
}
