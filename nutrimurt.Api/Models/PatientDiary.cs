using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace nutrimurt.Api.Models;

public class PatientDiary
{
    [Required]
    public int Id { get; set; }

    [Required]
    [Column(TypeName = "CHAR(32)")]
    public string UrlId { get; set; } = string.Empty;

    [Required]
    public int PatientId { get; set; }

    public List<PatientDiaryEntry> Entries { get; set; } = new List<PatientDiaryEntry>();
}
