import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.chart import BarChart, Reference, PieChart
from datetime import datetime, date

wb = openpyxl.Workbook()

# ── Colores ──────────────────────────────────────────────────────────────────
AZUL        = "1E3A5F"
AZUL_CLARO  = "2563EB"
VERDE       = "16A34A"
ROJO        = "DC2626"
AMARILLO    = "D97706"
GRIS_HEADER = "374151"
GRIS_FILA   = "F9FAFB"
BLANCO      = "FFFFFF"
CELESTE     = "DBEAFE"
VERDE_CLARO = "DCFCE7"
ROJO_CLARO  = "FEE2E2"

def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def bold_font(size=11, color=BLANCO):
    return Font(bold=True, size=size, color=color)

def normal_font(size=10, color="000000"):
    return Font(size=size, color=color)

def center():
    return Alignment(horizontal="center", vertical="center", wrap_text=True)

def left():
    return Alignment(horizontal="left", vertical="center")

def thin_border():
    s = Side(style="thin", color="D1D5DB")
    return Border(left=s, right=s, top=s, bottom=s)

def set_header(ws, row, col, text, bg=AZUL, fg=BLANCO, size=11):
    c = ws.cell(row=row, column=col, value=text)
    c.fill = fill(bg)
    c.font = bold_font(size, fg)
    c.alignment = center()
    c.border = thin_border()
    return c

def style_data(ws, row, col, value=None, fmt=None, bg=BLANCO):
    c = ws.cell(row=row, column=col, value=value)
    c.fill = fill(bg)
    c.font = normal_font()
    c.alignment = left()
    c.border = thin_border()
    if fmt:
        c.number_format = fmt
    return c


# ════════════════════════════════════════════════════════════════════════════
# 1. DASHBOARD
# ════════════════════════════════════════════════════════════════════════════
ws = wb.active
ws.title = "📊 Dashboard"
ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 28
ws.column_dimensions["B"].width = 20
ws.column_dimensions["C"].width = 28
ws.column_dimensions["D"].width = 20

# Título
ws.merge_cells("A1:D1")
c = ws["A1"]
c.value = "🏦  FinTrack Panama — Panel de Control"
c.fill = fill(AZUL)
c.font = Font(bold=True, size=16, color=BLANCO)
c.alignment = center()
ws.row_dimensions[1].height = 40

ws.merge_cells("A2:D2")
c = ws["A2"]
c.value = f"Actualizado: {date.today().strftime('%d/%m/%Y')}"
c.fill = fill(GRIS_HEADER)
c.font = Font(size=10, color=BLANCO, italic=True)
c.alignment = center()
ws.row_dimensions[2].height = 18

ws.row_dimensions[3].height = 10

# Sección Ingresos
set_header(ws, 4, 1, "💰 RESUMEN DE INGRESOS", bg=AZUL_CLARO, size=12)
ws.merge_cells("A4:B4")
ws.row_dimensions[4].height = 28

labels_ingresos = [
    ("Salario Bruto (quincenal)", "=IFERROR(AVERAGE('💰 Quincenas'!C:C),0)", "$ #,##0.00"),
    ("Deducción CSS (9.75%)",    "=IFERROR(AVERAGE('💰 Quincenas'!D:D),0)", "$ #,##0.00"),
    ("Deducción Educativo (1.25%)","=IFERROR(AVERAGE('💰 Quincenas'!E:E),0)","$ #,##0.00"),
    ("Salario Neto (quincenal)", "=IFERROR(AVERAGE('💰 Quincenas'!F:F),0)", "$ #,##0.00"),
    ("Salario Neto (mensual)",   "=IFERROR(AVERAGE('💰 Quincenas'!F:F)*2,0)","$ #,##0.00"),
]
for i, (lbl, formula, fmt) in enumerate(labels_ingresos, start=5):
    bg = CELESTE if i % 2 == 0 else BLANCO
    c = ws.cell(row=i, column=1, value=lbl)
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left(); c.border = thin_border()
    c2 = ws.cell(row=i, column=2, value=formula)
    c2.fill = fill(bg); c2.font = Font(size=10, bold=True, color=VERDE)
    c2.alignment = center(); c2.border = thin_border(); c2.number_format = fmt
    ws.row_dimensions[i].height = 22

