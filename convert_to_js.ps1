
# Jan 2026 Configuration
# ... (same setup)
$lines = Get-Content "output.csv"
$csvData = $lines | ConvertFrom-Csv -Header (1..60)

$dayIndices = @{}
$dayRowFound = $false
$staffList = @()

foreach ($row in $csvData) {
    if (-not $dayRowFound) {
        for ($i = 1; $i -le 60; $i++) {
            if ($row."$i" -eq "1.0") {
                $dayRowFound = $true
                for ($j = $i; $j -le 60; $j++) {
                    if ($row."$j" -match "^(\d+)\.0$") {
                        $dayIndices[[int]$matches[1]] = "$j"
                    }
                }
                break
            }
        }
        if ($dayRowFound) { continue }
    }
    
    if ($row.'1' -match "^\d+\.0$" -and $row.'2'.Length -gt 2) {
        $name = $row.'2' -replace "\*", "" 
        $name = $name.Trim()
        
        # Use Ordered Dictionary or Custom Object, and ensure keys are Strings for JSON
        $shifts = [ordered]@{}
        foreach ($d in 1..31) {
            $keyStr = "$d" # Force string key
            if ($dayIndices.ContainsKey($d)) {
                $colKey = $dayIndices[$d]
                $val = $row.$colKey
                if (-not [string]::IsNullOrWhiteSpace($val)) {
                    $shifts[$keyStr] = $val
                }
                else {
                    $shifts[$keyStr] = ""
                }
            }
            else {
                $shifts[$keyStr] = ""
            }
        }
        
        $staffMember = @{
            id     = $row.'1' -replace "\.0", ""
            name   = $name
            shifts = $shifts
        }
        $staffList += $staffMember
    }
}

$json = $staffList | ConvertTo-Json -Depth 5
$jsContent = "const rosterData = $json;"
$jsContent | Out-File "C:\Users\thean\.gemini\antigravity\scratch\excel_analysis\roster_app\data.js" -Encoding utf8
