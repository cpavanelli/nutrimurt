using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public enum QuestionTypes
{
    ShortAnswer= 1,
    TrueFalse =2 ,
    MultipleChoice = 3
}

public class Question
{
    [Required]
    public int Id { get; set; }

    [Required]
    public string QuestionText { get; set; } = string.Empty;
    
    [Required]
    public QuestionTypes QuestionType { get; set; }

    public List<QuestionAlternatives> Alternatives { get; set; } = [];
}
