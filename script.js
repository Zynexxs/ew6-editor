let mevcutDil = "tr";
let fileData = null;

// Buraya Google AI Studio'dan aldığın ücretsiz API anahtarını yapıştır kral
// NOT: AI Studio artık "AQ.Ab..." formatında anahtar veriyor, bu yeni format
// SADECE header ile gönderiliyor. URL'ye ?key= olarak eklemek OAuth hatasına
// sebep oluyor, bu yüzden URL'de key YOK, sadece header'da var.
const GEMINI_API_KEY = "AQ.Ab8RN6KIKUEeqtSkBVRQUs_QZ_9ri8x1uMfO8vVXZ4Q1qbNAQQ"; 

// Ülke Kodları Bilgi Hafızası
const SYSTEM_KNOWLEDGE = {
    game_1804: {
        "01": "Osmanlı İmparatorluğu (Ottoman Empire)", "02": "Büyük Britanya (Great Britain)",
        "03": "Fransa (France)", "04": "Rusya (Russia)", "05": "Avusturya (Austria)",
        "06": "Prusya (Prussia)", "07": "İspanya (Spain)", "08": "Portekiz (Portugal)",
        "09": "Sardinya (Sardinia)", "0A": "Sicilya (Sicily)", "0B": "Hollanda (Holland)",
        "0C": "İsveç (Sweden)", "0D": "Danimarka (Denmark)", "0E": "Bavyera (Bavaria)", "0F": "Saksonya (Saxony)"
    },
    game_1914: {
        "01": "Osmanlı İmparatorluğu (Ottoman Empire)", "02": "Alman İmparatorluğu (German Empire)",
        "03": "Avusturya-Macaristan İmparatorluğu", "04": "Bulgaristan Krallığı (Kingdom of Bulgaria)",
        "05": "Büyük Britanya (Great Britain)", "06": "Fransa (France)", "07": "Rusya (Russia)",
        "08": "İtalya (Italy)", "09": "ABD (USA)", "0A": "Japonya (Japan)", "0B": "Belçika (Belgium)",
        "0C": "Sırbistan (Serbia)", "0D": "Romanya (Romania)", "0E": "Yunanistan (Greece)", "0F": "Karadağ (Montenegro)"
    }
};

const diller = {
    tr: {
        placeholder: "Hex dizilimi girin veya Yapay Zekaya bir şey sorun...",
        welcome: "🔎 EW6 Pure Hex Engine + Canlı Gemini AI Aktif! Hex aratabilir veya özgürce sohbet edebilirsiniz.",
        lblOpenFile: "📂 Dosya Seç / Open File",
        lblDec: "Sayı / Dec...",
        needFile: "⚙️ Hex araması yapabilmek için önce aşağıdan bir dosya yüklemelisin kral.",
        placeholderText: "Modlamak istediğiniz EW6 dosyasını seçin...",
        found: (sayi, indeks) => `🎯 <b>Dizilim Bulundu!</b><br>Eşleşen Blok Sayısı: <b>${sayi}</b><br>İlk Adres: <b>${indeks}</b>.`,
        notFound: (girdi) => `❌ "${girdi}" dizilimi dosyada bulunamadı.`,
        promptPrompt: (indeks, mevcut) => `Adres: ${indeks}\nMevcut Hex: ${mevcut}\nYeni Hex:`,
        aiLoading: "🤖 Yapay Zeka düşünüyor..."
    },
    en: {
        placeholder: "Enter hex sequence or ask AI anything...",
        welcome: "🔎 EW6 Pure Hex Engine + Live Gemini AI Active! Search hex codes or chat freely.",
        lblOpenFile: "📂 Open File / Dosya Seç",
        lblDec: "Number / Dec...",
        needFile: "⚙️ Please upload a file first to search.",
        placeholderText: "Please select an EW6 file to start...",
        found: (sayi, indeks) => `🎯 <b>Sequence Found!</b><br>Matches: <b>${sayi}</b><br>First Offset: <b>${indeks}</b>.`,
        notFound: (girdi) => `❌ "${girdi}" sequence not found in file.`,
        promptPrompt: (indeks, mevcut) => `Index: ${indeks}\nCurrent Hex: ${mevcut}\nNew Hex:`,
        aiLoading: "🤖 AI is thinking..."
    }
};

