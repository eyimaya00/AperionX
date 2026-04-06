// Final Fix script for Article 60 (Çernobil) - References Format
// Run on server: node fix_article60_refs_final.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        const correctFormat = `The Chernobyl Accident: Updating of INSAG-1 (Safety Series No. 75-INSAG-7)
IAEA Publications - INSAG-7
Sources and Effects of Ionizing Radiation - UNSCEAR 2008 Report, Volume II, Scientific Annex D: Health effects due to radiation from the Chernobyl accident. UNSCEAR 2008 Annex D - Chernobyl Report
Dadachova, E., Bryan, R. A., Huang, X., Moadel, T., Schweitzer, A. D., Aisen, P., Nosanchuk, J. D., & Casadevall, A. (2007). Ionizing radiation changes the electronic properties of melanin and enhances the growth of melanized fungi. PLOS ONE, 2(5), e457. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1866175/
Casadevall, A. (2008). Fungi: the last frontier in radiology?. Infection and Immunity, 76(6), 2304–2305. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2423075/
Tugay, T., Zhdanova, N. N., Zheltonozhsky, V., Sadovnikov, L., & Dighton, J. (2006). The influence of ionizing radiation on spore germination and emergent hyphal growth response reactions of microfungi. Mycologia, 98(4), 521–527. https://doi.org/10.1080/15572536.2006.11832654
Shunk, G. K., Gomez, X. R., & Tirumalai, M. R. (2020). A Self-Replicating Radiation-Shield for Human Deep-Space Exploration: Radiotrophic Fungi can Attenuate Ionizing Radiation aboard the International Space Station. bioRxiv (Preprint). https://www.biorxiv.org/content/10.1101/2020.07.16.205534v5 https://doi.org/10.1371/journal.pone.0000457
Schweitzer, A. D., Revskaya, E., Chu, P., Pazo, V., Nosanchuk, J. D., van Duin, A. C., Dadachova, E., & Casadevall, A. (2009). Physicochemical evaluation of melanin as a potential radioprotector and energy harvester. Nanomedicine, 4(3), 335–348. https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0000457&type=printable
Zhdanova, N. N., Tugay, T., Dighton, J., Zheltonozhsky, V., & McDermott, P. (2000). Ionizing radiation from Chernobyl and the fraction of melanized fungi: Lessons from potentially radioactive sites. Applied and Environmental Microbiology, 66(4), 1553-1558. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC92238/
Dighton, J., Tugay, T., & Zhdanova, N. (2008). Fungi and ionizing radiation from radionuclides. FEMS Microbiology Letters, 281(2), 109-120. https://academic.oup.com/femsle/article/281/2/109/488050
Atri, D. (2016). Sustaining life on Mars through subsurface galactic cosmic radiation. Journal of the Royal Society Interface. https://royalsocietypublishing.org/doi/10.1098/rsif.2016.0459
Casadevall, A. (2007). In fungi, what’s in a color? The case of melanin. Communicative & Integrative Biology. https://www.tandfonline.com/doi/abs/10.4161/cib.1.1.6666
[IMAGES]
IAEA Imagebank & USFCRFC. (1986). Historical collections of the Chernobyl accident (Image ID: 02790015) [Fotoğraf]. Wikimedia Commons aracılığıyla erişildi. Lisans: Creative Commons Attribution-Share Alike 2.0 Generic (CC BY-SA 2.0).
Medmyco. (2005). Cladosporium sphaerospermum (UAMH 4745) on potato dextrose agar. Wikimedia Commons aracılığıyla erişildi. Lisans: Creative Commons Attribution-Share Alike 4.0 International.
Shunk, G., Gomez, X. R., & Kernaghan, N. J. (2020). A Self-Replicating Radiation-Shield for Human Deep-Space Exploration: Radiotrophic Fungi can Attenuate Ionizing Radiation aboard the International Space Station. bioRxiv. doi:10.1101/2020.07.16.205534
Nephron. (2010). Pigmented melanoma - cytology [Görsel]. Wikimedia Commons. Erişim adresi: https://commons.wikimedia.org/wiki/File:Pigmented_melanoma_-_cytology.jpg
Mattern, R. (2009). Eumelanine structural formula [Grafik]. Wikimedia Commons aracılığıyla erişildi. Kamu Malı (Public Domain).`;

        console.log('\n=== FIXING REFERENCES ===');
        await pool.query('UPDATE articles SET references_list = ? WHERE id = 60', [correctFormat]);
        console.log('✅ References format perfectly restored');
        
        console.log('\n=== DONE ===');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

fix();
