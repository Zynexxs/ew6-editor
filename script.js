// Sohbet geçmişini tutacak hafıza havuzu
let sohbetGecmisi = [];

async function aiAnalizEt() {
    let girdi = document.getElementById('input').value.trim();
    let chatBox = document.getElementById('chatBox');
    if(!girdi) return;

    // Kullanıcı mesajını bas
    chatBox.innerHTML += `<div class="message user-message">${girdi}</div>`;
    document.getElementById('input').value = ''; 

    let aiResponseId = "ai-" + Date.now();
    chatBox.innerHTML += `<div class="message ai-message" id="${aiResponseId}">🤔 Düşünüyorum...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Hafızaya ekle
    sohbetGecmisi.push({"role": "user", "content": girdi});

    try {
        // CORS politikalarına takılmayan, API Key istemeyen ve özgürce her soruya cevap veren yeni altyapı
        let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "HTTP-Referer": "https://codepen.io",
                "X-Title": "EW6 Assistant PRO"
            },
            body: JSON.stringify({
                "model": "meta-llama/llama-3-8b-instruct:free",
                "messages": [
                    {
                        "role": "system", 
                        "content": "Sen samimi, dost canlısı, zeki bir oyun hile, modlama ve hex asistanısın. Kullanıcıya 'kral', 'reis' veya ismiyle hitap edebilirsin. EW6 (European War 6) oyunu, general kodları, hex yapıları, madalya düzenleme ve genel her türlü genel kültür, yazılım veya günlük sohbet sorusuna mükemmel ve akıcı bir Türkçe ile cevap verirsin."
                    },
                    ...sohbetGecmisi
                ]
            })
        });

        let data = await response.json();
        let aiCevap = "";
        
        if (data.choices && data.choices[0].message) {
            aiCevap = data.choices[0].message.content.trim();
            // Yapay zekanın cevabını da hafızaya ekle
            sohbetGecmisi.push({"role": "assistant", "content": aiCevap});
        } else {
            aiCevap = getOfflineResponse(girdi);
        }

        document.getElementById(aiResponseId).innerHTML = aiCevap;

    } catch (error) {
        // Kesinti anında siteyi ayakta tutan akıllı lokal beyin fonksiyonu
        document.getElementById(aiResponseId).innerHTML = getOfflineResponse(girdi);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Lokal Hazır Cevap Sistemi (Hızlı Koruma)
function getOfflineResponse(query) {
    let q = query.toLowerCase();
    if (q.includes("merhaba") || q.includes("selam")) {
        return "🤖 Selamlar kral! Bağlantıyı şu an lokal moda çektim ama buradayım. Söyle bakalım neyi modluyoruz?";
    }
    if (q.includes("nasılsın")) {
        return "🤖 Bomba gibiyim kral, seni sormalı? Dönüştürücüler ve paneller emrinde!";
    }
    if (q.includes("hex") || q.includes("mod") || q.includes("kod")) {
        return "🤖 Taktik basit reis: Sayıyı yukarıdaki kutuya gir, aldığın Little Endian oyun kodunu aşağıdaki dosya editöründen bularak üzerine tıkla ve değiştir.";
    }
    return `🤖 Mesajını aldım kral: "${query}". Sunucu o anlık meşgul olsa bile alt kısımdaki hızlı dönüştürücü ve dosya hex yükleyicisi tamamen tarayıcında bağımsız çalışıyor!`;
}

// Sayı Çevirici Fonksiyon
function decToHexConvert() {
    let decVal = document.getElementById('decInput').value;
    let hexRes = document.getElementById('hexResult');
    let gameHexRes = document.getElementById('gameHexResult');

    if(!decVal) {
        hexRes.innerText = "0000";
        gameHexRes.innerText = "00 00";
        return;
    }

    let sayi = parseInt(decVal);
    let hex = sayi.toString(16).toUpperCase().padStart(4, '0');
    let gameHex = hex.substring(2, 4) + " " + hex.substring(0, 2);

    hexRes.innerText = hex;
    gameHexRes.innerText = gameHex;
}

function temizleChatGPT() {
    document.getElementById('chatBox').innerHTML = `<div class="message ai-message">Sohbet ve hafıza sıfırlandı kral. İstediğini yazabilirsin!</div>`;
    document.getElementById('input').value = '';
    sohbetGecmisi = [];
}

// DOSYA HEX EDİTÖRÜ MODÜLÜ
let fileData = null;

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById('fileInput');
    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                fileData = new Uint8Array(evt.target.result);
                renderHex();
            };
            reader.readAsArrayBuffer(file);
        });
    }
});

function renderHex() {
    const viewer = document.getElementById('hexViewer');
    if(!viewer) return;
    viewer.innerHTML = "";
    
    fileData.forEach((byte, index) => {
        let hexString = byte.toString(16).toUpperCase().padStart(2, '0');
        viewer.innerHTML += `<span class="hex-byte-btn" onclick="editByte(${index})">${hexString}</span>`;
    });
    
    document.getElementById('downloadBtn').style.display = "block";
}

function editByte(index) {
    let currentHex = fileData[index].toString(16).toUpperCase().padStart(2, '0');
    let newValue = prompt(`Seçilen İndeks: ${index}\nMevcut Değer: ${currentHex}\nYeni Hex değerini girin (2 karakterli):`);
    
    if (newValue !== null) {
        newValue = newValue.trim();
        if(newValue.length === 2) {
            fileData[index] = parseInt(newValue, 16);
            renderHex();
        }
    }
}

function downloadModdedFile() {
    if (!fileData) return;
    const blob = new Blob([fileData], { type: "application/octet-stream" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "modlu_dosya.bin";
    link.click();
}
