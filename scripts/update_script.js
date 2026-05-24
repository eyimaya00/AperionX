const fs = require('fs');

try {
    let content = fs.readFileSync('script.js', 'utf8');

    const target = `        // Content & Image Fix (Windows Path)
        let contentHtml = article.content || '';
        contentHtml = contentHtml.replace(/\\\\/g, '/'); // Fix all backslashes
        document.getElementById('detail-content').innerHTML = contentHtml;

    } catch (err) {`;

    const replacement = `        // Content & Image Fix (Windows Path)
        let contentHtml = article.content || '';
        contentHtml = contentHtml.replace(/\\\\/g, '/'); // Fix all backslashes
        document.getElementById('detail-content').innerHTML = contentHtml;

        // Load Interactions
        loadLikes(id);
        loadComments(id);
        if(typeof loadArticleSlider === 'function') loadArticleSlider(id);

    } catch (err) {`;

    // Note: The file might have different line endings or spacing.
    // I need to be careful with exact match.
    // Let's use a regex or find a unique string anchor.

    // Anchor: "document.getElementById('detail-content').innerHTML = contentHtml;"
    const anchor = "document.getElementById('detail-content').innerHTML = contentHtml;";

    if (content.includes(anchor)) {
        const insertPos = content.indexOf(anchor) + anchor.length;
        const insertion = "\n\n        // Load Interactions\n        loadLikes(id);\n        loadComments(id);\n        if(typeof loadArticleSlider === 'function') loadArticleSlider(id);\n";

        // We insert after the anchor line, but before the closing brace of try block.
        // Actually, the previous view showed:
        // contentHtml...
        // ...innerHTML = contentHtml;
        // 
        // } catch (err) {

        // So I can insert right after the anchor.

        const newContent = content.slice(0, insertPos) + insertion + content.slice(insertPos);
        fs.writeFileSync('script.js', newContent, 'utf8');
        console.log('Update successful');
    } else {
        console.error('Anchor not found');
        console.log('Content snippet:', content.substring(content.indexOf('article.content') || 0, content.indexOf('catch') || 200));
    }

} catch (e) {
    console.error(e);
}
