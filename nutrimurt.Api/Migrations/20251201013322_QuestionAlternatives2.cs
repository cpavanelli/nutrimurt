using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nutrimurt.Api.Migrations
{
    /// <inheritdoc />
    public partial class QuestionAlternatives2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Questionnaries",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "Questionnaries");
        }
    }
}