ws.row_dimensions[10].height = 10

# Sección Gastos
set_header(ws, 11, 1, "💸 RESUMEN DE GASTOS", bg=ROJO, size=12)
ws.merge_cells("A11:B11")
ws.row_dimensions[11].height = 28

labels_gastos = [
    ("Total Gastos (este mes)",  "=IFERROR(SUMPRODUCT(('💸 Gastos'!B2:B500<>\"\")*('💸 Gastos'!D2:D500)),0)", "$ #,##0.00"),
    ("Gastos Fijos",             "=IFERROR(SUMIF('💸 Gastos'!E2:E500,\"FIJO\",'💸 Gastos'!D2:D500),0)", "$ #,##0.00"),
    ("Gastos Variables",         "=IFERROR(SUMIF('💸 Gastos'!E2:E500,\"VARIABLE\",'💸 Gastos'!D2:D500),0)", "$ #,##0.00"),
    ("Balance (Neto - Gastos)",  "=B9-B13", "$ #,##0.00"),
]
for i, (lbl, formula, fmt) in enumerate(labels_gastos, start=12):
    bg = ROJO_CLARO if i % 2 == 0 else BLANCO
    c = ws.cell(row=i, column=1, value=lbl)
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left(); c.border = thin_border()
    c2 = ws.cell(row=i, column=2, value=formula)
    c2.fill = fill(bg); c2.font = Font(size=10, bold=True, color=ROJO)
    c2.alignment = center(); c2.border = thin_border(); c2.number_format = fmt
    ws.row_dimensions[i].height = 22

# Balance en verde/rojo
ws.cell(row=15, column=2).font = Font(size=10, bold=True, color=VERDE)

ws.row_dimensions[16].height = 10

# Sección Deudas / Ahorros (columnas C-D)
set_header(ws, 4, 3, "🏦 DEUDAS TOTALES", bg=AMARILLO, fg="000000", size=12)
ws.merge_cells("C4:D4")
ws.row_dimensions[4].height = 28

labels_deudas = [
    ("Total Deudas Pendientes", "=IFERROR(SUMIF('💳 Deudas'!G2:G500,\"No\",'💳 Deudas'!E2:E500),0)", "$ #,##0.00"),
    ("Pago Mensual Total",      "=IFERROR(SUMIF('💳 Deudas'!G2:G500,\"No\",'💳 Deudas'!F2:F500),0)", "$ #,##0.00"),
    ("Número de Deudas",        "=IFERROR(COUNTIF('💳 Deudas'!G2:G500,\"No\"),0)", "0"),
]
for i, (lbl, formula, fmt) in enumerate(labels_deudas, start=5):
    bg = CELESTE if i % 2 == 0 else BLANCO
    c = ws.cell(row=i, column=3, value=lbl)
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left(); c.border = thin_border()
    c2 = ws.cell(row=i, column=4, value=formula)
    c2.fill = fill(bg); c2.font = Font(size=10, bold=True, color=AMARILLO)
    c2.alignment = center(); c2.border = thin_border(); c2.number_format = fmt
    ws.row_dimensions[i].height = 22

ws.row_dimensions[8].height = 10

set_header(ws, 9, 3, "🎯 METAS DE AHORRO", bg=VERDE, size=12)
ws.merge_cells("C9:D9")
ws.row_dimensions[9].height = 28

labels_ahorros = [
    ("Meta Principal (objetivo)", "=IFERROR(MAXIFS('🎯 Ahorros'!C2:C500,'🎯 Ahorros'!F2:F500,\"Sí\"),0)", "$ #,##0.00"),
    ("Ahorro Acumulado Total",    "=IFERROR(SUM('🎯 Ahorros'!D2:D500),0)", "$ #,##0.00"),
    ("% Alcanzado (meta princ.)", "=IFERROR(D11/D10,0)", "0.0%"),
]
for i, (lbl, formula, fmt) in enumerate(labels_ahorros, start=10):
    bg = VERDE_CLARO if i % 2 == 0 else BLANCO
    c = ws.cell(row=i, column=3, value=lbl)
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left(); c.border = thin_border()
    c2 = ws.cell(row=i, column=4, value=formula)
    c2.fill = fill(bg); c2.font = Font(size=10, bold=True, color=VERDE)
    c2.alignment = center(); c2.border = thin_border(); c2.number_format = fmt
    ws.row_dimensions[i].height = 22

