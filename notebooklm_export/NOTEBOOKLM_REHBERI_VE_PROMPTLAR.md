# 🎙️ Google NotebookLM ile Anestezi Facharzt Çalışma Rehberi & Komutlar (Prompts)

Bu rehber, **Dr. Melis'in** Facharzt Anästhesiologie (Ärztekammer Nordrhein, Düsseldorf) sınavına hazırlanırken **Google NotebookLM**'i kişisel bir yapay zeka sınav partneri ve podcast üreticisi olarak en verimli şekilde kullanabilmesi için hazırlanmıştır.

---

## 🚀 1. Adım Adım Kurulum (3 Dakika)

1. Tarayıcınızda [**notebooklm.google.com**](https://notebooklm.google.com) adresine gidin ve Google hesabınızla giriş yapın.
2. **"New Notebook" (Yeni Defter)** butonuna tıklayın.
3. Defter adını: **`Facharzt Anästhesie — ÄKNO Düsseldorf`** yapın.
4. Kaynak ekleme (Add Sources) ekranında **"Upload Sources" / Dosya Yükle** seçeneğini seçin.
5. Bu klasördeki dosyaları yükleyin:
   - **Tüm arşivi tek seferde yüklemek için:** `FACHARZT_KOMPLETT_NOTEBOOKLM.md` (636 soru & vaka, Almanca + Türkçe).
   - **Veya modüler olarak:** 
     - `01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md` (304 sözlü sınav vakası & ÄKNO protokolleri)
     - `02_MCQ_und_Faktenwissen_NOTEBOOKLM.md` (332 MCQ ve hap bilgi sorusu)

---

## 🎧 2. En Büyük Sihir: "Audio Overview" (Yapay Zeka Tıbbi Podcast)

NotebookLM, yüklediğiniz vakaları derinlemesine analiz ederek iki yapay zeka uzmanı arasında geçen **akıcı, profesyonel bir tıbbi tartışma podcast'i** oluşturur.

### Nasıl Yapılır?
1. NotebookLM sağ üst panelinde **"Audio Overview"** kutusunu bulun.
2. İsterseniz **"Customize" (Özelleştir)** butonuna tıklayarak odaklanmasını istediğiniz konuyu yazın:
   > *"Focus on difficult airway management, pediatric laryngospasm, malignant hyperthermia emergency protocols, and typical Düsseldorf ÄKNO examiner pitfalls."*
3. **"Generate"** butonuna basın.
4. 4-5 dakika içinde 10-15 dakikalık harika bir bölüm oluşur. Bunu telefonunuza indirip işe giderken, klinikte yürürken veya arabada dinleyebilirsiniz!

---

## 💬 3. NotebookLM İçin Hazır Sınav Komutları (Kopyala-Yapıştır Prompts)

NotebookLM sohbet kutusuna aşağıdaki komutları yapıştırarak interaktif çalışabilirsiniz:

### 🎯 Komut 1: Düsseldorf Mündliche Prüfung Simülatörü (Sözlü Sınav Simülatörü)
```text
Sen Düsseldorf Ärztekammer Nordrhein (ÄKNO) Anestezi Uzmanlık Sınavı başkanı Prof. Dr. Annecke'sin. 
Bana yüklediğim kaynaklardaki vakalardan birini seçerek sözlü sınav yap. 
Bana önce hastanın kliniğini ve ameliyat öncesi durumunu Almanca sun ve ardından ilk sorunu sor.
Ben yanıt verene kadar cevabı veya sonraki adımı söyleme. 
Benim Almanca cevabımı dinle, eksiklerimi, no-go (K.O.) kriterlerimi değerlendir ve sınavı adım adım ilerlet.
Hazırsan ilk vaka ile başla!
```

### 🎯 Komut 2: En Tehlikeli Sınav Tuzakları ve K.O. Kriterleri (Kardinalfehler)
```text
Yüklediğim tüm dosyalardaki anestezi uzmanlık sınavında anında bırakma sebebi sayılan 
(K.O.-Kriterien / Kardinalfehler / No-Go) durumları ve ölümcül hataları branş branş 
(Atemweg, Maligne Hyperthermie, LAST, Pädiatrie, Geburtshilfe) tablo halinde listele. 
Her hatanın yanına yapılması gereken altın kuralı (Goldstandard) ekle.
```

### 🎯 Komut 3: Acil İlaç Dozları & Protokol Hızlı Testi
```text
Bana acil anestezi durumları için (Dantrolen, Intralipid %20, Adrenalin anafilaksi ve resüsitasyon, 
Sugammadex roküronyum geri döndürme, Pediatrik acil tüp ve atropin dozları) hızlı bir doz ve protokol quiz'i yap. 
Soruları teker teker sor, ben cevapladıkça düzelt.
```

### 🎯 Komut 4: Karşılaştırmalı Farmakoloji ve Karar Ağaçları
```text
Kaynaklarıma dayanarak; Desfluran, Sevofluran ve İsofluran'ın intrakraniyal basınç, koroner çalma, 
uyanma süresi ve karbonmonoksit oluşumu risklerini karşılaştıran bir özet hazırla. 
Hangi durumda hangisi kesinlikle tercih edilmez?
```

---

## 💡 Çalışma Tavsiyesi

- **Gözle Okuma ve İlk Öğrenme:** iPhone'da web uygulamamızın **`📖 Melis'in Çalışma Sayfası`** ekranını kullanın (çünkü Almanca okurken dokunup Türkçe karşılığını görmek ve telaffuzunu dinlemek hafızaya en hızlı bu şekilde kazınır).
- **Yolda & Boş Zamanlarda:** NotebookLM'in ürettiği **Audio Overview Podcast'leri** dinleyin.
- **Akşam Tekrarı:** NotebookLM sohbetinde yukarıdaki **Sözlü Sınav Simülatörü** prompt'u ile kendini test etsin.