function uiGuncelle() {
    document.getElementById('input').placeholder = diller[mevcutDil].placeholder;
    document.getElementById('lblOpenFile').innerText = diller[mevcutDil].lblOpenFile;
    document.getElementById('decInput').placeholder = diller[mevcutDil].lblDec;
    if(!fileData) {
        document.getElementById('hexPlaceholder').innerText = diller[mevcutDil].placeholderText;
    }
}

function dilDegistir() {
    mevcutDil = mevcutDil === "tr" ? "en" : "tr";
    uiGuncelle();
    document.getElementById('chatBox').innerHTML = `<div class="message ai-message">${diller[mevcutDil].welcome}</div>`;
}

function buildAiPrompt(girdi) {
    if (mevcutDil === "en") {
        return `You are an assistant for the European War 6 (EW6) game and hex editor. Reply in English only, in a friendly casual tone calling the user "bro". Keep the answer short and to the point. User's message: ${girdi}`;
    }
    return `Sen European War 6 (EW6) oyunu ve Hex editör asistanısın. Sadece Türkçe cevap ver, samimi bir dille 'kral' diye hitap ederek kısa ve öz cevap ver. Kullanıcının mesajı: ${girdi}`;
}

async function aiAnalizEt() {
    let girdi = document.getElementById('input').value.trim();
    let chatBox = document.getElementById('chatBox');
    if(!girdi) return;

    // Kullanıcı mesajını ekrana bas
    chatBox.innerHTML += `<div class="message user-message">${girdi}</div>`;
    document.getElementById('input').value = ''; 
    chatBox.scrollTop = chatBox.scrollHeight;

    // Girdiyi Hex araması için temizle
    let temizHex = girdi.replace(/\s+/g, '').toUpperCase();
    let hexValid = /^[0-9A-F]+$/.test(temizHex) && temizHex.length >= 2;

    // Eğer girdi geçerli bir HEX koduysa, dosya aramasına yönlendir
    if (hexValid) {
        if (!fileData) { 
            chatBox.innerHTML += `<div class="message ai-message">${diller[mevcutDil].needFile}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
            return; 
        }

        if (temizHex.length % 2 !== 0) temizHex = "0" + temizHex;

        let arananByteDizisi = [];
        for (let i = 0; i < temizHex.length; i += 2) {
            arananByteDizisi.push(parseInt(temizHex.substr(i, 2), 16));
        }

        let bulunanIndeksler = [];
        for (let i = 0; i <= fileData.length - arananByteDizisi.length; i++) {
            let eslesme = true;
            for (let j = 0; j < arananByteDizisi.length; j++) {
                if (fileData[i + j] !== arananByteDizisi[j]) { eslesme = false; break; }
            }
            if (eslesme) bulunanIndeksler.push(i);
        }

        if (bulunanIndeksler.length > 0) {
            let responseHTML = `${diller[mevcutDil].found(bulunanIndeksler.length, bulunanIndeksler[0])}`;
            if (temizHex.length === 2 && (SYSTEM_KNOWLEDGE.game_1804[temizHex] || SYSTEM_KNOWLEDGE.game_1914[temizHex])) {
                responseHTML += `<br><br>📊 <b>EW6 Ülke Karşılığı:</b>`;
                if(SYSTEM_KNOWLEDGE.game_1804[temizHex]) responseHTML += `<br>• 1804: ${SYSTEM_KNOWLEDGE.game_1804[temizHex]}`;
                if(SYSTEM_KNOWLEDGE.game_1914[temizHex]) responseHTML += `<br>• 1914: ${SYSTEM_KNOWLEDGE.game_1914[temizHex]}`;
            }
            chatBox.innerHTML += `<div class="message ai-message">${responseHTML}</div>`;
            renderHexView(bulunanIndeksler, arananByteDizisi.length);
        } else {
            chatBox.innerHTML += `<div class="message ai-message">${diller[mevcutDil].notFound(girdi)}</div>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    } 
    // Eğer girdi normal bir metinse (selam, soru vb.), CANLI YAPAY ZEKAYA BAĞLAN
    else {
        // Yükleniyor mesajı ekle
        let loadingId = "loading_" + Date.now();
        chatBox.innerHTML += `<div class="message ai-message" id="${loadingId}">${diller[mevcutDil].aiLoading}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
            document.getElementById(loadingId).innerHTML = "⚠️ <b>Hata:</b> Yapay zekanın çalışması için script.js içindeki GEMINI_API_KEY alanına geçerli bir anahtar girmelisin kral.";
            return;
        }

        try {
            // Canlı Google Gemini API İsteği
            // ÖNEMLİ: Yeni "AQ." formatındaki anahtarlar SADECE x-goog-api-key
            // header'ıyla gönderilmeli. URL'ye ?key= olarak da eklemek Google'ı
            // karıştırıp "OAuth2 token bekleniyor" hatasına yol açıyor -
            // bu yüzden URL'de key parametresi YOK.
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": GEMINI_API_KEY
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: buildAiPrompt(girdi) }] }]
                    })
                }
            );

            const data = await response.json();

            // Google başarısız isteklerde de 200 dışı bir status ile birlikte
            // data.error içinde gerçek sebebi döner. Onu yakalayıp gösteriyoruz.
            if (!response.ok) {
                const mesaj = data?.error?.message || `HTTP ${response.status}`;
                throw new Error(mesaj);
            }

            let aiCevap = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiCevap) {
                throw new Error("Yapay zeka boş cevap döndü (muhtemelen içerik filtrelendi).");
            }

            // Yükleniyor yazısını gerçek yapay zeka cevabıyla değiştir
            document.getElementById(loadingId).innerText = aiCevap;

        } catch (error) {
            console.error("Gemini API hatası:", error);
            document.getElementById(loadingId).innerText = "❌ Yapay zeka hatası: " + error.message;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function renderHexView(vurgulanacakIndeksler = [], arananUzunluk = 0) {
    const placeholder = document.getElementById('hexPlaceholder');
    const grid = document.getElementById('hexEditorGrid');
    if(!fileData) return;
    placeholder.style.display = "none"; grid.style.display = "flex"; grid.innerHTML = "";

    for (let i = 0; i < fileData.length; i += 8) {
        let rowDiv = document.createElement('div'); rowDiv.className = 'hex-row';
        let addressDiv = document.createElement('div'); addressDiv.className = 'hex-address';
        addressDiv.innerText = i.toString(16).toUpperCase().padStart(8, '0');
        rowDiv.appendChild(addressDiv);
        let bytesDiv = document.createElement('div'); bytesDiv.className = 'hex-bytes';

        for (let j = 0; j < 8; j++) {
            let currentIndex = i + j; if (currentIndex >= fileData.length) break;
            let byte = fileData[currentIndex];
            let byteBtn = document.createElement('span'); byteBtn.className = 'hex-byte';
            byteBtn.innerText = byte.toString(16).toUpperCase().padStart(2, '0');
            byteBtn.setAttribute('onclick', `editByte(${currentIndex})`);

            if (vurgulanacakIndeksler.some(b => currentIndex >= b && currentIndex < b + arananUzunluk)) {
                byteBtn.style.background = "#a370f7"; byteBtn.style.color = "#fff";
            }
            bytesDiv.appendChild(byteBtn);
        }
        rowDiv.appendChild(bytesDiv); grid.appendChild(rowDiv);
    }
}

function decToHexConvert() {
    let decVal = document.getElementById('decInput').value;
    if(!decVal) return;
    let hex = parseInt(decVal).toString(16).toUpperCase().padStart(4, '0');
    document.getElementById('hexResult').innerText = hex;
    document.getElementById('gameHexResult').innerText = hex.substring(2,4) + " " + hex.substring(0,2);
}

function temizleSohbet() {
    document.getElementById('chatBox').innerHTML = `<div class="message ai-message">${diller[mevcutDil].welcome}</div>`;
}

function editByte(index) {
    let currentHex = fileData[index].toString(16).toUpperCase().padStart(2, '0');
    let newValue = prompt(diller[mevcutDil].promptPrompt(index, currentHex));
    if (newValue !== null && newValue.trim().length === 2) {
        fileData[index] = parseInt(newValue.trim(), 16); renderHexView();
    }
}

function downloadModdedFile() {
    const blob = new Blob([fileData], { type: "application/octet-stream" });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = "modded_ew6_file.bin"; link.click();
}

document.addEventListener("DOMContentLoaded", () => {
    uiGuncelle();
    temizleSohbet();
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            fileData = new Uint8Array(evt.target.result); renderHexView();
            document.getElementById('downloadBtn').style.display = "block";
        };
        reader.readAsArrayBuffer(file);
    });
});
        