# Nota al pie
ws.merge_cells("A18:D18")
c = ws["A18"]
c.value = "ℹ️  Todos los cálculos se actualizan automáticamente al ingresar datos en las otras hojas."
c.fill = fill("FEF3C7")
c.font = Font(size=9, italic=True, color="92400E")
c.alignment = center()
ws.row_dimensions[18].height = 20


# ════════════════════════════════════════════════════════════════════════════
# 2. QUINCENAS (Ingresos)
# ════════════════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("💰 Quincenas")
ws2.sheet_view.showGridLines = False

cols_q = ["Período", "Fecha Pago", "Salario Bruto", "CSS (9.75%)", "Educativo (1.25%)",
          "IFARHU (0.5%)", "Otras Deduc.", "Salario Neto", "Incluye IFARHU", "Notas"]
widths_q = [22, 15, 16, 14, 18, 14, 14, 16, 16, 30]

ws2.merge_cells("A1:J1")
c = ws2["A1"]
c.value = "💰  Registro de Quincenas — FinTrack Panama"
c.fill = fill(AZUL); c.font = Font(bold=True, size=14, color=BLANCO); c.alignment = center()
ws2.row_dimensions[1].height = 35

for col, (hdr, w) in enumerate(zip(cols_q, widths_q), start=1):
    ws2.column_dimensions[get_column_letter(col)].width = w
    set_header(ws2, 2, col, hdr, bg=AZUL_CLARO)
ws2.row_dimensions[2].height = 30

# Filas de datos de ejemplo
example_quincenas = [
    ("1ra Quincena Enero 2026", "15/01/2026", 900, None, None, None, 0, None, "No", ""),
    ("2da Quincena Enero 2026", "31/01/2026", 900, None, None, None, 0, None, "No", ""),
    ("1ra Quincena Feb 2026",   "15/02/2026", 900, None, None, None, 0, None, "No", ""),
    ("2da Quincena Feb 2026",   "28/02/2026", 900, None, None, None, 0, None, "No", ""),
]

for r, row in enumerate(example_quincenas, start=3):
    bg = GRIS_FILA if r % 2 == 0 else BLANCO
    style_data(ws2, r, 1, row[0], bg=bg)
    style_data(ws2, r, 2, row[1], bg=bg)
    style_data(ws2, r, 3, row[2], "$ #,##0.00", bg)
    # CSS = C * 9.75%
    c = ws2.cell(row=r, column=4, value=f"=C{r}*0.0975")
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left()
    c.border = thin_border(); c.number_format = "$ #,##0.00"
    # Educativo = C * 1.25%
    c = ws2.cell(row=r, column=5, value=f"=C{r}*0.0125")
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left()
    c.border = thin_border(); c.number_format = "$ #,##0.00"
    # IFARHU = C * 0.5% si aplica
    c = ws2.cell(row=r, column=6, value=f"=IF(I{r}=\"Sí\",C{r}*0.005,0)")
    c.fill = fill(bg); c.font = normal_font(); c.alignment = left()
    c.border = thin_border(); c.number_format = "$ #,##0.00"
    style_data(ws2, r, 7, 0, "$ #,##0.00", bg)
    # Neto = Bruto - CSS - Educativo - IFARHU - Otras
    c = ws2.cell(row=r, column=8, value=f"=C{r}-D{r}-E{r}-F{r}-G{r}")
    c.fill = fill(VERDE_CLARO); c.font = Font(size=10, bold=True, color=VERDE)
    c.alignment = left(); c.border = thin_border(); c.number_format = "$ #,##0.00"
    style_data(ws2, r, 9, row[8], bg=bg)
    style_data(ws2, r, 10, row[9], bg=bg)
    ws2.row_dimensions[r].height = 20

