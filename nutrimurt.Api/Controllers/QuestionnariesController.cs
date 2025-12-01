// nutrimurt.Api/Controllers/QuestionnariesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionnariesController : ControllerBase
{
    private readonly AppDbContext _context;
    public QuestionnariesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Questionnaries>>> GetQuestionnaries() =>
        await _context.Questionnaries.Include(q => q.Questions).ToListAsync();

    [HttpGet("{id}")]
    public async Task<ActionResult<Questionnaries>> GetQuestionnarie(int id)
    {
        var questionnarie = await _context.Questionnaries
                                          .Include(q => q.Questions)
                                          .FirstOrDefaultAsync(q => q.Id == id);
        return questionnarie is null ? NotFound() : questionnarie;
    }

    [HttpPost]
    public async Task<ActionResult<Questionnaries>> CreateQuestionnarie(Questionnaries questionnarie)
    {
        _context.Questionnaries.Add(questionnarie);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetQuestionnarie), new { id = questionnarie.Id }, questionnarie);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestionnarie(int id, Questionnaries updated)
    {
        if (id != updated.Id) return BadRequest();

        var existing = await _context.Questionnaries
            .Include(q => q.Questions)
                .ThenInclude(q => q.Alternatives)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (existing is null) return NotFound();

        existing.Name = updated.Name;

        SyncQuestions(existing, updated);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestionnarie(int id)
    {
        var questionnarie = await _context.Questionnaries
                                          .Include(q => q.Questions)
                                          .FirstOrDefaultAsync(q => q.Id == id);
        if (questionnarie is null) return NotFound();

        // Ensure associated questions disappear with the questionnaire
        _context.Questions.RemoveRange(questionnarie.Questions);
        _context.Questionnaries.Remove(questionnarie);
        await _context.SaveChangesAsync();

        return NoContent();
    }


    private void SyncQuestions(Questionnaries existing, Questionnaries updated)
    {
        var incoming = updated.Questions ?? new();
        var incomingIds = incoming.Where(q => q.Id != 0).Select(q => q.Id).ToHashSet();

        // remove deleted questions (+ their alternatives)
        var toRemove = existing.Questions.Where(q => !incomingIds.Contains(q.Id)).ToList();
        foreach (var q in toRemove)
        {
            _context.QuestionAlternatives.RemoveRange(q.Alternatives);
            _context.Questions.Remove(q);
        }

        foreach (var q in incoming)
        {
            if (q.Id == 0)
            {
                existing.Questions.Add(new Question
                {
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    Alternatives = q.Alternatives?.Select(a => new QuestionAlternatives
                    {
                        Alternative = a.Alternative
                    }).ToList() ?? new()
                });
                continue;
            }

            var tracked = existing.Questions.First(x => x.Id == q.Id);
            tracked.QuestionText = q.QuestionText;
            tracked.QuestionType = q.QuestionType;
            SyncAlternatives(tracked, q);
        }
    }

    private void SyncAlternatives(Question tracked, Question incoming)
    {
        var incomingAlts = incoming.Alternatives ?? new();
        var keepIds = incomingAlts.Where(a => a.Id != 0).Select(a => a.Id).ToHashSet();

        var toRemove = tracked.Alternatives.Where(a => !keepIds.Contains(a.Id)).ToList();
        foreach (var alt in toRemove) _context.QuestionAlternatives.Remove(alt);

        foreach (var alt in incomingAlts)
        {
            if (alt.Id == 0)
            {
                tracked.Alternatives.Add(new QuestionAlternatives { Alternative = alt.Alternative });
            }
            else
            {
                var trackedAlt = tracked.Alternatives.First(a => a.Id == alt.Id);
                trackedAlt.Alternative = alt.Alternative;
            }
        }
    }
}
