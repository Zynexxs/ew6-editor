let mevcutDil = "tr";
let sohbetGecmisi = [];
let fileData = null;

const SYSTEM_KNOWLEDGE = {
    game_1804: {
        "01": "Osmanlı İmparatorluğu (Ottoman Empire)", "02": "Büyük Britanya (Great Britain)", "03": "Fransa (France)",
        "04": "Rusya (Russia)", "05": "Avusturya (Austria)", "06": "Prusya (Prussia)", "07": "İspanya (Spain)"
    },
    game_1914: {
        "01": "Osmanlı İmparatorluğu (Ottoman Empire)", "02": "Alman İmparatorluğu (German Empire)",
        "03": "Avusturya-Macaristan İmparatorluğu", "05": "Büyük Britanya (United Kingdom)"
    }
};

const diller = {
    tr: {
        placeholder: "Bir şeyler sorun veya hex dizilimi girin...",
        thinking: "✨ Gemini analiz ediyor...",
        welcome: "✨ EW6 1804 & 1914 Modding Assistant aktif. Dosyanızı yükleyip hex dizilimlerini aratabilir veya ülke kodları hakkında sorularınızı yöneltebilirsiniz.",
        lblOpenFile: "📂 Dosya Seç / Open File",
        lblDec: "Sayı / Dec...",
        hexPlaceholder: "Modlamaya başlamak için yukarıdan bir dosya seçiniz...",
        needFile: "⚙️ Bu hex dizilimini aramak için öncelikle yukarıdan bir dosya yüklemelisiniz.",
        found: function(sayi, indeks) { return `🎯 <b>Dizilim Bulundu!</b><br>Eşleşme Sayısı: <b>${sayi}</b><br>İlk İndeks: <b>${indeks}</b>.`; },
        notFound: function(girdi) { return `❌ "${girdi}" dizilimi dosyada bulunamadı.`; },
        systemPrompt: "Sen European War 6 uzmanı bir modlama asistanısın. Kısa, net ve bilgilendirici cevaplar ver.",
        offlineAi: "🤖 Sunucu şu an yoğun. Lütfen birkaç saniye sonra tekrar deneyiniz.",
        promptPrompt: function(indeks, mevcut) { return `İndeks: ${indeks}\nMevcut: ${mevcut}\nYeni Hex (2 karakter):`; },
        resetMsg: "🔮 Hafıza sıfırlandı."
    },
    en: {
        placeholder: "Ask something...",
        thinking: "✨ Gemini analyzing...",
        welcome: "✨ EW6 Assistant active.",
        lblOpenFile: "📂 Open File",
        lblDec: "Number / Dec...",
        hexPlaceholder: "Select a file...",
        needFile: "⚙️ Please upload a file first.",
        found: function(sayi, indeks) { return `🎯 Found <b>${sayi}</b> times.<br>First Index: <b>${indeks}</b>.`; },
        notFound: function(girdi) { return `❌ "${girdi}" not found.`; },
        systemPrompt: "You are an expert EW6 modding assistant. Keep answers brief.",
        offlineAi: "🤖 Server busy. Try again.",
        promptPrompt: function(indeks, mevcut) { return `Index: ${indeks}\nCurrent: ${mevcut}\nNew Hex:`; },
        resetMsg: "🔮 Memory reset."
    }
};

const selamlar = {
    tr: ["merhaba", "selam", "sa", "s.a", "nasılsın", "hey"],
    en: ["hello", "hi", "hey", "how are you"]
};

function dilDegistir() {
    mevcutDil = mevcutDil === "tr" ? "en" : "tr";
    document.getElementById('input').placeholder = diller[mevcutDil].placeholder;
    document.getElementById('lblOpenFile').innerText = diller[mevcutDil].lblOpenFile;
    document.getElementById('decInput').placeholder = diller[mevcutDil].lblDec;
    document.getElementById('welcomeMsg').innerHTML = diller[mevcutDil].welcome;
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
        document.getElementById(aiResponseId).innerHTML = "🔮 Merhaba! Gemini 2.5 aktif. Bugün hangi hex üzerinde çalışıyoruz?";
        return;
    }

    let kodYakala = girdi.match(/\b([0-9a-fA-F]{2})\b/);
    if (kodYakala) {
        let bulunanKod = kodYakala[1].toUpperCase();
        if (SYSTEM_KNOWLEDGE.game_1804[bulunanKod] || SYSTEM_KNOWLEDGE.game_1914[bulunanKod]) {
            let cevap = `📊 <b>${bulunanKod} Kodu Sonuçları:</b><br>`;
            if(SYSTEM_KNOWLEDGE.game_1804[bulunanKod]) cevap += `• 1804: ${SYSTEM_KNOWLEDGE.game_1804[bulunanKod]}<br>`;
            if(SYSTEM_KNOWLEDGE.game_1914[bulunanKod]) cevap += `• 1914: ${SYSTEM_KNOWLEDGE.game_1914[bulunanKod]}<br>`;
            document.getElementById(aiResponseId).innerHTML = cevap;
            return;
        }
    }

    // Saf Hex Arama
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

    // API Çağrısı (Gelişmiş Model ve Hata Tolerans Havuzu)
    sohbetGecmisi.push({"role": "user", "content": girdi});
    let modelHavuzu = [
        "google/gemini-2.5-flash:free",
        "google/gemini-2.5-pro:free",
        "meta-llama/llama-3.1-8b-instruct:free"
    ];
    let basarili = false;

    for (let aktifModel of modelHavuzu) {
        try {
            let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer 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"
                },
                body: JSON.stringify({
                    "model": aktifModel, 
                    "messages": [{ "role": "system", "content": diller[mevcutDil].systemPrompt }, ...sohbetGecmisi]
                })
            });
            
            if (!response.ok) throw new Error("API Hatası");
            
            let data = await response.json();
            if (data.choices && data.choices[0].message) {
                let aiCevap = data.choices[0].message.content.trim();
                document.getElementById(aiResponseId).innerHTML = aiCevap;
                sohbetGecmisi.push({"role": "assistant", "content": aiCevap});
                basarili = true; 
                break;
            }
        } catch (e) { 
            console.log(`${aktifModel} bağlantısı başarısız, sonraki modele geçiliyor...`); 
        }
    }
    if(!basarili) document.getElementById(aiResponseId).innerHTML = diller[mevcutDil].offlineAi;
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

function temizleChatGPT() {
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
