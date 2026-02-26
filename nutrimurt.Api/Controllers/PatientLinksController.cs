using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[ApiController]
[Route("api/patients/{patientId}/links")]
public class PatientLinksController : ControllerBase
{
    private readonly AppDbContext _context;
    public PatientLinksController(AppDbContext context) => _context = context;

    public record PatientLinkDto(
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

    public class SendPatientLinkRequest
    {
        public PatientLinkTypes Type { get; set; }
        public int? QuestionnaryId { get; set; }
        public string? DiaryName { get; set; }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientLinkDto>>> GetLinks(int patientId)
    {
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == patientId);
        if (!patientExists) return NotFound();

        var links = await _context.PatientLinks
            .Where(l => l.PatientId == patientId)
            .Include(l => l.Questionnary)
            .ToListAsync();

        return Ok(links.Select(ToDto));
    }

    [HttpGet("/api/patient-links/recent")]
    public async Task<ActionResult<IEnumerable<PatientLinkDto>>> GetRecentPatientLinks()
    {
        var links = await _context.PatientLinks
            .Include(l => l.Questionnary)
            .Include(l => l.Diary)
            .Include(l => l.Patient)
            .OrderByDescending(l => l.LastAnswered)
            .Where(l => l.LastAnswered != null)
            .Take(100)
            .ToListAsync();

        return Ok(links.Select(ToDto));
    }

    [HttpPost("send")]
    public async Task<ActionResult<IEnumerable<PatientLinkDto>>> SendLink(int patientId, [FromBody] SendPatientLinkRequest request)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        if (patient is null) return NotFound();

        if (request.Type == PatientLinkTypes.Question && request.QuestionnaryId.GetValueOrDefault() <= 0)
        {
            ModelState.AddModelError(nameof(request.QuestionnaryId), "Escolha um questionario.");
            return ValidationProblem(ModelState);
        }

        if (request.Type == PatientLinkTypes.Diary && string.IsNullOrWhiteSpace(request.DiaryName))
        {
            ModelState.AddModelError(nameof(request.DiaryName), "Escolha um nome para o diario.");
            return ValidationProblem(ModelState);
        }

        int? diaryId = null;
        if (request.Type == PatientLinkTypes.Diary)
        {
            var diary = new PatientDiary
            {
                Name = request.DiaryName!,
            };
            _context.PatientDiaries.Add(diary);
            await _context.SaveChangesAsync();
            diaryId = diary.Id;
        }


        var link = new PatientLink
        {
            PatientId = patientId,
            UrlId = GenerateUrlId(),
            Type = request.Type,
            QuestionnaryId = request.Type == PatientLinkTypes.Question ? request.QuestionnaryId : null,
            DiaryId = request.Type == PatientLinkTypes.Diary ? diaryId : null
        };

        _context.PatientLinks.Add(link);
        await _context.SaveChangesAsync();

        var updatedLinks = await _context.PatientLinks
            .Where(l => l.PatientId == patientId && l.Id == link.Id)
            .Include(l => l.Questionnary)
            .ToListAsync();

        return Ok(updatedLinks.Select(ToDto));
    }

    private string GenerateUrlId()
    {
        var bytes = RandomNumberGenerator.GetBytes(16);
        return Convert.ToHexString(bytes).ToLower();  // 32 chars
    }

    private static PatientLinkDto ToDto(PatientLink link) =>
        new(
            link.Id,
            link.PatientId,
            link.UrlId,
            link.Type,
            link.QuestionnaryId,
            link.DiaryId,
            link.Questionnary?.Name,
            link.Diary?.Name,
            link.Patient?.Name,
            link.LastAnswered?.ToString("dd/MM/yyyy HH:mm")
        );
}