# Validación Si/No para IFARHU
dv = DataValidation(type="list", formula1='"Sí,No"', allow_blank=False)
ws2.add_data_validation(dv)
dv.add("I3:I1000")

# Fila de totales
total_row = len(example_quincenas) + 3
ws2.merge_cells(f"A{total_row}:B{total_row}")
c = ws2.cell(row=total_row, column=1, value="TOTALES")
c.fill = fill(AZUL); c.font = bold_font(); c.alignment = center(); c.border = thin_border()
for col in range(3, 9):
    col_letter = get_column_letter(col)
    c = ws2.cell(row=total_row, column=col, value=f"=SUM({col_letter}3:{col_letter}{total_row-1})")
    c.fill = fill(AZUL); c.font = bold_font(); c.alignment = center()
    c.border = thin_border(); c.number_format = "$ #,##0.00"
ws2.row_dimensions[total_row].height = 24


# ════════════════════════════════════════════════════════════════════════════
# 3. GASTOS
# ════════════════════════════════════════════════════════════════════════════
ws3 = wb.create_sheet("💸 Gastos")
ws3.sheet_view.showGridLines = False

cols_g = ["Fecha", "Descripción", "Categoría", "Monto", "Tipo", "Quincena", "Notas"]
widths_g = [14, 30, 18, 14, 12, 24, 30]

ws3.merge_cells("A1:G1")
c = ws3["A1"]
c.value = "💸  Registro de Gastos — FinTrack Panama"
c.fill = fill(ROJO); c.font = Font(bold=True, size=14, color=BLANCO); c.alignment = center()
ws3.row_dimensions[1].height = 35

for col, (hdr, w) in enumerate(zip(cols_g, widths_g), start=1):
    ws3.column_dimensions[get_column_letter(col)].width = w
    set_header(ws3, 2, col, hdr, bg=GRIS_HEADER)
ws3.row_dimensions[2].height = 30

categorias = "ALIMENTACION,TRANSPORTE,SALUD,ENTRETENIMIENTO,SERVICIOS,EDUCACION,VIVIENDA,ROPA,TECNOLOGIA,OTROS"
dv_cat = DataValidation(type="list", formula1=f'"{categorias}"', allow_blank=False)
ws3.add_data_validation(dv_cat)
dv_cat.add("C3:C1000")

dv_tipo = DataValidation(type="list", formula1='"FIJO,VARIABLE"', allow_blank=False)
ws3.add_data_validation(dv_tipo)
dv_tipo.add("E3:E1000")

example_gastos = [
    ("05/04/2026", "Supermercado El Rey", "ALIMENTACION", 120, "FIJO", "1ra Quincena Abril", ""),
    ("06/04/2026", "Metro y autobús",     "TRANSPORTE",   45,  "VARIABLE", "1ra Quincena Abril", ""),
    ("07/04/2026", "Cable + Internet",    "SERVICIOS",    80,  "FIJO", "1ra Quincena Abril", ""),
    ("08/04/2026", "Farmacia Arrocha",    "SALUD",        30,  "VARIABLE", "1ra Quincena Abril", ""),
    ("09/04/2026", "Netflix + Spotify",   "ENTRETENIMIENTO", 25, "FIJO", "1ra Quincena Abril", ""),
]
for r, row in enumerate(example_gastos, start=3):
    bg = ROJO_CLARO if r % 2 == 0 else BLANCO
    style_data(ws3, r, 1, row[0], bg=bg)
    style_data(ws3, r, 2, row[1], bg=bg)
    style_data(ws3, r, 3, row[2], bg=bg)
    style_data(ws3, r, 4, row[3], "$ #,##0.00", bg)
    style_data(ws3, r, 5, row[4], bg=bg)
    style_data(ws3, r, 6, row[5], bg=bg)
    style_data(ws3, r, 7, row[6], bg=bg)
    ws3.row_dimensions[r].height = 20

# Total
tr = len(example_gastos) + 3
ws3.merge_cells(f"A{tr}:C{tr}")
c = ws3.cell(row=tr, column=1, value="TOTAL GASTOS")
c.fill = fill(ROJO); c.font = bold_font(); c.alignment = center(); c.border = thin_border()
c = ws3.cell(row=tr, column=4, value=f"=SUM(D3:D{tr-1})")
c.fill = fill(ROJO); c.font = bold_font(); c.alignment = center()
c.border = thin_border(); c.number_format = "$ #,##0.00"
ws3.row_dimensions[tr].height = 24

