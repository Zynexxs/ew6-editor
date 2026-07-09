let mevcutDil = "tr";
let fileData = null;
let multiSelectMode = false;
let selectedIndices = [];

const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.3-70b-versatile"; 

const SYSTEM_KNOWLEDGE = {
    game_1914: {
        "01": "Osmanlı İmparatorluğu (Ottoman Empire)",
        "02": "Büyük Britanya (Great Britain)"
    }
};

const diller = {
    tr: {
        placeholder: "Hex dizilimi girin veya Yapay Zekaya bir şey sorun...",
        welcome: "🔎 EW6 Pure Hex Engine + Canlı Groq AI Aktif! Hex aratabilir veya özgürce sohbet edebilirsiniz.",
        lblOpenFile: "📂 Dosya Seç / Open File",
        lblDec: "Sayı / Dec...",
        needFile: "⚙️ Hex araması yapabilmek için önce aşağıdan bir dosya yüklemelisin kral.",
        placeholderText: "Modlamak istediğiniz EW6 dosyasını seçin...",
        found: (sayi, indeks) => `🎯 <b>Dizilim Bulundu!</b><br>Eşleşen Blok Sayısı: <b>${sayi}</b><br>İlk Adres: <b>${indeks}</b>.`,
        notFound: (girdi) => `❌ "${girdi}" dizilimi dosyada bulunamadı.`,
        aiLoading: "🤖 Yapay Zeka düşünüyor..."
    },
    en: {
        placeholder: "Enter hex sequence or ask AI anything...",
        welcome: "🔎 EW6 Pure Hex Engine + Live Groq AI Active! Search hex codes or chat freely.",
        lblOpenFile: "📂 Open File / Dosya Seç",
        lblDec: "Number / Dec...",
        needFile: "⚙️ Please upload a file first to search.",
        placeholderText: "Please select an EW6 file to start...",
        found: (sayi, indeks) => `🎯 <b>Sequence Found!</b><br>Matches: <b>${sayi}</b><br>First Offset: <b>${indeks}</b>.`,
        notFound: (girdi) => `❌ "${girdi}" sequence not found in file.`,
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

function toggleSearchInput() {
    let bar = document.getElementById('quickSearchBar');
    bar.style.display = bar.style.display === "none" ? "flex" : "none";
}

function toggleMultiSelectMode() {
    multiSelectMode = !multiSelectMode;
    let btn = document.getElementById('multiSelectToggle');
    if(multiSelectMode) {
        btn.innerText = "🔗 Çoklu Seçim: AÇIK";
        btn.classList.add('active');
    } else {
        btn.innerText = "🔗 Çoklu Seçim: KAPALI";
        btn.classList.remove('active');
        selectedIndices = [];
        document.getElementById('manualAddressInput').value = "";
        renderHexView();
    }
}

function handleByteClick(index) {
    if (multiSelectMode) {
        let position = selectedIndices.indexOf(index);
        if (position > -1) {
            selectedIndices.splice(position, 1);
        } else {
            selectedIndices.push(index);
        }
        document.getElementById('manualAddressInput').value = selectedIndices.map(i => i.toString(16).toUpperCase().padStart(8, '0')).join(', ');
        renderHexView();
    } else {
        selectedIndices = [index];
        document.getElementById('manualAddressInput').value = index.toString(16).toUpperCase().padStart(8, '0');
        document.getElementById('manualHexInput').value = fileData[index].toString(16).toUpperCase().padStart(2, '0');
        renderHexView();
    }
}

function buildAiPrompt(girdi) {
    let rules = `Sen European War 6 (EW6) oyunu ve Hex editör asistanısın. Sadece Türkçe cevap ver, samimi bir dille 'kral' diye hitap ederek kısa ve öz cevap ver. 
Arka Plan Bilgi ve Hafıza Kuralları (Sadece 1914 Yılı Geçerlidir):
- Sana doğrudan "01" denirse veya "01 nedir", "01 hangi ülkenin" gibi sorular sorulursa kesinlikle "Osmanlı İmparatorluğu" diyeceksin.
- Sana doğrudan "02" denirse veya "02 nedir", "02 hangi ülkenin" gibi sorular sorulursa kesinlikle "Büyük Britanya" (veya Britanya) diyeceksin.
- 03, 04, 05 veya diğer hiçbir sayı doğru değildir, onlar sorulursa doğru olmadığını belirtip ülke ismi söylemeyeceksin.`;
    
    if (mevcutDil === "en") {
        rules = `You are an assistant for the European War 6 (EW6) game and hex editor. Reply in English only, in a friendly casual tone calling the user "bro". Keep it short. 1914 rules: 01 is Ottoman Empire, 02 is Great Britain. Others are invalid.`;
    }
    return `${rules}\n\nKullanıcının Gönderdiği Mesaj: ${girdi}`;
}

async function aiAnalizEt() {
    let girdi = document.getElementById('input').value.trim();
    let chatBox = document.getElementById('chatBox');
    if(!girdi) return;

    chatBox.innerHTML += `<div class="message user-message">${girdi}</div>`;
    document.getElementById('input').value = ''; 
    chatBox.scrollTop = chatBox.scrollHeight;

    let bulKelimesiVar = girdi.toLowerCase().includes("bul") || girdi.toLowerCase().includes("ara");
    let temizHex = girdi.toUpperCase().replace(/ARAMA/g, '').replace(/YAP/g, '').replace(/BUL/g, '').replace(/\s+/g, '').trim();
    
    let sadeceYalinKodMu = (temizHex === "01" || temizHex === "02" || temizHex === "03") && !bulKelimesiVar;
    let hexValid = /^[0-9A-F]+$/.test(temizHex) && temizHex.length >= 2 && !sadeceYalinKodMu;

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
            let responseHTML = `${diller[mevcutDil].found(bulunanIndeksler.length, bulunanIndeksler[0].toString(16).toUpperCase().padStart(8, '0'))}`;
            if (temizHex.length === 2 && SYSTEM_KNOWLEDGE.game_1914[temizHex]) {
                responseHTML += `<br><br>📊 <b>EW6 1914 Ülke Karşılığı:</b><br>• ${SYSTEM_KNOWLEDGE.game_1914[temizHex]}`;
            }
            chatBox.innerHTML += `<div class="message ai-message">${responseHTML}</div>`;
            renderHexView(bulunanIndeksler, arananByteDizisi.length);
        } else {
            chatBox.innerHTML += `<div class="message ai-message">${diller[mevcutDil].notFound(girdi)}</div>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        let loadingId = "loading_" + Date.now();
        chatBox.innerHTML += `<div class="message ai-message" id="${loadingId}">${diller[mevcutDil].aiLoading}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const response = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: GROQ_MODEL,
                        messages: [{ role: "user", content: buildAiPrompt(girdi) }]
                    })
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);

            let aiCevap = data?.choices?.[0]?.message?.content;
            document.getElementById(loadingId).innerHTML = aiCevap;

        } catch (error) {
            document.getElementById(loadingId).innerText = "❌ Yapay zeka hatası: " + error.message;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function hizliHexAra() {
    let girdi = document.getElementById('quickSearchInput').value.trim().toUpperCase();
    if(!girdi || !fileData) return;
    
    let arananByteDizisi = [];
    for (let i = 0; i < girdi.length; i += 2) {
        arananByteDizisi.push(parseInt(girdi.substr(i, 2), 16));
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
        renderHexView(bulunanIndeksler, arananByteDizisi.length);
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
            byteBtn.innerText = byte.toString(16).toUpperCase().padStart(2, '0');
            
            byteBtn.setAttribute('onclick', `handleByteClick(${currentIndex})`);

            if (selectedIndices.includes(currentIndex)) {
                byteBtn.classList.add('selected-active');
            }

            if (vurgulanacakIndeksler.some(b => currentIndex >= b && currentIndex < b + arananUzunluk)) {
                byteBtn.style.background = "#a370f7"; byteBtn.style.color = "#fff";
            }
            bytesDiv.appendChild(byteBtn);
        }
        rowDiv.appendChild(bytesDiv); grid.appendChild(rowDiv);
    }
}

function manuelAdresDegistir() {
    let hexStr = document.getElementById('manualHexInput').value.trim();
    if(!hexStr || !fileData || selectedIndices.length === 0) return;

    let yeniByteVal = parseInt(hexStr, 16);
    selectedIndices.forEach(index => {
        if(index < fileData.length) fileData[index] = yeniByteVal;
    });

    renderHexView();
    // Uyarıyı kaldırdık, çoklu seçim aktifse temizlemiyoruz ki rahat işlem yapılsın
    if (!multiSelectMode) {
        selectedIndices = [];
        document.getElementById('manualAddressInput').value = "";
    }
}

function manuelAdresSil() {
    if(!fileData || selectedIndices.length === 0) return;

    selectedIndices.forEach(index => {
        if(index < fileData.length) fileData[index] = 0;
    });

    renderHexView();
    document.getElementById('manualHexInput').value = "00";
    if (!multiSelectMode) {
        selectedIndices = [];
        document.getElementById('manualAddressInput').value = "";
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
                
