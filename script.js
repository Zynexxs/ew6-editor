let mevcutDil = "tr";
let fileData = null;
let secilenIndeksler = []; // Çoklu seçim için tıklanan indeksleri tutar

// Sistemine yeni aldığın çalışır vaziyetteki gerçek API anahtarın doğrudan gömüldü
const GEMINI_API_KEY = "AQ.Ab8RN6KVfdbzA--QAOOGUidgVx32_tXtPaWKjxIRZe1xtyLlvg"; 

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
        found: (sayi, indeks) => `🎯 <b>Dizilim Bulundu!</b><br>Eşleşen Blok Sayısı: <b>${sayi}</b><br>İlk Adres: <b>${indeks}</b> (O bölgeye odaklanıldı).`,
        notFound: (girdi) => `❌ "${girdi}" dizilimi dosyada bulunamadı.`,
        promptPrompt: (indeks, mevcut) => `Adres: ${indeks}\nMevcut Hex: ${mevcut}\nYeni Hex:`,
        aiLoading: "🤖 Yapay Zeka düşünüyor...",
        selectedInfo: (sayi) => `Seçilen Byte Sayısı: ${sayi}`,
        aiPrompt: "Sen European War 6 (EW6) oyunu ve Hex editör asistanısın. Kullanıcıya her zaman Türkçe dilinde, samimi bir dille, 'kral' diye hitap ederek kısa ve öz cevap ver."
    },
    en: {
        placeholder: "Enter hex sequence or ask AI anything...",
        welcome: "🔎 EW6 Pure Hex Engine + Live Gemini AI Active! Search hex codes or chat freely.",
        lblOpenFile: "📂 Open File / Dosya Seç",
        lblDec: "Number / Dec...",
        needFile: "⚙️ Please upload a file first to search.",
        placeholderText: "Please select an EW6 file to start...",
        found: (sayi, indeks) => `🎯 <b>Sequence Found!</b><br>Matches: <b>${sayi}</b><br>First Offset: <b>${indeks}</b> (Scrolled to view).`,
        notFound: (girdi) => `❌ "${girdi}" sequence not found in file.`,
        promptPrompt: (indeks, mevcut) => `Index: ${indeks}\nCurrent Hex: ${mevcut}\nNew Hex:`,
        aiLoading: "🤖 AI is thinking...",
        selectedInfo: (sayi) => `Selected Bytes: ${sayi}`,
        aiPrompt: "You are the European War 6 (EW6) game and Hex editor assistant. Always reply to the user in English, with a friendly tone, calling them 'king', and keep your answers brief and concise."
    }
};

function uiGuncelle() {
    document.getElementById('input').placeholder = diller[mevcutDil].placeholder;
    document.getElementById('lblOpenFile').innerText = diller[mevcutDil].lblOpenFile;
    document.getElementById('decInput').placeholder = diller[mevcutDil].lblDec;
    document.getElementById('selectedCountInfo').innerText = diller[mevcutDil].selectedInfo(secilenIndeksler.length);
    if(!fileData) {
        document.getElementById('hexPlaceholder').innerText = diller[mevcutDil].placeholderText;
    }
}

function dilDegistir() {
    mevcutDil = mevcutDil === "tr" ? "en" : "tr";
    uiGuncelle();
    document.getElementById('chatBox').innerHTML = `<div class="message ai-message">${diller[mevcutDil].welcome}</div>`;
}

