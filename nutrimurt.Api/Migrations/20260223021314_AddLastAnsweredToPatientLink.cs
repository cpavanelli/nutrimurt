using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nutrimurt.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLastAnsweredToPatientLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "last_answered",
                table: "patient_links",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "last_answered",
                table: "patient_links");
        }
    }
}
