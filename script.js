let mevcutDil = "tr";
let sohbetGecmisi = [];
let fileData = null;

// Google AI Studio API Anahtarın
const GEMINI_API_KEY = "AQ.Ab8RN6I4JAigLICjgAm6kAJGzjtxGfUouosW12bYbk4Ce1Hu5A";

const SYSTEM_KNOWLEDGE = {
    game_1804: {
        "01": "Osmanlı İmparatorluğu", "02": "Büyük Britanya", "03": "Fransa",
        "04": "Rusya", "05": "Avusturya", "06": "Prusya", "07": "İspanya"
    },
    game_1914: {
        "01": "Osmanlı İmparatorluğu", "02": "Alman İmparatorluğu",
        "03": "Avusturya-Macaristan", "05": "Büyük Britanya"
    }
};

const diller = {
    tr: {
        placeholder: "Bir şeyler sorun veya hex dizilimi girin...",
        thinking: "✨ Gemini analiz ediyor...",
        welcome: "✨ EW6 1804 & 1914 Modding Assistant aktif. Dosyanızı yükleyip hex dizilimlerini aratabilir veya ülke kodları hakkında sorularınızı yöneltebilirsiniz.",
        lblOpenFile: "📂 Dosya Seç / Open File",
        lblDec: "Sayı / Dec...",
        needFile: "⚙️ Bu hex dizilimini aramak için öncelikle yukarıdan bir dosya yüklemelisiniz.",
        found: function(sayi, indeks) { return `🎯 <b>Dizilim Bulundu!</b><br>Eşleşme Sayısı: <b>${sayi}</b><br>İlk İndeks: <b>${indeks}</b>.`; },
        notFound: function(girdi) { return `❌ "${girdi}" dizilimi dosyada bulunamadı.`; },
        systemPrompt: "Sen European War 6 uzmanı bir modlama asistanısın. Kısa, net ve bilgilendirici cevaplar ver. Her zaman Türkçe cevap ver.",
        offlineAi: "🤖 Google API Bağlantı Hatası. Lütfen anahtarınızı veya internetinizi kontrol edin.",
        promptPrompt: function(indeks, mevcut) { return `İndeks: ${indeks}\nMevcut: ${mevcut}\nYeni Hex (2 karakter):`; }
    },
    en: {
        placeholder: "Ask something or enter hex sequence...",
        thinking: "✨ Gemini analyzing...",
        welcome: "✨ EW6 1804 & 1914 Modding Assistant is active. Upload a file and search for hex sequences or ask about country codes.",
        lblOpenFile: "📂 Open File / Dosya Seç",
        lblDec: "Number / Dec...",
        needFile: "⚙️ Please upload a file first to search this hex sequence.",
        found: function(sayi, indeks) { return `🎯 <b>Sequence Found!</b><br>Matches: <b>${sayi}</b><br>First Index: <b>${indeks}</b>.`; },
        notFound: function(girdi) { return `❌ "${girdi}" sequence not found in file.`; },
        systemPrompt: "You are an expert European War 6 modding assistant. Keep answers brief and clear. Always reply in English.",
        offlineAi: "🤖 Google API Connection Error. Please check your key or connection.",
        promptPrompt: function(indeks, mevcut) { return `Index: ${indeks}\nCurrent: ${mevcut}\nNew Hex (2 characters):`; }
    }
};

const selamlar = {
    tr: ["merhaba", "selam", "sa", "s.a", "nasılsın", "hey"],
    en: ["hello", "hi", "hey", "how are you"]
};

function dilDegistir() {
    mevcutDil = mevcutDil === "tr" ? "en" : "tr";
    
    // Arayüz elemanlarını güncelle
    document.getElementById('input').placeholder = diller[mevcutDil].placeholder;
    document.getElementById('lblOpenFile').innerText = diller[mevcutDil].lblOpenFile;
    document.getElementById('decInput').placeholder = diller[mevcutDil].lblDec;
    
    // Karşılama mesajını dile göre sıfırla
    document.getElementById('chatBox').innerHTML = `<div class="message ai-message">${diller[mevcutDil].welcome}</div>`;
}

