
# Jan 2026
# 1=Thu (Qui)
$daysOfWeek = @("Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Qua")
function Get-Dow($d) {
    return $daysOfWeek[($d - 1) % 7]
}

# Read CSV
# output.csv might be UTF-16
$lines = Get-Content "output.csv"
$csvData = $lines | ConvertFrom-Csv -Header (1..60) # Assume max 60 cols

# Find Header Row for Days
$dayIndices = @{}
$dayRowFound = $false

# Identify Staff
$staffNames = @()
$staffData = @{}

# Loop through rows to find header then staff
foreach ($row in $csvData) {
    # Convert PSObject to simple array/hashtable for easier access?
    # Actually $row.'1', $row.'2' etc.
    
    # Check for header "1.0", "2.0"
    if (-not $dayRowFound) {
        $foundOne = $false
        # Scan columns
        for ($i = 1; $i -le 60; $i++) {
            $val = $row."$i"
            if ($val -eq "1.0") {
                $foundOne = $true
                # Generate map: Day -> Index (Property Name in PS object)
                # If we find "1.0" at column '3', then Day 1 is property '3'
                # We expect 1.0, 2.0...
                
                # Scan from this position forward
                for ($j = $i; $j -le 60; $j++) {
                    $dVal = $row."$j"
                    if ($dVal -match "^(\d+)\.0$") {
                        $dInt = [int]$matches[1]
                        $dayIndices[$dInt] = "$j"
                    }
                }
                break
            }
        }
        if ($foundOne) {
            $dayRowFound = $true
            continue
        }
    }
    
    # Check for Staff
    # Criteria: Col 1 (Prop '1') is ID-like "9xxxx.0", Col 2 (Prop '2') has text
    $col1 = $row.'1'
    if ($col1 -match "^\d+\.0$") {
        $name = $row.'2' -replace "\*", ""
        $name = $name.Trim()
        
        $staffNames += $name
        $staffData[$name] = @{}
        
        # Extract shifts
        foreach ($d in 1..31) {
            if ($dayIndices.ContainsKey($d)) {
                $colIndex = $dayIndices[$d]
                $val = $row.$colIndex
                $staffData[$name][$d] = $val
            }
            else {
                $staffData[$name][$d] = ""
            }
        }
    }
}

# Generate Markdown Header
$md = "| Day | " + ($staffNames -join " | ") + " |`n"
$md += "|---|" + (($staffNames | ForEach-Object { "---" }) -join "|") + "|`n"

# Generate Rows 1..31
for ($d = 1; $d -le 31; $d++) {
    $dow = Get-Dow $d
    $line = "| **$d** ($dow) |"
    
    foreach ($name in $staffNames) {
        $shift = $staffData[$name][$d]
        if ([string]::IsNullOrWhiteSpace($shift)) { $shift = "-" }
        $line += " $shift |"
    }
    $md += "$line`n"
}

$md | Out-File "schedule_overview.md" -Encoding utf8