async function aiAnalizEt() {
    let girdi = document.getElementById('input').value.trim();
    let chatBox = document.getElementById('chatBox');
    if(!girdi) return;

    chatBox.innerHTML += `<div class="message user-message">${girdi}</div>`;
    document.getElementById('input').value = ''; 
    chatBox.scrollTop = chatBox.scrollHeight;

    // Kullanıcının yazdığı ekstra arama komutlarını temizleyip sadece ham hex kodunu izole etme
    let temizHex = girdi.toUpperCase().replace(/ARAMA/g, '').replace(/YAP/g, '').replace(/BUL/g, '').replace(/\s+/g, '').trim();
    let hexValid = /^[0-9A-F]+$/.test(temizHex) && temizHex.length >= 2;

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
            
            // Grid'i tazele ve bulunan ilk byte bloğunun üstüne ekranı akıcı kaydır
            renderHexView(bulunanIndeksler, arananByteDizisi.length);
            setTimeout(() => {
                let hedefByte = document.querySelector('.highlighted-hex');
                if (hedefByte) hedefByte.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);

        } else {
            chatBox.innerHTML += `<div class="message ai-message">${diller[mevcutDil].notFound(girdi)}</div>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    } 
    else {
        let loadingId = "loading_" + Date.now();
        chatBox.innerHTML += `<div class="message ai-message" id="${loadingId}">${diller[mevcutDil].aiLoading}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
            document.getElementById(loadingId).innerHTML = "⚠️ <b>Hata:</b> Geçersiz API anahtarı.";
            return;
        }

        try {
            // "AQ." Tipi anahtarlar için header korumalı ve güncel dilli fetch çağrısı
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": GEMINI_API_KEY
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${diller[mevcutDil].aiPrompt} Kullanıcının mesajı: ${girdi}` }] }]
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const mesaj = data?.error?.message || `HTTP ${response.status}`;
                throw new Error(mesaj);
            }

            let aiCevap = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!aiCevap) throw new Error("Yapay zeka boş cevap döndü.");

            document.getElementById(loadingId).innerText = aiCevap;

        } catch (error) {
            console.error("Gemini Hatası:", error);
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
    document.getElementById('manualMenu').style.display = "block"; 

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
            byteBtn.id = `byte_${currentIndex}`;
            byteBtn.innerText = byte.toString(16).toUpperCase().padStart(2, '0');
            
            // Byte'a tıklandığında çoklu seçim tetiklenir
            byteBtn.setAttribute('onclick', `toggleByteSelection(${currentIndex})`);

            // Arama sonuçlarını renklendirme
            if (vurgulanacakIndeksler.some(b => currentIndex >= b && currentIndex < b + arananUzunluk)) {
                byteBtn.classList.add('highlighted-hex');
                byteBtn.style.background = "#a370f7"; byteBtn.style.color = "#fff";
            }
            // Aktif seçilmiş manuel byte sınırları
            if (secilenIndeksler.includes(currentIndex)) {
                byteBtn.style.border = "2px solid #ff4757";
                byteBtn.style.background = "#2f3542";
                byteBtn.style.color = "#fff";
            }
            bytesDiv.appendChild(byteBtn);
        }
        rowDiv.appendChild(bytesDiv); grid.appendChild(rowDiv);
    }
}

function toggleByteSelection(index) {
    let byteElement = document.getElementById(`byte_${index}`);
    let idx = secilenIndeksler.indexOf(index);
    
    if (idx > -1) {
        secilenIndeksler.splice(idx, 1);
        byteElement.style.border = "none";
        byteElement.style.background = "";
        byteElement.style.color = "";
    } else {
        secilenIndeksler.push(index);
        byteElement.style.border = "2px solid #ff4757";
        byteElement.style.background = "#2f3542";
        byteElement.style.color = "#fff";
    }
    document.getElementById('selectedCountInfo').innerText = diller[mevcutDil].selectedInfo(secilenIndeksler.length);
}

function topluDegistir() {
    let yeniDeger = document.getElementById('batchHexInput').value.trim().toUpperCase();
    if (yeniDeger.length !== 2 || !/^[0-9A-F]{2}$/.test(yeniDeger)) {
        alert("Lütfen 2 haneli geçerli bir hex girin kral! (Örn: FF)");
        return;
    }
    if (secilenIndeksler.length === 0) return;
    
    secilenIndeksler.forEach(idx => { fileData[idx] = parseInt(yeniDeger, 16); });
    alert(`${secilenIndeksler.length} adet byte başarıyla değiştirildi!`);
    secimleriTemizle();
}

function topluSil() {
    if (secilenIndeksler.length === 0) return;
    secilenIndeksler.forEach(idx => { fileData[idx] = 0; });
    alert(`${secilenIndeksler.length} adet byte sıfırlandı (00)!`);
    secimleriTemizle();
}

function secimleriTemizle() {
    secilenIndeksler = [];
    renderHexView();
    uiGuncelle();
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