async function aiAnalizEt() {
    let girdi = document.getElementById('input').value.trim();
    let chatBox = document.getElementById('chatBox');
    if(!girdi) return;

    chatBox.innerHTML += `<div class="message user-message">${girdi}</div>`;
    document.getElementById('input').value = ''; 

    let aiResponseId = "ai-" + Date.now();
    chatBox.innerHTML += `<div class="message ai-message" id="${aiResponseId}">${diller[mevcutDil].thinking}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    let temizGirdi = girdi.toLowerCase().replace(/\s+/g, ' ');

    if (selamlar[mevcutDil].includes(temizGirdi)) {
        document.getElementById(aiResponseId).innerHTML = mevcutDil === "tr" ? "🔮 Merhaba! Gemini aktif. Bugün hangi hex üzerinde çalışıyoruz?" : "🔮 Hello! Gemini is active. Which hex are we working on today?";
        return;
    }

    let kodYakala = girdi.match(/\b([0-9a-fA-F]{2})\b/);
    if (kodYakala) {
        let bulunanKod = kodYakala[1].toUpperCase();
        if (SYSTEM_KNOWLEDGE.game_1804[bulunanKod] || SYSTEM_KNOWLEDGE.game_1914[bulunanKod]) {
            let cevap = `📊 <b>${bulunanKod} Kodu Sonuçları / Results:</b><br>`;
            if(SYSTEM_KNOWLEDGE.game_1804[bulunanKod]) cevap += `• 1804: ${SYSTEM_KNOWLEDGE.game_1804[bulunanKod]}<br>`;
            if(SYSTEM_KNOWLEDGE.game_1914[bulunanKod]) cevap += `• 1914: ${SYSTEM_KNOWLEDGE.game_1914[bulunanKod]}<br>`;
            document.getElementById(aiResponseId).innerHTML = cevap;
            return;
        }
    }

    let hexPattern = /^[0-9a-fA-F\s]+$/;
    if (hexPattern.test(temizGirdi) && temizGirdi.length >= 2 && !temizGirdi.includes(' ')) {
        if (!fileData) { document.getElementById(aiResponseId).innerHTML = diller[mevcutDil].needFile; return; }
        let arananByteDizisi = temizGirdi.split('').map((c, i) => i % 2 === 0 ? temizGirdi.substr(i, 2) : null).filter(x => x).map(h => parseInt(h, 16));
        let bulunanIndeksler = [];

        for (let i = 0; i <= fileData.length - arananByteDizisi.length; i++) {
            let eslesme = true;
            for (let j = 0; j < arananByteDizisi.length; j++) {
                if (fileData[i + j] !== arananByteDizisi[j]) { eslesme = false; break; }
            }
            if (eslesme) bulunanIndeksler.push(i);
        }

        if (bulunanIndeksler.length > 0) {
            document.getElementById(aiResponseId).innerHTML = diller[mevcutDil].found(bulunanIndeksler.length, bulunanIndeksler[0]);
            renderHexView(bulunanIndeksler, arananByteDizisi.length);
        } else {
            document.getElementById(aiResponseId).innerHTML = diller[mevcutDil].notFound(girdi);
        }
        return;
    }

    try {
        // Parametrik URL doğrulaması kullanarak istek gönderimi
        let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        let response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{ "text": diller[mevcutDil].systemPrompt + "\nUser Question: " + girdi }]
                }]
            })
        });

        let data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            document.getElementById(aiResponseId).innerHTML = data.candidates[0].content.parts[0].text.trim();
        } else {
            throw new Error();
        }
    } catch (e) {
        document.getElementById(aiResponseId).innerHTML = diller[mevcutDil].offlineAi;
    }
}

function renderHexView(vurgulanacakIndeksler = [], arananUzunluk = 0) {
    const placeholder = document.getElementById('hexPlaceholder');
    const grid = document.getElementById('hexEditorGrid');
    if(!fileData) return;
    placeholder.style.display = "none"; grid.style.display = "flex"; grid.innerHTML = "";

    for (let i = 0; i < fileData.length; i += 8) {
        let rowDiv = document.createElement('div'); rowDiv.className = 'hex-row';
        let offsetDiv = document.createElement('div'); offsetDiv.className = 'hex-offset';
        offsetDiv.innerText = i.toString(16).toUpperCase().padStart(8, '0');
        rowDiv.appendChild(offsetDiv);
        let bytesDiv = document.createElement('div'); bytesDiv.className = 'hex-bytes';

        for (let j = 0; j < 8; j++) {
            let currentIndex = i + j; if (currentIndex >= fileData.length) break;
            let byte = fileData[currentIndex];
            let byteBtn = document.createElement('span'); byteBtn.className = 'hex-byte-btn';
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

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                fileData = new Uint8Array(evt.target.result); renderHexView();
                document.getElementById('downloadBtn').style.display = "block";
            };
            reader.readAsArrayBuffer(file);
        });
    }
});

function decToHexConvert() {
    let decVal = document.getElementById('decInput').value;
    if(!decVal) return;
    let hex = parseInt(decVal).toString(16).toUpperCase().padStart(4, '0');
    document.getElementById('hexResult').innerText = hex;
    document.getElementById('gameHexResult').innerText = hex.substring(2,4) + " " + hex.substring(0,2);
}

function temizleSohbet() {
    document.getElementById('chatBox').innerHTML = `<div class="message ai-message">${diller[mevcutDil].welcome}</div>`;
    sohbetGecmisi = [];
}

function editByte(index) {
    let newValue = prompt(diller[mevcutDil].promptPrompt(index, fileData[index].toString(16).toUpperCase()));
    if (newValue && newValue.trim().length === 2) {
        fileData[index] = parseInt(newValue.trim(), 16); renderHexView();
    }
}

function downloadModdedFile() {
    const blob = new Blob([fileData], { type: "application/octet-stream" });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = "modlu_dosya.bin"; link.click();
            }
