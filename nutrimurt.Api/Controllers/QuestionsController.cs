// nutrimurt.Api/Controllers/QuestionsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController : ControllerBase
{
    private readonly AppDbContext _context;
    public QuestionsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Question>>> GetQuestions() =>
        await _context.Questions.ToListAsync();

    [HttpGet("{id}")]
    public async Task<ActionResult<Question>> GetQuestion(int id)
    {
        var question = await _context.Questions
        .Include(q => q.Alternatives)
        .FirstOrDefaultAsync(q => q.Id == id);
        return question is null ? NotFound() : question;
    }

    [HttpPost]
    public async Task<ActionResult<Question>> CreateQuestion(Question question)
    {
        _context.Questions.Add(question);

        foreach (var alternative in question.Alternatives)
            _context.QuestionAlternatives.Add(alternative);

        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetQuestion), new { id = question.Id }, question);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestion(int id, Question updated)
    {
        if (id != updated.Id) return BadRequest();

        var existing = await _context.Questions
                             .Include(q => q.Alternatives)
                             .FirstOrDefaultAsync(q => q.Id == id);

        if (existing is null) return NotFound();

        existing.QuestionText = updated.QuestionText;
        existing.QuestionType = updated.QuestionType;

        UpdateAlternatives(existing, updated);

        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Questions.Any(q => q.Id == id)) return NotFound();
            throw;
        }

        return NoContent();
    }

    private void UpdateAlternatives(Question existing, Question updated)
    {
        var incomingAlternatives = updated.Alternatives ?? new();
        var keptIds = incomingAlternatives.Where(a => a.Id != 0)
                                          .Select(a => a.Id)
                                          .ToHashSet();

        var toRemove = existing.Alternatives
                               .Where(a => !keptIds.Contains(a.Id))
                               .ToList();
        foreach (var alternative in toRemove)
            _context.QuestionAlternatives.Remove(alternative);

        foreach (var alternative in incomingAlternatives)
        {
            if (alternative.Id == 0)
            {
                existing.Alternatives.Add(new QuestionAlternatives
                {
                    Alternative = alternative.Alternative
                });
                continue;
            }

            var tracked = existing.Alternatives
                                  .First(a => a.Id == alternative.Id);
            tracked.Alternative = alternative.Alternative;
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestion(int id)
    {

        var question = await _context.Questions.FindAsync(id);
        if (question is null) return NotFound();

        foreach (var alternative in question.Alternatives)
        {
            var alt = await _context.QuestionAlternatives.FindAsync(alternative.Id);
            if (alt != null)
                _context.QuestionAlternatives.Remove(alt);
        }

        _context.Questions.Remove(question);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
