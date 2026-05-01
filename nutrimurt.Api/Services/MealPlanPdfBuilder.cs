using System.Globalization;
using nutrimurt.Api.Controllers;
using nutrimurt.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace nutrimurt.Api.Services;

public static class MealPlanPdfBuilder
{
    private const string Accent = "#1A7A5E";
    private const string AccentText = "#145E48";
    private const string BgPanel = "#F6F8FB";
    private const string BgElevated = "#EDF0F6";
    private const string Border = "#E8E8E8";
    private const string TextPrimary = "#1F1F1F";
    private const string TextSecondary = "#7B7B7B";
    private const string TextTertiary = "#ADADAD";

    private const string FontSans = "DM Sans";
    private const string FontMono = "DM Mono";

    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private record MealStyle(string Label, string TextColor, string Background, string BorderColor);

    private static readonly Dictionary<MealType, MealStyle> Styles = new()
    {
        [MealType.CafeDaManha] = new("Café da Manhã", "#1A7A5E", "#FDF6E3", "#70C4A8"),
        [MealType.Almoco]      = new("Almoço",        "#1A7A5E", "#E8F5F0", "#70C4A8"),
        [MealType.CafeDaTarde] = new("Café da Tarde", "#1A7A5E", "#FDF3E3", "#70C4A8"),
        [MealType.Jantar]      = new("Jantar",        "#1A7A5E", "#F0EBF8", "#70C4A8"),
        [MealType.Lanche]      = new("Lanche",        "#1A7A5E", "#FAEAE8", "#70C4A8"),
    };

