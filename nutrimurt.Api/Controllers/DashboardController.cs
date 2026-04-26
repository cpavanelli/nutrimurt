using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Extensions;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private const int RecentLimit = 5;

    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> GetDashboard()
    {
        var userId = User.GetUserId();

        var activePatients = await _context.Patients
            .CountAsync(p => p.UserId == userId);

        var answeredQuestionnaires = await _context.PatientLinks
            .CountAsync(l => l.UserId == userId
                && l.Type == PatientLinkTypes.Question
                && l.LastAnswered != null);

        var recordedDiaries = await _context.PatientLinks
            .CountAsync(l => l.UserId == userId
                && l.Type == PatientLinkTypes.Diary
                && l.LastAnswered != null);

        var recentPatients = await _context.Patients
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(RecentLimit)
            .ToListAsync();

        var recentQuestionnaireLinks = await _context.PatientLinks.AsNoTracking()
            .Where(l => l.UserId == userId
                && l.Type == PatientLinkTypes.Question
                && l.LastAnswered != null)
            .OrderByDescending(l => l.LastAnswered)
            .Take(RecentLimit)
            .Select(l => new DashboardLinkDto(
                l.Id,
                l.PatientId,
                l.UrlId,
                l.Type,
                l.QuestionnaryId,
                l.DiaryId,
                l.Questionnary != null ? l.Questionnary.Name : null,
                null,
                l.Patient != null ? l.Patient.Name : null,
                l.LastAnswered.HasValue
                    ? l.LastAnswered.Value.ToString("dd/MM/yyyy HH:mm")
                    : null
            ))
            .ToListAsync();

        var recentDiaryLinks = await _context.PatientLinks.AsNoTracking()
            .Where(l => l.UserId == userId
                && l.Type == PatientLinkTypes.Diary
                && l.LastAnswered != null)
            .OrderByDescending(l => l.LastAnswered)
            .Take(RecentLimit)
            .Select(l => new DashboardLinkDto(
                l.Id,
                l.PatientId,
                l.UrlId,
                l.Type,
                l.QuestionnaryId,
                l.DiaryId,
                null,
                l.Diary != null ? l.Diary.Name : null,
                l.Patient != null ? l.Patient.Name : null,
                l.LastAnswered.HasValue
                    ? l.LastAnswered.Value.ToString("dd/MM/yyyy HH:mm")
                    : null
            ))
            .ToListAsync();

        return Ok(new DashboardResponse(
            new DashboardStats(activePatients, answeredQuestionnaires, recordedDiaries),
            recentPatients.Select(ToDto),
            recentQuestionnaireLinks,
            recentDiaryLinks
        ));
    }

    private static RecentPatientDto ToDto(Patient patient) =>
        new(
            patient.Id,
            patient.Name,
            patient.Email
        );
}

public record DashboardResponse(
    DashboardStats Stats,
    IEnumerable<RecentPatientDto> RecentPatients,
    IEnumerable<DashboardLinkDto> RecentlyAnsweredQuestionnaires,
    IEnumerable<DashboardLinkDto> RecentlyAnsweredDiaries
);

public record DashboardStats(
    int ActivePatients,
    int AnsweredQuestionnaires,
    int RecordedDiaries
);

public record DashboardLinkDto(
    int Id,
    int PatientId,
    string UrlId,
    PatientLinkTypes Type,
    int? QuestionnaryId,
    int? DiaryId,
    string? QuestionnaryName,
    string? DiaryName,
    string? PatientName,
    string? LastAnswered
);

public record RecentPatientDto(
    int Id,
    string Name,
    string Email
);
