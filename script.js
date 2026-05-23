let medicalData = [];
// جلب البيانات من ملف data.json
fetch('data.json')
    .then(response => response.json())
    .then(data => { medicalData = data; });

// منطق البحث
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    const filtered = medicalData.filter(item => item.name.toLowerCase().includes(searchTerm));

    filtered.forEach(item => {
        resultsDiv.innerHTML += `
            <div style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
                <h3>${item.name}</h3>
                <p><strong>الأعراض:</strong> ${item.symptoms}</p>
                <p><strong>العلاج:</strong> ${item.treatment}</p>
            </div>`;
    });
});