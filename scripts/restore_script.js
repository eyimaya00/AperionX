const fs = require('fs');

try {
    // Read the potentially corrupted file
    // We try to read as buffer to handle mixed encoding if necessary, 
    // but likely it's just bytes.
    let content = fs.readFileSync('script.js');

    // Convert to string. If it was mixed, we might see garbage.
    // However, the original part was UTF8. The appended part might be UTF16.
    // Let's rely on the fact that I want to cut at a specific string.

    const sContent = content.toString('utf8'); // Try simple utf8 first.

    // Find the end of validity.
    // "console.error('Slider load error:', e); }"
    const marker = "console.error('Slider load error:', e); }";
    const idx = sContent.lastIndexOf(marker);

    if (idx === -1) {
        console.error('Marker not found!');
        // If not found, maybe due to encoding mess?
        // Fallback: Read line by line?
        // Or assume the byte offset? 
        // Let's try to assume the 'spaced' version exists?
        process.exit(1);
    }

    // Cut just after the marker's block closing, which is likely next few chars.
    // The marker is inside a catch block `} catch...`
    // We need to find the closing `}` for the function.
    // sContent[idx] is start of "console..."

    const endOfFunction = sContent.indexOf('}', idx); // Closing brace of catch
    const endOfFunction2 = sContent.indexOf('}', endOfFunction + 1); // Closing brace of function

    // Take substring up to endOfFunction2 + 1
    const cleanContent = sContent.substring(0, endOfFunction2 + 1);

    // Now read the additions
    const additions = fs.readFileSync('script_additions.tmp', 'utf8');

    // Combine
    const finalContent = cleanContent + '\n\n' + additions;

    fs.writeFileSync('script_resolved.js', finalContent, 'utf8');
    console.log('Successfully created script_resolved.js');

} catch (e) {
    console.error(e);
}
