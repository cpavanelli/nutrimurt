using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace nutrimurt.Api.Models;

public class PatientDiary
{
    [Required]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; }

    public List<PatientDiaryEntry> Entries { get; set; } = new List<PatientDiaryEntry>();
}
