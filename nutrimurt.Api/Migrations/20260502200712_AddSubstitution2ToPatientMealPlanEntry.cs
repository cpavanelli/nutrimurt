using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nutrimurt.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSubstitution2ToPatientMealPlanEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "substitution2",
                table: "patient_meal_plan_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "substitution2",
                table: "patient_meal_plan_entries");
        }
    }
}
