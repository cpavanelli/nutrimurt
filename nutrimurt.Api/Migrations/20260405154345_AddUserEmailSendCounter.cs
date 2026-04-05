using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nutrimurt.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserEmailSendCounter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_email_send_counters",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "text", nullable: false),
                    window_date = table.Column<DateOnly>(type: "date", nullable: false),
                    send_count = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_email_send_counters", x => x.user_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_email_send_counters");
        }
    }
}
