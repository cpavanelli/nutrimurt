using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Models;

namespace nutrimurt.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Patient> Patients => Set<Patient>();
}
