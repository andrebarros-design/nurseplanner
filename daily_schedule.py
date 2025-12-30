
import csv
import sys

def get_day_of_week(day):
    # Jan 1 2026 is Thursday
    # 0=Thu, 1=Fri, 2=Sat, 3=Sun, 4=Mon, 5=Tue, 6=Wed
    days = ["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Qua"]
    return days[(day - 1) % 7]

def main():
    try:
        # PowerShell ' > ' often creates UTF-16LE with BOM
        f = open("output.csv", "r", encoding="utf-16", errors='ignore')
        content = f.read()
        if not content.strip():
            # Try utf-8 if empty (maybe user has different powershell version)
            f.close()
            f = open("output.csv", "r", encoding="utf-8", errors='ignore')
            content = f.read()
    except Exception:
        # Fallback
        f = open("output.csv", "r", encoding="utf-8", errors='ignore')
        content = f.read()
    
    f.close()
    
    # Simple CSV Parsing (Python's csv module might struggle with the specific quoting from PS if not standard)
    # But let's try csv module first
    from io import StringIO
    f_io = StringIO(content)
    reader = csv.reader(f_io)
    rows = list(reader)

    # Find the day map
    # We look for the row containing "1.0", "2.0"
    day_indices = {}
    day_row_index = -1
    
    for r_idx, row in enumerate(rows):
        if "1.0" in row and "2.0" in row:
            day_row_index = r_idx
            for c_idx, cell in enumerate(row):
                if cell.endswith(".0"): # 1.0, 2.0 etc
                    try:
                        d = int(float(cell))
                        if 1 <= d <= 31:
                            day_indices[d] = c_idx
                    except:
                        pass
            break
            
    if not day_indices:
        print("Could not find date header row.")
        return

    # Find staff
    staff_data = {} # Name -> {Day -> Shift}
    staff_names = []

    # Columns for totals (to verify it is a main row)
    # In previous step we saw Total is around Col 37 (index 36 or 37 depending on parsing)
    # We'll just look for a row where the cell at 'Total' column position is a number.
    # But positions might vary.
    # Heuristic: Row has an ID in col 0 (looks like float "91019.0"), Name in Col 1.
    
    for row in rows:
        if len(row) < 30: continue
        
        # Check if Col 0 is ID-like
        # "91019.0"
        id_val = row[0].strip()
        name = row[1].strip()
        
        if id_val.replace('.0','').isdigit() and len(id_val) > 3:
            # Check if this is a main row by looking for shifts?
            # Or assume Unique Names (except repeats in Summary block, but those don't have IDs in Col 0 usually?)
            # Actually summary block had Names but IDs?
            # Let's check the CSV sample from Step 71.
            # Row 7: "91019.0","Joselin Freitas*",...
            # Row 36: "","","","...","Joselin Freitas","21"... (No ID in col 0)
            # So checking Col 0 for ID is a good filter.
            
            # Clean Name (remove *)
            clean_name = name.replace('*', '').strip()
            
            shifts = {}
            for day in range(1, 32):
                if day in day_indices:
                    idx = day_indices[day]
                    if idx < len(row):
                        shifts[day] = row[idx]
                    else:
                        shifts[day] = ""
                else:
                    shifts[day] = ""
            
            staff_data[clean_name] = shifts
            staff_names.append(clean_name)

    # Output Markdown
    # Pivot: Rows = Days, Cols = People
    
    # Header
    md = "| Day | " + " | ".join(staff_names) + " |\n"
    md += "|---|" + "|".join(["---"] * len(staff_names)) + "|\n"
    
    for day in range(1, 32):
        dow = get_day_of_week(day)
        line = f"| {day} ({dow}) |"
        for name in staff_names:
            shift = staff_data[name].get(day, "")
            line += f" {shift} |"
        md += line + "\n"

    print(md)

if __name__ == "__main__":
    main()
