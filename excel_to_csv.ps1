
$sharedStringsPath = "data_extracted\xl\sharedStrings.xml"
$sheetPath = "data_extracted\xl\worksheets\sheet1.xml"

# 1. Parse Shared Strings
$sharedStrings = @()
if (Test-Path $sharedStringsPath) {
    [xml]$xmlShared = Get-Content $sharedStringsPath
    # Handle different namespace possibilities or just traverse localname
    # But usually simple traversal works if we ignore namespaces or use local-name
    foreach ($si in $xmlShared.sst.si) {
        if ($si.t -is [string]) {
            $sharedStrings += $si.t
        } elseif ($si.t.InnerText) {
             $sharedStrings += $si.t.InnerText
        } else {
            # Sometimes <t> is nested or multiple <t> (rich text)
            # Simplification: just get InnerText of the <si>
            $sharedStrings += $si.InnerText
        }
    }
}

# 2. Parse Worksheet
[xml]$xmlSheet = Get-Content $sheetPath

$rows = @{}
$maxCol = 0

foreach ($row in $xmlSheet.worksheet.sheetData.row) {
    $rIndex = [int]$row.r
    $rows[$rIndex] = @{}
    
    foreach ($c in $row.c) {
        $ref = $c.r # e.g. A1
        # Extract Column from Ref (A, B, val... AA...)
        $colRef = $ref -replace "[0-9]", ""
        
        # Convert Column Letter to Index (A=1, B=2...)
        # A simple way for single/double letters:
        $colIndex = 0
        foreach ($char in $colRef.ToCharArray()) {
            $colIndex = $colIndex * 26 + ([int]$char - [int][char]'A' + 1)
        }
        
        if ($colIndex -gt $maxCol) { $maxCol = $colIndex }

        $val = $c.v
        $type = $c.t # s = shared string, str = formula string, etc.

        if ($type -eq "s") {
            $val = $sharedStrings[[int]$val]
        }
        
        $rows[$rIndex][$colIndex] = $val
    }
}

# 3. Output as CSV
# Determine range
$maxRow = ($rows.Keys | Measure-Object -Maximum).Maximum

for ($i = 1; $i -le $maxRow; $i++) {
    $line = @()
    for ($j = 1; $j -le $maxCol; $j++) {
        if ($rows.ContainsKey($i) -and $rows[$i].ContainsKey($j)) {
            $cellContent = $rows[$i][$j]
            # Escape quotes for CSV
            $cellContent = $cellContent -replace '"', '""'
            $line += '"' + $cellContent + '"'
        } else {
            $line += '""'
        }
    }
    $line -join ","
}
