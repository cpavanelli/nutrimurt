using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PatientsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Patient>>> GetPatients()
    {
        return await _context.Patients.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Patient>> GetPatient(int id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient == null)
            return NotFound();

        return patient;
    }

    [HttpGet("/api/patients/getWithAll/{id}")]
    public async Task<ActionResult<Patient>> GetPatientWithAll(int id)
    {
        var patient = await _context.Patients
        .AsNoTracking()
        .Where(p => p.Id == id)
        .Select(p => new PatientWithAllDto(
            p.Id,
            p.Name,
            p.Email,
            p.Phone,
            p.CPF,
            p.Birth,
            p.Weight,
            p.Height,
            p.CreatedAt,
            p.PatientLinks.Select(l => new PatientLinkWithQuestionaryDto(
                l.Id,
                l.UrlId,
                l.Type,
                l.QuestionnaryId,
                l.Questionnary != null ? l.Questionnary.Name : null,
                l.LastAnswered
            )).ToList()
        ))
        .FirstOrDefaultAsync();

        if (patient is null) return NotFound();
        return Ok(patient);
    }

    [HttpGet("/api/patients/recent")]
    public async Task<ActionResult<IEnumerable<Patient>>> GetRecentPatients()
    {
        var patients = await _context.Patients
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Ok(patients);
    }

    [HttpPost]
    public async Task<ActionResult<Patient>> CreatePatient(Patient patient)
    {
        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPatient), new { id = patient.Id }, patient);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePatient(int id, Patient updated)
    {
        if (id != updated.Id)
            return BadRequest();

        _context.Entry(updated).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Patients.Any(p => p.Id == id))
                return NotFound();

            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePatient(int id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient == null)
            return NotFound();

        _context.Patients.Remove(patient);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public record PatientWithAllDto(
    int Id,
    string Name,
    string Email,
    string Phone,
    string CPF,
    DateOnly? Birth,
    int Weight,
    int Height,
    DateTime CreatedAt,
    List<PatientLinkWithQuestionaryDto> PatientLinks
);

public record PatientLinkWithQuestionaryDto(
    int Id,
    string UrlId,
    PatientLinkTypes Type,
    int QuestionnaryId,
    string? QuestionnaryName,
    DateTime? LastAnswered
);
