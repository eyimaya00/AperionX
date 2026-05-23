import ig from 'instagram-url-direct';

async function test() {
    try {
        const url = 'https://www.instagram.com/reel/C7_3z9fI8vE/';
        const result = await ig(url);
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