# Resumen por categoría
ws3.cell(row=tr+2, column=1, value="RESUMEN POR CATEGORÍA").font = Font(bold=True, size=11, color=GRIS_HEADER)
ws3.row_dimensions[tr+2].height = 22
set_header(ws3, tr+3, 1, "Categoría", bg=GRIS_HEADER)
set_header(ws3, tr+3, 2, "Total", bg=GRIS_HEADER)
set_header(ws3, tr+3, 3, "% del Total", bg=GRIS_HEADER)
for i, cat in enumerate(categorias.split(","), start=tr+4):
    c = ws3.cell(row=i, column=1, value=cat)
    c.fill = fill(GRIS_FILA); c.font = normal_font(); c.alignment = left(); c.border = thin_border()
    c2 = ws3.cell(row=i, column=2, value=f'=SUMIF(C3:C{tr-1},A{i},D3:D{tr-1})')
    c2.fill = fill(GRIS_FILA); c2.font = normal_font(); c2.alignment = left()
    c2.border = thin_border(); c2.number_format = "$ #,##0.00"
    c3 = ws3.cell(row=i, column=3, value=f'=IFERROR(B{i}/D{tr},0)')
    c3.fill = fill(GRIS_FILA); c3.font = normal_font(); c3.alignment = left()
    c3.border = thin_border(); c3.number_format = "0.0%"
    ws3.row_dimensions[i].height = 20


# ════════════════════════════════════════════════════════════════════════════
# 4. DEUDAS
# ════════════════════════════════════════════════════════════════════════════
ws4 = wb.create_sheet("💳 Deudas")
ws4.sheet_view.showGridLines = False

cols_d = ["Acreedor", "Fecha Inicio", "Monto Total", "Saldo Restante",
          "Monto Original", "Pago Mensual", "¿Pagada?", "Tasa Interés", "Fecha Fin", "Notas"]
widths_d = [22, 14, 16, 16, 16, 16, 12, 14, 14, 30]

ws4.merge_cells("A1:J1")
c = ws4["A1"]
c.value = "💳  Registro de Deudas — FinTrack Panama"
c.fill = fill(AMARILLO); c.font = Font(bold=True, size=14, color="000000"); c.alignment = center()
ws4.row_dimensions[1].height = 35

for col, (hdr, w) in enumerate(zip(cols_d, widths_d), start=1):
    ws4.column_dimensions[get_column_letter(col)].width = w
    set_header(ws4, 2, col, hdr, bg=GRIS_HEADER)
ws4.row_dimensions[2].height = 30

dv_pagada = DataValidation(type="list", formula1='"Sí,No"', allow_blank=False)
ws4.add_data_validation(dv_pagada)
dv_pagada.add("G3:G1000")

example_deudas = [
    ("Banco General", "01/06/2023", 5000, 3200, 5000, 200, "No", "18%", "01/06/2026", "Préstamo personal"),
]
for r, row in enumerate(example_deudas, start=3):
    bg = BLANCO
    for col, val in enumerate(row, start=1):
        fmt = None
        if col in [3, 4, 5, 6]:
            fmt = "$ #,##0.00"
        c = style_data(ws4, r, col, val, fmt, bg)
    ws4.row_dimensions[r].height = 22

# Total saldo
tr4 = len(example_deudas) + 3
ws4.merge_cells(f"A{tr4}:C{tr4}")
c = ws4.cell(row=tr4, column=1, value="TOTAL SALDO PENDIENTE")
c.fill = fill(AMARILLO); c.font = Font(bold=True, color="000000"); c.alignment = center(); c.border = thin_border()
c = ws4.cell(row=tr4, column=4, value=f"=SUMIF(G3:G{tr4-1},\"No\",D3:D{tr4-1})")
c.fill = fill(AMARILLO); c.font = Font(bold=True, color="000000"); c.alignment = center()
c.border = thin_border(); c.number_format = "$ #,##0.00"
ws4.row_dimensions[tr4].height = 24


