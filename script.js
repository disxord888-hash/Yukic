document.addEventListener('DOMContentLoaded', () => {
    const contentScript = document.getElementById('content');
    const previewElement = document.getElementById('markdown-preview');

    if (contentScript && previewElement) {
        // Strip leading whitespace for cleaner processing
        const markdown = contentScript.textContent.trim();
        // Use marked.parse to render markdown
        previewElement.innerHTML = marked.parse(markdown);
    }
});
