Get-ChildItem -Path "views" -Filter "*.html" | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $newContent = $content -replace 'script_v105\.js\?v=\d+', 'script_v105.js?v=270'
    if ($content -ne $newContent) {
        [System.IO.File]::WriteAllText($_.FullName, $newContent)
        Write-Host "Updated: $($_.Name)"
    }
}
