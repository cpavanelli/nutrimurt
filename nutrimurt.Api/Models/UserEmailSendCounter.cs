using System.ComponentModel.DataAnnotations;

namespace nutrimurt.Api.Models;

public class UserEmailSendCounter
{
    [Key]
    public string UserId { get; set; } = string.Empty;

    public DateOnly WindowDate { get; set; }

    public int SendCount { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
