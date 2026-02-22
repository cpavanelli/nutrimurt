using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Questionnaries> Questionnaries => Set<Questionnaries>();
    public DbSet<QuestionAlternatives> QuestionAlternatives => Set<QuestionAlternatives>();
    public DbSet<PatientQuestionAnswer> PatientQuestionAnswers => Set<PatientQuestionAnswer>();
    public DbSet<PatientLink> PatientLinks => Set<PatientLink>();
    public DbSet<PatientQuestionAnswerAlternative> PatientQuestionAnswerAlternatives => Set<PatientQuestionAnswerAlternative>();
}
