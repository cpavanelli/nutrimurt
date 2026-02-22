using Microsoft.EntityFrameworkCore;
using nutrimurt.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")).UseSnakeCaseNamingConvention());


// Add Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var MyCors = "_myCors";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyCors, policy =>
    {
    policy.AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader();
});
});

var app = builder.Build();

app.UseCors(MyCors);


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
