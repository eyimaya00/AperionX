# AperionX YouTube Shorts Otomasyonu - Başka Bilgisayara Kurulum Rehberi

Bu rehber, mevcut otomasyon sisteminizi başka bir bilgisayara, farklı bir YouTube kanalı ve Google Drive hesabı ile sorunsuz bir şekilde taşımak için gereken adımları içerir.

## 1. Dosyaları Yeni Bilgisayara Aktarma
Mevcut `Otomasyon` klasörünüzü (flash bellek, harici disk veya bulut depolama üzerinden) yeni bilgisayara kopyalayın.

*İpucu: Aktarımı hızlandırmak için kopyalamadan önce `backend` ve `frontend` içindeki `node_modules` klasörlerini silebilirsiniz. Yeni bilgisayara taşıdıktan sonra bunları yeniden kuracağız.*

## 2. Yeni Bilgisayar İçin Gerekli Kurulumlar
Yeni bilgisayarda Node.js yüklü olması gerekmektedir.
1. [Node.js resmi web sitesinden](https://nodejs.org/) LTS sürümünü indirin ve kurun.
2. Kurulum tamamlandıktan sonra, terminal (veya CMD) açarak projedeki bağımlılıkları yükleyin:

```bash
cd Otomasyon/backend
npm install

cd ../frontend
npm install
```

## 3. Temiz Bir Veritabanı ile Başlamak (İsteğe Bağlı)
Eğer eski bilgisayardaki video geçmişini, yükleme kayıtlarını ve logları yeni bilgisayarda **görmek istemiyorsanız** (tamamen sıfırdan başlamak için):

1. `backend/data/` klasörüne gidin.
2. İçindeki `shorts.db`, `shorts.db-shm` ve `shorts.db-wal` dosyalarını silin.
3. Otomasyonu ilk başlattığınızda tertemiz yeni bir veritabanı kendi kendine oluşacaktır.

## 4. Yeni Google Drive Hesabını Bağlamak
Eğer videoları farklı bir hesabın Drive'ından çekecekseniz:

1. Yeni Google Hesabınızla [Google Cloud Console](https://console.cloud.google.com/)'a girin.
2. Bir proje oluşturun, **Google Drive API**'yi aktifleştirin.
3. API & Services > Credentials kısmından yeni bir **Service Account (Hizmet Hesabı)** oluşturun.
4. Bu yeni hizmet hesabının "Keys" sekmesinden yeni bir anahtar (JSON) oluşturup indirin.
5. İndirdiğiniz dosyanın adını `service-account.json` yapın ve eski bilgisayardan kopyaladığınız dosyanın yerine `backend/` klasörünün içine koyun.
6. Videoların atılacağı yeni Google Drive klasörünü oluşturun. Bu klasörün linkindeki **Folder ID**'yi (URL'deki son karmaşık bölüm) kopyalayın.
7. Klasöre sağ tıklayıp "Paylaş" diyerek hizmet hesabınızın mail adresine (JSON dosyasındaki client_email) **düzenleyici** yetkisi verin.
8. `backend/.env` dosyasını bir metin editörü ile açın ve yeni ID'yi buraya yapıştırın:

```env
DRIVE_FOLDER_ID=YENI_KLASORUN_ID_SI_BURAYA
```

## 5. Yeni YouTube Kanalını Bağlamak
Eğer yeni bir kanala yükleme yapacaksanız:

1. Yeni hesabınızla [Google Cloud Console](https://console.cloud.google.com/)'da (aynı projede olabilir) **YouTube Data API v3**'ü etkinleştirin.
2. API & Services > Credentials kısmından "OAuth İstemcisi" (OAuth Client ID - Web Application türünde) oluşturun. 
   - *Not: "Authorized redirect URIs" kısmına `http://localhost:3001/api/youtube/callback` eklemeyi unutmayın.*
3. `backend/.env` dosyasındaki şu kısımları yeni oluşturduğunuz ID ve Secret ile güncelleyin:

```env
YOUTUBE_CLIENT_ID=yeni_client_id_buraya
YOUTUBE_CLIENT_SECRET=yeni_secret_buraya
```

## 6. Sistemi Çalıştırma
Tüm ayarları tamamladıktan sonra:

1. `Otomasyon` ana klasöründeki `baslat.bat` dosyasına çift tıklayarak sistemi çalıştırın.
2. Tarayıcınızda `http://localhost:3000` adresine gidin.
3. **Ayarlar (Settings)** sayfasına gidip "YouTube'a Bağlan" butonuna basın.
4. Yükleme yapmak istediğiniz **yeni YouTube kanalınızın** bağlı olduğu Google hesabı ile giriş yapıp izin verin.

Tebrikler! Otomasyonunuz yeni bilgisayarda, farklı bir Drive'ı izleyerek ve farklı bir YouTube kanalına video gönderecek şekilde sıfırdan çalışmaya hazır.
