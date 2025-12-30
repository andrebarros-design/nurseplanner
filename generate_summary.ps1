
$csvData = Import-Csv -Path "output.csv" -Header (1..50) # Assuming max 50 cols for safety
# Note: Import-Csv might treat first row as header if not specified, but here clean headers don't exist.
# Actually, the file has no proper headers. 
# We need to manually parse or filter.

$markdown = "| Name | Total Shifts | Morning | Interm. | Afternoon | Weekends |`n|---|---|---|---|---|---|`n"

# Read raw lines to avoid header issues
$lines = Get-Content "output.csv"
foreach ($line in $lines) {
    # Simple CSV split respecting quotes matches is hard in regex, but the previous script output canonical CSV "",""
    # We can use ConvertFrom-Csv for single line
    $cols = $line | ConvertFrom-Csv -Header (1..50)
    
    # Check if this looks like a staff row.
    # Staff rows (except Oscar) seem to have an ID in Col 1 (Index 0) and Name in Col 2 (Index 1)
    # And they repeat the name in Col 36 (Index 35) approx.
    
    # Adjust indices (0-based)
    # Name rep: Col 36 -> Index 35
    # Total: Col 37 -> Index 36
    # M: Col 38 -> Index 37
    # I: Col 39 -> Index 38
    # T: Col 40 -> Index 39
    # SAB: Col 41 -> Index 40

    $nameRep = $cols.'36'
    
    if ($nameRep -and $nameRep -ne "" -and $nameRep -ne "Joselin Freitas*" -and $cols.'37' -match "^\d+$") { 
        # Checking if Col 37 (Total) is a number to confirm it's a data row
        $name = $nameRep
        $total = $cols.'37'
        $m = $cols.'38'
        $i = $cols.'39'
        $t = $cols.'40' # This column index might be shifted if there are extra cols
        $sab = $cols.'41'

        $markdown += "| $name | $total | $m | $i | $t | $sab |`n"
    }
}

$markdown | Out-File "summary_table.md" -Encoding utf8