# ════════════════════════════════════════════════════════════════════════════
# 5. AHORROS
# ════════════════════════════════════════════════════════════════════════════
ws5 = wb.create_sheet("🎯 Ahorros")
ws5.sheet_view.showGridLines = False

cols_a = ["Meta", "Fecha Límite", "Objetivo ($)", "Acumulado ($)",
          "% Alcanzado", "¿Principal?", "¿Completada?", "Notas"]
widths_a = [28, 14, 16, 16, 14, 14, 14, 30]

ws5.merge_cells("A1:H1")
c = ws5["A1"]
c.value = "🎯  Metas de Ahorro — FinTrack Panama"
c.fill = fill(VERDE); c.font = Font(bold=True, size=14, color=BLANCO); c.alignment = center()
ws5.row_dimensions[1].height = 35

for col, (hdr, w) in enumerate(zip(cols_a, widths_a), start=1):
    ws5.column_dimensions[get_column_letter(col)].width = w
    set_header(ws5, 2, col, hdr, bg=AZUL_CLARO)
ws5.row_dimensions[2].height = 30

dv_si = DataValidation(type="list", formula1='"Sí,No"', allow_blank=False)
ws5.add_data_validation(dv_si)
dv_si.add("F3:G1000")

example_ahorros = [
    ("Fondo de emergencia", "31/12/2026", 3000, 750, None, "Sí", "No", "Meta principal"),
    ("Vacaciones en Colombia", "15/08/2026", 1500, 300, None, "No", "No", ""),
]
for r, row in enumerate(example_ahorros, start=3):
    bg = VERDE_CLARO if r % 2 == 0 else BLANCO
    style_data(ws5, r, 1, row[0], bg=bg)
    style_data(ws5, r, 2, row[1], bg=bg)
    style_data(ws5, r, 3, row[2], "$ #,##0.00", bg)
    style_data(ws5, r, 4, row[3], "$ #,##0.00", bg)
    c = ws5.cell(row=r, column=5, value=f"=IFERROR(D{r}/C{r},0)")
    c.fill = fill(bg); c.font = Font(size=10, bold=True, color=VERDE)
    c.alignment = left(); c.border = thin_border(); c.number_format = "0.0%"
    style_data(ws5, r, 6, row[5], bg=bg)
    style_data(ws5, r, 7, row[6], bg=bg)
    style_data(ws5, r, 8, row[7], bg=bg)
    ws5.row_dimensions[r].height = 22


# ════════════════════════════════════════════════════════════════════════════
# 6. CUENTAS BANCARIAS
# ════════════════════════════════════════════════════════════════════════════
ws6 = wb.create_sheet("🏛️ Cuentas")
ws6.sheet_view.showGridLines = False

cols_c = ["Banco", "Tipo", "Alias", "Saldo ($)", "Moneda", "¿Principal?", "¿Activa?", "Notas"]
widths_c = [22, 16, 18, 16, 10, 12, 10, 30]

ws6.merge_cells("A1:H1")
c = ws6["A1"]
c.value = "🏛️  Cuentas Bancarias — FinTrack Panama"
c.fill = fill(AZUL); c.font = Font(bold=True, size=14, color=BLANCO); c.alignment = center()
ws6.row_dimensions[1].height = 35

for col, (hdr, w) in enumerate(zip(cols_c, widths_c), start=1):
    ws6.column_dimensions[get_column_letter(col)].width = w
    set_header(ws6, 2, col, hdr, bg=GRIS_HEADER)
ws6.row_dimensions[2].height = 30

dv_tipo_cuenta = DataValidation(type="list", formula1='"CORRIENTE,AHORROS,INVERSION"', allow_blank=False)
ws6.add_data_validation(dv_tipo_cuenta)
dv_tipo_cuenta.add("B3:B1000")

