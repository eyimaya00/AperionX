const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
function getYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? match[1] : null;
}
console.log(getYouTubeId(url));