    public static byte[] Build(PatientMealPlanDetailDto dto)
    {
        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginVertical(14, Unit.Millimetre);
                page.MarginHorizontal(16, Unit.Millimetre);
                page.DefaultTextStyle(t => t.FontFamily(FontSans).FontSize(6).FontColor(TextPrimary));

                page.Header().Element(c => ComposeHeader(c, dto));
                page.Content().Element(c => ComposeContent(c, dto));
                page.Footer().Element(c => ComposeFooter(c, dto));
            });
        }).GeneratePdf();
    }

    private static void ComposeHeader(IContainer container, PatientMealPlanDetailDto dto)
    {
        container
            .PaddingBottom(18)
            .BorderBottom(2)
            .BorderColor(Accent)
            .Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("NUTRIMURT")
                        .FontFamily(FontMono).FontSize(10).Bold()
                        .FontColor(Accent).LetterSpacing(0.16f);
                    c.Item().PaddingTop(6).Text("Plano Alimentar")
                        .FontSize(22).Bold().FontColor(TextPrimary);
                    c.Item().PaddingTop(2).Text(dto.PatientName)
                        .FontSize(13).FontColor(TextSecondary);
                });

                row.ConstantItem(180).AlignRight().Column(c =>
                {
                    c.Item().Text($"Emitido em {DateTime.Now:dd/MM/yyyy}")
                        .FontSize(11).FontColor(TextSecondary);
                    c.Item().PaddingTop(4).Text("Portal do Nutricionista")
                        .FontSize(11).FontColor(TextSecondary);
                });
            });
    }

    private static void ComposeContent(IContainer container, PatientMealPlanDetailDto dto)
    {
        container.PaddingVertical(20).Column(col =>
        {
            col.Item().Element(c => ComposeSummary(c, dto));

            var groups = dto.Entries
                .GroupBy(e => e.MealType)
                .OrderBy(g => (int)g.Key)
                .ToList();

            if (groups.Count == 0)
            {
                col.Item().PaddingTop(40).AlignCenter()
                    .Text("Sem itens neste plano alimentar.")
                    .FontSize(11).Italic().FontColor(TextSecondary);
                return;
            }

            col.Item().PaddingTop(24).Column(meals =>
            {
                foreach (var group in groups)
                {
                    meals.Item()
                        .PaddingBottom(14)
                        .ShowEntire()
                        .Element(s => ComposeMealSection(s, group.Key, group.ToList()));
                }
            });
        });
    }

    private static void ComposeSummary(IContainer container, PatientMealPlanDetailDto dto)
    {
        container.Border(1).BorderColor(Border).Row(row =>
        {
            SummaryCell(row, "PACIENTE", dto.PatientName, accent: false, lastCell: false);
            SummaryCell(row, "DATA DO PLANO", dto.MealPlanDate.ToString("dd/MM/yyyy", PtBr), accent: false, lastCell: false);
            SummaryCell(row, "PESO", dto.PatientWeight > 0 ? $"{dto.PatientWeight} kg" : "—", accent: false, lastCell: false);
            SummaryCell(row, "TOTAL CALORIAS", $"{dto.TotalCals.ToString("#,##0", PtBr)} kcal", accent: true, lastCell: true);
        });
    }

    private static void SummaryCell(RowDescriptor row, string label, string value, bool accent, bool lastCell)
    {
        var cell = row.RelativeItem();
        if (!lastCell) cell = cell.BorderRight(1).BorderColor(Border);
        cell.Background(BgPanel).Padding(14).Column(c =>
        {
            c.Item().Text(label)
                .FontSize(8).Bold().LetterSpacing(0.12f).FontColor(TextTertiary);
            c.Item().PaddingTop(5).Text(value)
                .FontSize(13).SemiBold().FontColor(accent ? AccentText : TextPrimary);
        });
    }

    private static void ComposeMealSection(IContainer container, MealType mealType, List<EntryDto> entries)
    {
        var style = Styles[mealType];
        var regular = entries.Where(e => !e.Substitution).ToList();
        var substitutions = entries.Where(e => e.Substitution).ToList();

        container.Column(col =>
        {
            // Header band
            col.Item()
                .Background(style.Background)
                .Border(1).BorderColor(style.BorderColor)
                .PaddingVertical(8).PaddingHorizontal(12)
                .Row(r =>
                {
                    r.AutoItem().AlignMiddle().Width(8).Height(8).Background(style.TextColor);
                    r.AutoItem().PaddingLeft(8).AlignMiddle()
                        .Text(style.Label.ToUpper(PtBr))
                        .FontSize(10).Bold().LetterSpacing(0.12f).FontColor(style.TextColor);
                    r.RelativeItem().AlignRight().AlignMiddle()
                        .Text($"{entries.Count} {(entries.Count == 1 ? "item" : "itens")}")
                        .FontSize(10).FontColor(TextTertiary);
                });

            // Items frame
            col.Item().Border(1).BorderColor(Border).BorderTop(0).Column(items =>
            {
                bool needDivider = false;
                foreach (var e in regular)
                {
                    items.Item().Element(c => ComposeItemRow(c, e, needDivider));
                    needDivider = true;
                }

                if (substitutions.Count > 0)
                {
                    items.Item()
                        .BorderTop(needDivider ? 1 : 0).BorderColor(Border)
                        //.Background("#FFFFFF")
                        .PaddingVertical(6).PaddingHorizontal(12)
                        .Row(r =>
                        {
                            r.AutoItem().AlignMiddle().Width(6).Height(6).Background(style.TextColor);
                            r.AutoItem().PaddingLeft(6).AlignMiddle()
                                .Text("SUBSTITUIÇÃO")
                                .FontSize(9).Bold().LetterSpacing(0.12f).FontColor("#000000");
                        });

                    bool subDivider = false;
                    foreach (var e in substitutions)
                    {
                        items.Item().Element(c => ComposeItemRow(c, e, subDivider));
                        subDivider = true;
                    }
                }
            });
        });
    }

    private static void ComposeItemRow(IContainer container, EntryDto entry, bool divider)
    {
        var c = container.Background("#FFFFFF");
        if (divider) c = c.BorderTop(1).BorderColor(Border);
        c.PaddingVertical(9).PaddingHorizontal(12).Row(r =>
        {
            r.RelativeItem().AlignMiddle()
                .Text(entry.Food).FontSize(12).Medium();
            r.AutoItem().AlignMiddle().PaddingLeft(16)
                .Background(BgElevated)
                .Border(1).BorderColor(Border)
                .PaddingHorizontal(10).PaddingVertical(3)
                .Text(entry.Amount).FontFamily(FontMono).FontSize(10).FontColor(TextSecondary);
        });
    }

    private static void ComposeFooter(IContainer container, PatientMealPlanDetailDto dto)
    {
        container.PaddingTop(10).BorderTop(1).BorderColor(Border).PaddingTop(6).Row(r =>
        {
            r.RelativeItem().Text("Nutrimurt — Portal do Nutricionista")
                .FontSize(9).FontColor(TextTertiary);
            r.RelativeItem().AlignRight()
                .Text($"{dto.PatientName} · {dto.MealPlanDate.ToString("dd/MM/yyyy", PtBr)}")
                .FontSize(9).FontColor(TextTertiary);
        });
    }
}