example_cuentas = [
    ("Banco General", "AHORROS", "Mi cuenta principal", 1500, "USD", "Sí", "Sí", ""),
    ("Banistmo", "CORRIENTE", "Nómina", 200, "USD", "No", "Sí", ""),
]
for r, row in enumerate(example_cuentas, start=3):
    bg = CELESTE if r % 2 == 0 else BLANCO
    for col, val in enumerate(row, start=1):
        fmt = "$ #,##0.00" if col == 4 else None
        style_data(ws6, r, col, val, fmt, bg)
    ws6.row_dimensions[r].height = 22

# Total
tr6 = len(example_cuentas) + 3
ws6.merge_cells(f"A{tr6}:C{tr6}")
c = ws6.cell(row=tr6, column=1, value="TOTAL ACTIVOS")
c.fill = fill(AZUL); c.font = bold_font(); c.alignment = center(); c.border = thin_border()
c = ws6.cell(row=tr6, column=4, value=f"=SUMIF(G3:G{tr6-1},\"Sí\",D3:D{tr6-1})")
c.fill = fill(AZUL); c.font = bold_font(); c.alignment = center()
c.border = thin_border(); c.number_format = "$ #,##0.00"
ws6.row_dimensions[tr6].height = 24


# ════════════════════════════════════════════════════════════════════════════
# 7. INSTRUCCIONES
# ════════════════════════════════════════════════════════════════════════════
ws7 = wb.create_sheet("📋 Instrucciones")
ws7.sheet_view.showGridLines = False
ws7.column_dimensions["A"].width = 60
ws7.column_dimensions["B"].width = 40

ws7.merge_cells("A1:B1")
c = ws7["A1"]
c.value = "📋  Instrucciones de Uso — FinTrack Panama"
c.fill = fill(AZUL); c.font = Font(bold=True, size=14, color=BLANCO); c.alignment = center()
ws7.row_dimensions[1].height = 40

instrucciones = [
    ("📊 DASHBOARD",         "Se actualiza solo. No editar esta hoja."),
    ("💰 QUINCENAS",         "Ingresa tu salario bruto. CSS, Educativo e IFARHU se calculan automáticamente."),
    ("💸 GASTOS",            "Registra cada gasto con fecha, descripción, categoría y tipo (FIJO/VARIABLE)."),
    ("💳 DEUDAS",            "Una fila por deuda. Actualiza el 'Saldo Restante' cada mes."),
    ("🎯 AHORROS",           "Una fila por meta. Actualiza el 'Acumulado ($)' cuando ahorres."),
    ("🏛️ CUENTAS",           "Registra tus cuentas bancarias y actualiza el saldo periódicamente."),
    ("",                     ""),
    ("🔢 FÓRMULAS CLAVE",    ""),
    ("Salario Neto",         "= Bruto − CSS(9.75%) − Educativo(1.25%) − IFARHU(0.5% si aplica)"),
    ("Balance mensual",      "= Salario Neto × 2 − Total Gastos del mes"),
    ("% Meta de ahorro",     "= Acumulado ÷ Objetivo"),
    ("",                     ""),
    ("💡 CONSEJOS",          ""),
    ("Actualización",        "Actualiza el archivo cada quincena al recibir tu pago."),
    ("Gastos",               "Registra gastos apenas los hagas para no olvidarlos."),
    ("Deudas",               "Revisa el saldo de deudas una vez al mes."),
    ("Ahorros",              "Transfiere a ahorro primero antes de gastar (págate a ti mismo)."),
]

for r, (col1, col2) in enumerate(instrucciones, start=2):
    bg = CELESTE if r % 2 == 0 else BLANCO
    c1 = ws7.cell(row=r, column=1, value=col1)
    c1.fill = fill(bg)
    c1.font = Font(bold=True, size=10) if col1 and col1[0] in "📊💰💸💳🎯🏛️🔢💡" else normal_font()
    c1.alignment = left(); c1.border = thin_border()
    c2 = ws7.cell(row=r, column=2, value=col2)
    c2.fill = fill(bg); c2.font = normal_font(); c2.alignment = left(); c2.border = thin_border()
    ws7.row_dimensions[r].height = 22

# ── Guardar ──────────────────────────────────────────────────────────────────
output = "/home/user/App-Finanzas/FinTrack_Panama.xlsx"
wb.save(output)
print(f"✅ Archivo creado: {output}")
