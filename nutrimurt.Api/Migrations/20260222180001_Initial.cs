using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace nutrimurt.Api.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "patients",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    phone = table.Column<string>(type: "text", nullable: false),
                    cpf = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    birth = table.Column<DateOnly>(type: "date", nullable: true),
                    weight = table.Column<int>(type: "integer", nullable: false),
                    height = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_patients", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "questionnaries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_questionnaries", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "patient_links",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    patient_id = table.Column<int>(type: "integer", nullable: false),
                    url_id = table.Column<string>(type: "CHAR(32)", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    questionnary_id = table.Column<int>(type: "integer", nullable: false),
                    diary_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_patient_links", x => x.id);
                    table.ForeignKey(
                        name: "fk_patient_links_patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "patients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_patient_links_questionnaries_questionnary_id",
                        column: x => x.questionnary_id,
                        principalTable: "questionnaries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "questions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    question_text = table.Column<string>(type: "text", nullable: false),
                    question_type = table.Column<int>(type: "integer", nullable: false),
                    questionnary_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_questions", x => x.id);
                    table.ForeignKey(
                        name: "fk_questions_questionnaries_questionnary_id",
                        column: x => x.questionnary_id,
                        principalTable: "questionnaries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "patient_question_answer_alternatives",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    question_id = table.Column<int>(type: "integer", nullable: false),
                    alternative = table.Column<string>(type: "text", nullable: false),
                    patient_link_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_patient_question_answer_alternatives", x => x.id);
                    table.ForeignKey(
                        name: "fk_patient_question_answer_alternatives_patient_links_patient_",
                        column: x => x.patient_link_id,
                        principalTable: "patient_links",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "patient_question_answers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    question_id = table.Column<int>(type: "integer", nullable: false),
                    answer = table.Column<string>(type: "text", nullable: false),
                    patient_link_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_patient_question_answers", x => x.id);
                    table.ForeignKey(
                        name: "fk_patient_question_answers_patient_links_patient_link_id",
                        column: x => x.patient_link_id,
                        principalTable: "patient_links",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_alternatives",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    alternative = table.Column<string>(type: "text", nullable: false),
                    question_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_alternatives", x => x.id);
                    table.ForeignKey(
                        name: "fk_question_alternatives_questions_question_id",
                        column: x => x.question_id,
                        principalTable: "questions",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_patient_links_patient_id",
                table: "patient_links",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "ix_patient_links_questionnary_id",
                table: "patient_links",
                column: "questionnary_id");

            migrationBuilder.CreateIndex(
                name: "ix_patient_question_answer_alternatives_patient_link_id",
                table: "patient_question_answer_alternatives",
                column: "patient_link_id");

            migrationBuilder.CreateIndex(
                name: "ix_patient_question_answers_patient_link_id",
                table: "patient_question_answers",
                column: "patient_link_id");

            migrationBuilder.CreateIndex(
                name: "ix_question_alternatives_question_id",
                table: "question_alternatives",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_questions_questionnary_id",
                table: "questions",
                column: "questionnary_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "patient_question_answer_alternatives");

            migrationBuilder.DropTable(
                name: "patient_question_answers");

            migrationBuilder.DropTable(
                name: "question_alternatives");

            migrationBuilder.DropTable(
                name: "patient_links");

            migrationBuilder.DropTable(
                name: "questions");

            migrationBuilder.DropTable(
                name: "patients");

            migrationBuilder.DropTable(
                name: "questionnaries");
        }
    }
}
