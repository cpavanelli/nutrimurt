using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Constants;
using nutrimurt.Api.Data;
using nutrimurt.Api.Extensions;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PatientMealPlansController : ControllerBase
{
    private readonly AppDbContext _context;

    public PatientMealPlansController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientMealPlanListDto>>> GetPatientMealPlans()
    {
        var userId = User.GetUserId();

        var mealPlans = await _context.PatientMealPlans
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Join(
                _context.Patients.Where(p => p.UserId == userId),
                mealPlan => mealPlan.PatientId,
                patient => patient.Id,
                (mealPlan, patient) => new {mealPlan, patient})
            .OrderByDescending(m => m.mealPlan.MealPlanDate)
            .Select(x => new PatientMealPlanListDto(
                x.mealPlan.Id,
                x.mealPlan.Name,
                x.patient.Id,
                x.patient.Name,
                x.mealPlan.MealPlanDate,
                x.mealPlan.TotalCals,
                x.mealPlan.CreatedAt))
            .ToListAsync();

        return Ok(mealPlans);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PatientMealPlanDetailDto>> GetPatientMealPlan(int id)
    {
        var userId = User.GetUserId();

        var mealPlan = await _context.PatientMealPlans
            .AsNoTracking()
             .Where(m => m.Id == id && m.UserId == userId)
        .Join(
            _context.Patients.AsNoTracking().Where(p => p.UserId == userId),
            mealPlan => mealPlan.PatientId,
            patient => patient.Id,
            (mealPlan, patient) => new PatientMealPlanDetailDto(
                mealPlan.Id,
                mealPlan.PatientId,
                patient.Name,
                patient.Weight,
                mealPlan.Name,
                mealPlan.TotalCals,
                mealPlan.MealPlanDate,
                mealPlan.CreatedAt,
                mealPlan.Entries
                    .Select(entry => new EntryDto(
                        entry.Id,
                        entry.MealType,
                        entry.Food,
                        entry.Amount,
                        entry.Substitution))
                    .ToList()))
        .FirstOrDefaultAsync();

        if (mealPlan is null)
            return NotFound();

        return Ok(mealPlan);
    }

    [HttpPost]
    public async Task<ActionResult<PatientMealPlanDetailDto>> CreatePatientMealPlan(PatientMealPlan mealPlan)
    {
        var userId = User.GetUserId();
        mealPlan.UserId = userId;

        var patientExists = await _context.Patients.AnyAsync(p => p.Id == mealPlan.PatientId && p.UserId == userId);
        if (!patientExists)
            return NotFound();

        var count = await _context.PatientMealPlans.CountAsync(m => m.UserId == userId);
        if (count >= Guardrails.MaxMealPlans)
            return Problem(detail: "VocÃª atingiu o nÃºmero mÃ¡ximo de planos alimentares.", statusCode: 409);

        if (mealPlan.Entries.Count > Guardrails.MaxMealPlanEntriesPerPlan)
            return Problem(detail: "VocÃª atingiu o nÃºmero mÃ¡ximo de entradas para este plano alimentar.", statusCode: 409);

        foreach (var entry in mealPlan.Entries)
        {
            entry.PatientMealPlanId = 0;
        }

        _context.PatientMealPlans.Add(mealPlan);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPatientMealPlan), new { id = mealPlan.Id }, await GetDetailDto(mealPlan.Id, userId));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePatientMealPlan(int id, PatientMealPlan updated)
    {
        if (id != updated.Id)
            return BadRequest();

        var userId = User.GetUserId();

        if (updated.Entries.Count > Guardrails.MaxMealPlanEntriesPerPlan)
            return Problem(detail: "Você atingiu o número máximo de entradas para este plano alimentar.", statusCode: 409);

        var patientExists = await _context.Patients.AnyAsync(p => p.Id == updated.PatientId && p.UserId == userId);
        if (!patientExists)
            return NotFound();

        var existing = await _context.PatientMealPlans
            .Include(m => m.Entries)
            .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);

        if (existing is null)
            return NotFound();

        existing.PatientId = updated.PatientId;
        existing.Name = updated.Name;
        existing.TotalCals = updated.TotalCals;
        existing.MealPlanDate = updated.MealPlanDate;

        _context.PatientMealPlanEntries.RemoveRange(existing.Entries);
        existing.Entries = updated.Entries.Select(entry => new PatientMealPlanEntry
        {
            MealType = entry.MealType,
            Food = entry.Food,
            Amount = entry.Amount,
            Substitution = entry.Substitution
        }).ToList();

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePatientMealPlan(int id)
    {
        var userId = User.GetUserId();
        var mealPlan = await _context.PatientMealPlans.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
        if (mealPlan is null)
            return NotFound();

        _context.PatientMealPlans.Remove(mealPlan);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<PatientMealPlanDetailDto?> GetDetailDto(int id, string userId)
    {
        return await _context.PatientMealPlans
            .AsNoTracking()
            .Where(m => m.Id == id && m.UserId == userId)
            .Select(m => new PatientMealPlanDetailDto(
                m.Id,
                m.PatientId,
                _context.Patients
                    .Where(p => p.Id == m.PatientId && p.UserId == userId)
                    .Select(p => p.Name)
                    .FirstOrDefault() ?? string.Empty,
                _context.Patients
                    .Where(p => p.Id == m.PatientId && p.UserId == userId)
                    .Select(p => p.Weight)
                    .FirstOrDefault(),
                m.Name,
                m.TotalCals,
                m.MealPlanDate,
                m.CreatedAt,
                m.Entries.Select(entry => new EntryDto(
                    entry.Id,
                    entry.MealType,
                    entry.Food,
                    entry.Amount,
                    entry.Substitution)).ToList()))
            .FirstOrDefaultAsync();
    }
}

public record PatientMealPlanListDto(
    int Id,
    string Name,
    int PatientId,
    string PatientName,
    DateOnly MealPlanDate,
    int TotalCals,
    DateTime CreatedAt
);

public record PatientMealPlanDetailDto(
    int Id,
    int PatientId,
    string PatientName,
    int PatientWeight,
    string Name,
    int TotalCals,
    DateOnly MealPlanDate,
    DateTime CreatedAt,
    List<EntryDto> Entries
);

public record EntryDto(
    int Id,
    MealType MealType,
    string Food,
    string Amount,
    bool Substitution
);
