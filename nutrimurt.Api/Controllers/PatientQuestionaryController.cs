// nutrimurt.Api/Controllers/QuestionsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientQuestionaryController : ControllerBase
{
    private readonly AppDbContext _context;
    public PatientQuestionaryController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientQuestionary>>> GetPatientQuestionaries() =>
        await _context.PatientQuestionaries.ToListAsync();
    [HttpGet("{id}")]
    public async Task<ActionResult<PatientQuestionary>> GetPatientQuestionary(int id)
    {
        var questionary = await _context.PatientQuestionaries
                                        .Include(a => a.Answers)
                                        .FirstOrDefaultAsync(q => q.Id == id);
                            
        return questionary is null ? NotFound() : questionary;
    }

    [HttpPost]
    public async Task<ActionResult<PatientQuestionary>> CreatePatientQuestionary(PatientQuestionary questionary)
    {
        _context.PatientQuestionaries.Add(questionary);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPatientQuestionary), new { id = questionary.Id }, questionary);
    }
}