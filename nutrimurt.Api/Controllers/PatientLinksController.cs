using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Extensions;
using nutrimurt.Api.Constants;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[Authorize]
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
        var userId = User.GetUserId();
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == patientId && p.UserId == userId);
        if (!patientExists) return NotFound();

        var links = await _context.PatientLinks
            .Where(l => l.PatientId == patientId && l.UserId == userId)
            .Include(l => l.Questionnary)
            .Include(l => l.Diary)
            .ToListAsync();

        return Ok(links.Select(ToDto));
    }

    [HttpPost("send")]
    public async Task<ActionResult<IEnumerable<PatientLinkDto>>> SendLink(int patientId, [FromBody] SendPatientLinkRequest request)
    {
        var userId = User.GetUserId();
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == patientId && p.UserId == userId);
        if (patient is null) return NotFound();

        var linkCount = await _context.PatientLinks.CountAsync(l => l.PatientId == patientId && l.UserId == userId);
        if (linkCount >= Guardrails.MaxLinksPerPatient)
            return Problem(detail: "Você atingiu o número máximo de links para este paciente.", statusCode: 409);

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
            UserId = userId,
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
            .Include(l => l.Diary)
            .ToListAsync();

        return Ok(updatedLinks.Select(ToDto));
    }

    [HttpDelete("{linkId}")]
    public async Task<IActionResult> DeleteLink(int patientId, int linkId)
    {
        var userId = User.GetUserId();
        var link = await _context.PatientLinks
            .FirstOrDefaultAsync(l => l.Id == linkId && l.PatientId == patientId && l.UserId == userId);

        if (link is null) return NotFound();

        if (link.DiaryId is int diaryId)
        {
            var diaryEntries = await _context.PatientDiaryEntries
                .Where(entry => EF.Property<int?>(entry, "PatientDiaryId") == diaryId)
                .ToListAsync();
            if (diaryEntries.Count > 0)
            {
                _context.PatientDiaryEntries.RemoveRange(diaryEntries);
            }

            var diary = await _context.PatientDiaries.FirstOrDefaultAsync(d => d.Id == diaryId);
            if (diary is not null)
            {
                _context.PatientDiaries.Remove(diary);
            }
        }

        var answers = await _context.PatientQuestionAnswers
            .Where(answer => answer.PatientLinkId == linkId)
            .ToListAsync();
        if (answers.Count > 0)
        {
            _context.PatientQuestionAnswers.RemoveRange(answers);
        }

        var alternatives = await _context.PatientQuestionAnswerAlternatives
            .Where(answer => answer.PatientLinkId == linkId)
            .ToListAsync();
        if (alternatives.Count > 0)
        {
            _context.PatientQuestionAnswerAlternatives.RemoveRange(alternatives);
        }

        _context.PatientLinks.Remove(link);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private string GenerateUrlId()
    {
        var bytes = RandomNumberGenerator.GetBytes(16);
        return Convert.ToHexString(bytes).ToLower();
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
