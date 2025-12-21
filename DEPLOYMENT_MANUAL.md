# AperionX Deployment Instructions

## YÖNTEM 1: Terminal ve Git ile (En Garantili Yöntem)

Klasörünüzde gizli dosyalar (SSL sertifikası vb.) olduğu için "klasör boş değil" hatası aldınız. Bu yüzden "Clone" yerine şu komutları kullanacağız. Bu yöntem her durumda çalışır:

### Adım 1: Klasöre Gidin
Terminalden sitenizin klasörüne girin:
```bash
cd /home/aperionx/htdocs/aperionx.com/
```

### [HATA ÇÖZÜMÜ] "Permission denied" Hatası Alıyorsanız:
Eğer `git init` derken "Permission denied" hatası alıyorsanız, klasör yetkileri karışmış demektir (Root sahibi olmuş). Önce bunu düzeltmek için şu komutu yapıştırın (Şifre isteyebilir, CloudPanel şifrenizi girin):

```bash
sudo chown -R aperionx:aperionx /home/aperionx/htdocs/aperionx.com/
```

### Adım 2: Git'i Başlatın ve Zorla Eşitleyin
Artık yetki hatası almazsınız. Sırasıyla devam edin:

```bash
git init
git remote add origin https://github.com/eyimaya00/AperionX.git
git fetch --all
git reset --hard origin/main
```

### Adım 3: Kurulumu Yapın
Dosyalar geldikten sonra gerekli paketleri yükleyin:
```bash
npm install
npm install -g pm2
```

### Adım 4: .env Dosyasını Oluşturun (Çok Önemli!)
GitHub'da güvenlik gereği `.env` dosyası (şifreler) yoktur. Bunu sunucuda bir kez oluşturmalısınız.
```bash
nano .env
```
Açılan ekrana şu bilgileri (kendi veritabanı bilgilerinizle) yapıştırın:
```ini
PORT=3000
DB_HOST=127.0.0.1
DB_USER=cloudpanel_kullanici_adiniz
DB_PASS=cloudpanel_sifreniz
DB_NAME=cloudpanel_veritabani_adiniz
JWT_SECRET=gizli_kelime_yazin
```
Kaydetmek için: `CTRL + X`, sonra `Y`, sonra `Enter` tuşuna basın.

### Adım 5: Başlatın
```bash
pm2 start server.js --name "aperionx"
pm2 save
```

### Adım 3: Paketleri ve PM2'yi Kur
```bash
npm install
npm install -g pm2
```

### Adım 4: Başlat
```bash
pm2 start server.js --name "aperionx"
pm2 save
```

---

## YÖNTEM 2: Dosya Yöneticisi ile (Manuel)
Eğer terminal komutları hata veriyorsa, en garantili yol dosyaları elle yüklemektir.

1.  **Bilgisayarınızda:** Proje klasöründeki tüm dosyaları seçin ( `node_modules` klasörü hariç) ve `.zip` yapın.
2.  **CloudPanel'de:** File Manager'ı açın. Site klasörünüze gidin.
3.  **Yükle:** Eskileri silin ( `uploads` klasörü ve `.env` dosyası kalsın!) ve yeni `.zip` dosyasını yükleyip "Unzip" diyerek açın.
4.  **Terminalde:** Sadece şu komutları yazın:
    ```bash
    cd /home/kullanici/htdocs/aperionx.com/
    npm install
    pm2 restart all
    ```

## Önemli Not: Veritabanı
Kodlar yüklendikten sonra sunucu ilk kendisi başladığında eksik veritabanı ayarlarını **otomatik** yapacaktır. Sizin SQL komutu girmenize gerek yoktur.
