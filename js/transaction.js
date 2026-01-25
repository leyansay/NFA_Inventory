// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_hLdWDYdBsZFmhTFpg4QIzdOiB9JxxIw",
    authDomain: "nfa-main.firebaseapp.com",
    databaseURL: "https://nfa-main-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "nfa-main",
    storageBucket: "nfa-main.firebasestorage.app",
    messagingSenderId: "314192469082",
    appId: "1:314192469082:web:2f301895179a22dbe68c63",
    measurementId: "G-ZEJP0S67SY"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
console.log("Firebase initialized:", firebase.apps.length > 0);

let allTransactions = [];
let currentSortOrder = 'newest';

// Store all data for table modals
let activitiesData = [];
let sacksData = [];
let varietiesData = [];

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
}

/* LOAD DROPDOWN OPTIONS */
function loadDropdownOptions() {
    // Load activities
    database.ref('activities').once('value').then((snapshot) => {
        activitiesData = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.activityCode) {
                    activitiesData.push({
                        code: data.activityCode,
                        description: data.description || data.activityDescription || '-',
                        abbreviation: data.abbreviation ||'-',
                        includeTA: data.includeTA ||'-',
                        inWhse: data.inWhse ||'-'
                    });
                }
            });
            activitiesData.sort((a, b) => a.code.localeCompare(b.code));
        }
    });

    // Load sacks
    database.ref('sacks').once('value').then((snapshot) => {
        sacksData = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.sackCode) {
                    sacksData.push({
                        code: data.sackCode,
                        brandNew: data.brandNew || 0,
                        secondHand: data.secondHand || 0,
                        mendable: data.mendable || 0
                    });
                }
            });
            sacksData.sort((a, b) => a.code.localeCompare(b.code));
        }
    });

    // Load varieties
    database.ref('varieties').once('value').then((snapshot) => {
        varietiesData = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.varietyCode) {
                    varietiesData.push({
                        code: data.varietyCode,
                        description: data.description || data.varietyDescription || '-',
                        cerealType:data.cerealType || "-"
                    });
                }
            });
            varietiesData.sort((a, b) => a.code.localeCompare(b.code));
        }
    });
}

/* CREATE SELECTION MODALS */
function createSelectionModal(title, columns, data, onSelect) {
    // Remove existing modal if any
    const existingModal = document.getElementById('selectionModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'selectionModal';
    modal.className = 'modal active';
    
    let tableHeaders = columns.map(col => `<th>${col.label}</th>`).join('');
    let tableRows = data.map((item, index) => {
        let cells = columns.map(col => `<td>${item[col.key]}</td>`).join('');
        return `<tr class="selectable-row" data-index="${index}">${cells}</tr>`;
    }).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="close-btn" id="closeSelectionModal">×</button>
            </div>
            <div class="modal-body">
                <input type="text" id="selectionSearch" class="form-input" placeholder="Search..." style="margin-bottom: 15px;">
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="officer-table">
                        <thead>
                            <tr>${tableHeaders}</tr>
                        </thead>
                        <tbody id="selectionTableBody">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button
    document.getElementById('closeSelectionModal').onclick = () => modal.remove();

    // Search functionality
    const searchInput = document.getElementById('selectionSearch');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#selectionTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // Row selection
    document.querySelectorAll('.selectable-row').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            onSelect(data[index]);
            modal.remove();
        });
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f0f0f0';
        });
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

/* SHOW ACTIVITY SELECTION */
function showActivitySelection() {
    createSelectionModal(
        'Select Activity Code',
        [
            { label: 'Activity Code', key: 'code' },
            { label: 'Description', key: 'description' },
            { label: 'Abbreviation', key: 'abbreviation' },
            { label: 'Include In TA', key: 'includeTA' },
            { label: 'In-Whse. Act.', key: 'inWhse' }
        ],
        activitiesData,
        (selected) => {
            document.getElementById('activityCode').value = selected.code;
        }
    );
}

/* SHOW SACK SELECTION */
function showSackSelection() {
    createSelectionModal(
        'Select Sack Code',
        [
            { label: 'Sack Code', key: 'code' },
            { label: 'Brand New', key: 'brandNew' },
            { label: 'Second Hand', key: 'secondHand' },
            { label: 'Mendable', key: 'mendable' }
        ],
        sacksData,
        (selected) => {
            document.getElementById('sackCode').value = selected.code;
            document.getElementById('sackCondition').disabled = false;
            document.getElementById('sackCondition').value = '';
            document.getElementById('sackWeight').value = '';
        }
    );
}

/* SHOW VARIETY SELECTION */
function showVarietySelection() {
    createSelectionModal(
        'Select Variety Code',
        [
            { label: 'Variety Code', key: 'code' },
            { label: 'Description', key: 'description' },
            { label: 'Cereal Type', key: 'cerealType' }
        ],
        varietiesData,
        (selected) => {
            document.getElementById('varietyCode').value = selected.code;
        }
    );
}

/* LOAD OFFICERS */
function loadOfficersFromFirebase() {
    const officersRef = database.ref('accountableOfficers');
    const tbody = document.querySelector("#officerModal tbody");
    
    officersRef.once('value').then((snapshot) => {
        tbody.innerHTML = "";
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No officers added yet</td></tr>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            let periodDisplay = "";
            if (data.fromDate && data.toDate) {
                periodDisplay = `${data.fromDate} / ${data.toDate}`;
            } else {
                periodDisplay = "-";
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${data.officerId || "-"}</td>
                <td>${data.lastName || "-"}</td>
                <td>${data.firstName || "-"}</td>
                <td>${data.middleName || "-"}</td>
                <td>${data.warehouse || "-"}</td>
                <td>${data.warehouseName || "-"}</td>
                <td>${periodDisplay}</td>
                <td><button class="select-officer-btn selectOfficer">Select</button></td>
            `;
            tbody.appendChild(tr);
        });

        attachOfficerSelectListeners();
    }).catch((error) => {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Error loading officers</td></tr>';
    });
}

/* LOAD OFFICERS FOR PREVIEW */
let officersData = {};
let transactionsData = {};
let warehousesData = {};

function loadPreviewData() {
    Promise.all([
        database.ref('accountableOfficers').once('value'),
        database.ref('transactions').once('value'),
        database.ref('warehouses').once('value')
    ]).then(([officersSnapshot, transactionsSnapshot, warehousesSnapshot]) => {
        
        officersData = {};
        if (officersSnapshot.exists()) {
            officersSnapshot.forEach((child) => {
                const data = child.val();
                officersData[data.officerId] = data;
            });
        }

        warehousesData = {};
        if (warehousesSnapshot.exists()) {
            warehousesSnapshot.forEach((child) => {
                const data = child.val();
                warehousesData[data.warehouseId] = data.location || '-';
            });
        }

        transactionsData = {};
        if (transactionsSnapshot.exists()) {
            transactionsSnapshot.forEach((child) => {
                const data = child.val();
                const key = `${data.officerId}_${data.warehouseId}`;
                if (!transactionsData[key]) {
                    transactionsData[key] = [];
                }
                transactionsData[key].push(data);
            });
        }

        setupPreviewForm();
    }).catch((error) => {
        console.error('Error loading preview data:', error);
        alert('Error loading data. Please try again.');
    });
}

function setupPreviewForm() {
    const officerIdInput = document.getElementById('previewOfficerId');
    const officerNameInput = document.getElementById('previewOfficerName');
    const warehouseNameInput = document.getElementById('previewWarehouseName');
    const warehouseLocationInput = document.getElementById('previewWarehouseLocation');
    const periodFromInput = document.getElementById('previewPeriodFrom');
    const periodToInput = document.getElementById('previewPeriodTo');

    officerIdInput.addEventListener('input', function() {
        const officerId = this.value.trim();
        
        if (officerId && officersData[officerId]) {
            const officer = officersData[officerId];
            
            const fullName = `${officer.lastName || ''}, ${officer.firstName || ''} ${officer.middleName || ''}`.trim();
            officerNameInput.value = fullName;
            warehouseNameInput.value = officer.warehouseName || '-';
            warehouseLocationInput.value = warehousesData[officer.warehouse] || '-';
            
            if (officer.fromDate) {
                periodFromInput.value = officer.fromDate;
            }
            if (officer.toDate) {
                periodToInput.value = officer.toDate;
            }
        } else {
            officerNameInput.value = '';
            warehouseNameInput.value = '';
            warehouseLocationInput.value = '';
        }
    });
}

/* HANDLE PREVIEW FORM SUBMISSION */
document.getElementById('previewForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const officerId = document.getElementById('previewOfficerId').value.trim();
    const officerName = document.getElementById('previewOfficerName').value;
    const warehouseName = document.getElementById('previewWarehouseName').value;
    const warehouseLocation = document.getElementById('previewWarehouseLocation').value;
    const periodFrom = document.getElementById('previewPeriodFrom').value;
    const periodTo = document.getElementById('previewPeriodTo').value;
    
    if (!officerId || !officerName || !periodFrom || !periodTo) {
        alert('Please fill in all required fields');
        return;
    }

    const officer = officersData[officerId];
    if (!officer) {
        alert('Officer not found. Please enter a valid Officer ID.');
        return;
    }

    const params = new URLSearchParams({
        officerId: officerId,
        officerName: officerName,
        warehouseId: officer.warehouse,
        warehouseName: warehouseName,
        warehouseLocation: warehouseLocation,
        periodFrom: periodFrom,
        periodTo: periodTo
    });
    
    window.open(`transaction_preview.html?${params.toString()}`, '_blank');
    document.getElementById('previewModal').classList.remove('active');
    
    this.reset();
});

/* OPEN MODALS */
document.getElementById("addTransaction").onclick = () => {
    loadOfficersFromFirebase();
    loadDropdownOptions();
    document.getElementById('officerModal').classList.add('active');
};

document.getElementById("previewTransaction").onclick = () => {
    loadPreviewData();
    document.getElementById('previewModal').classList.add('active');
};

document.getElementById("closeOfficer").onclick = () => {
    document.getElementById('officerModal').classList.remove('active');
};

document.getElementById("closePreview").onclick = () => {
    document.getElementById('previewModal').classList.remove('active');
};

document.getElementById("closeTransaction").onclick = () => {
    document.getElementById('transactionModal').classList.remove('active');
};

/* SELECT OFFICER */
function attachOfficerSelectListeners() {
    document.querySelectorAll(".selectOfficer").forEach(btn => {
        btn.addEventListener("click", function () {
            const row = this.closest("tr");
            document.getElementById("officerId").value = row.children[0].textContent;
            document.getElementById("officerName").value = `${row.children[1].textContent}, ${row.children[2].textContent} ${row.children[3].textContent}`;
            document.getElementById("warehouseId").value = row.children[4].textContent;
            document.getElementById("warehouseName").value = row.children[5].textContent;

            const period = row.children[6].textContent.split(" / ");
            document.getElementById("periodFrom").value = period[0] || "";
            document.getElementById("periodTo").value = period[1] || "";

            document.getElementById('officerModal').classList.remove('active');
            document.getElementById('transactionModal').classList.add('active');
            setupSackInteraction();
            setupFieldClickHandlers();
        });
    });
}

/* SETUP FIELD CLICK HANDLERS */
function setupFieldClickHandlers() {
    // Activity Code
    const activityInput = document.getElementById('activityCode');
    activityInput.style.cursor = 'pointer';
    activityInput.readOnly = true;
    activityInput.onclick = () => showActivitySelection();

    // Sack Code
    const sackInput = document.getElementById('sackCode');
    sackInput.style.cursor = 'pointer';
    sackInput.readOnly = true;
    sackInput.onclick = () => showSackSelection();

    // Variety Code
    const varietyInput = document.getElementById('varietyCode');
    varietyInput.style.cursor = 'pointer';
    varietyInput.readOnly = true;
    varietyInput.onclick = () => showVarietySelection();
    
    // Recd From / Issd To - Make it a regular text input
    const locationInput = document.getElementById('recdFromIssdTo');
    locationInput.style.cursor = 'text';
    locationInput.readOnly = false;
    locationInput.onclick = null;
}

/* SACK INTERACTION */
function setupSackInteraction() {
    const sackConditionSelect = document.getElementById('sackCondition');
    const sackWeightInput = document.getElementById('sackWeight');
    const sackCodeInput = document.getElementById('sackCode');
    
    sackConditionSelect.addEventListener('change', function() {
        const selectedCode = sackCodeInput.value;
        const selectedCondition = this.value;
        
        if (selectedCode && selectedCondition) {
            const sack = sacksData.find(s => s.code === selectedCode);
            if (sack) {
                let weight = 0;
                if (selectedCondition === 'Brand New') weight = sack.brandNew || 0;
                else if (selectedCondition === 'Second Hand') weight = sack.secondHand || 0;
                else if (selectedCondition === 'Mendable') weight = sack.mendable || 0;
                
                sackWeightInput.value = weight;
                computeNetWeight();
            }
        } else {
            sackWeightInput.value = "";
            computeNetWeight();
        }
    });
}

/* NET WEIGHT COMPUTATION */
function computeNetWeight() {
    const gross = parseFloat(document.getElementById("grossWeight").value) || 0;
    const sack = parseFloat(document.getElementById("sackWeight").value) || 0;
    const bags = parseFloat(document.getElementById("numberOfBags").value) || 0;
    
    const totalSackWeight = sack * bags;
    document.getElementById("netWeight").value = (gross - totalSackWeight).toFixed(2);
}

document.getElementById("grossWeight").addEventListener("input", computeNetWeight);
document.getElementById("sackWeight").addEventListener("input", computeNetWeight);
document.getElementById("numberOfBags").addEventListener("input", computeNetWeight);

/* SAVE TRANSACTION */
document.getElementById("transactionForm").onsubmit = e => {
    e.preventDefault();
    
    const form = e.target;
    const editId = form.getAttribute('data-edit-id');
    
    const transactionData = {
        officerId: document.getElementById("officerId").value,
        officerName: document.getElementById("officerName").value,
        warehouseId: document.getElementById("warehouseId").value,
        warehouseName: document.getElementById("warehouseName").value,
        periodFrom: document.getElementById("periodFrom").value,
        periodTo: document.getElementById("periodTo").value,
        documentNo: document.getElementById("documentNo").value || "",
        documentType: document.getElementById("documentType").value || "",
        orNo: document.getElementById("orNo").value || "",
        aiNo: document.getElementById("aiNo").value || "",
        refWSINo: document.getElementById("refWSINo").value || "",
        recdFromIssdTo: document.getElementById("recdFromIssdTo").value || "",
        transactionDate: document.getElementById("transactionDate").value || "",
        activityCode: document.getElementById("activityCode").value || "",
        varietyCode: document.getElementById("varietyCode").value || "",
        sackCode: document.getElementById("sackCode").value || "",
        sackCondition: document.getElementById("sackCondition").value || "",
        sackWeight: document.getElementById("sackWeight").value || "",
        age: document.getElementById("age").value || "",
        pileNo: document.getElementById("pileNo").value || "",
        numberOfBags: document.getElementById("numberOfBags").value || "",
        grossWeight: document.getElementById("grossWeight").value || "",
        moistureContent: document.getElementById("moistureContent").value || "",
        netWeight: document.getElementById("netWeight").value || "",
        cancelled: document.getElementById("cancelled").checked,
        timestamp: Date.now()
    };

    document.querySelectorAll('input, select').forEach(field => field.style.border = '');
    
    if (!transactionData.refWSINo) {
        const requiredFieldIds = ['documentNo', 'documentType', 'orNo', 'aiNo', 'recdFromIssdTo',
            'transactionDate', 'activityCode', 'varietyCode', 'sackCode', 'sackCondition',
            'sackWeight', 'age', 'pileNo', 'numberOfBags', 'grossWeight', 'moistureContent', 'netWeight'];
        
        let hasEmptyFields = false;
        requiredFieldIds.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (!transactionData[fieldId]) {
                element.style.border = '2px solid #ff6b6b';
                hasEmptyFields = true;
            }
        });
        
        if (hasEmptyFields) {
            alert('Please fill all required fields');
            return;
        }
    }
    
    if (editId) {
        transactionData.updatedAt = new Date().toISOString();
        database.ref('transactions/' + editId).update(transactionData)
            .then(() => {
                alert("Transaction updated successfully!");
                document.getElementById('transactionModal').classList.remove('active');
                form.reset();
                form.removeAttribute('data-edit-id');
            })
            .catch((error) => alert("Error: " + error.message));
    } else {
        transactionData.createdAt = new Date().toISOString();
        database.ref('transactions').push().set(transactionData)
            .then(() => {
                alert("Transaction saved successfully!");
                document.getElementById('transactionModal').classList.remove('active');
                form.reset();
            })
            .catch((error) => alert("Error: " + error.message));
    }
};

/* SORT TRANSACTIONS */
function sortTransactions(order) {
    currentSortOrder = order;
    allTransactions.sort((a, b) => {
        const dateA = new Date(a.data.transactionDate || '1900-01-01');
        const dateB = new Date(b.data.transactionDate || '1900-01-01');
        return order === 'newest' ? dateB - dateA : dateA - dateB;
    });
    renderTransactions();
}

/* RENDER TRANSACTIONS */
function renderTransactions() {
    const tbody = document.getElementById("inventoryBody");
    tbody.innerHTML = "";
    
    if (allTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="26" style="text-align:center;">No transactions found</td></tr>';
        return;
    }
    
    allTransactions.forEach(item => {
        const data = item.data;
        const docId = item.docId;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    
            <td>${data.officerId || "-"}</td>
            <td>${data.officerName || "-"}</td>
            <td>${data.warehouseId || "-"}</td>
            <td>${data.warehouseName || "-"}</td>
            <td>${data.periodFrom || "-"}</td>
            <td>${data.periodTo || "-"}</td>
            <td>${data.documentNo || "-"}</td>
            <td>${data.documentType || "-"}</td>
            <td>${data.orNo || "-"}</td>
            <td>${data.aiNo || "-"}</td>
            <td>${data.refWSINo || "-"}</td>
            <td>${data.recdFromIssdTo || "-"}</td>
            <td>${data.transactionDate || "-"}</td>
            <td>${data.activityCode || "-"}</td>
            <td>${data.varietyCode || "-"}</td>
            <td>${data.sackCode || "-"}</td>
            <td>${data.sackCondition || "-"}</td>
            <td>${data.sackWeight || "-"}</td>
            <td>${data.age || "-"}</td>
            <td>${data.pileNo || "-"}</td>
            <td>${data.numberOfBags || "-"}</td>
            <td>${data.grossWeight || "-"}</td>
            <td>${data.moistureContent || "-"}</td>
            <td>${data.netWeight || "-"}</td>
            <td>${data.cancelled ? "Yes" : "No"}</td>
            <td class="action-cell">
                <div class="dropdown">
                    <span class="dot-menu">&#8942;</span>
                    <div class="dropdown-content">
                        <button class="edit-btn" data-doc-id="${docId}">
                            <span style="color: #2196F3;">✏️</span> Edit
                        </button>
                        <button class="delete-btn" data-doc-id="${docId}">
                            <span style="color: #f44336;">🗑️</span> Delete
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    attachDropdownListeners();
}

function attachDropdownListeners() {
    document.querySelectorAll('.dot-menu').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-content').forEach(d => {
                if (d !== dot.nextElementSibling) d.style.display = 'none';
            });
            const dropdown = dot.nextElementSibling;
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            editTransaction(btn.dataset.docId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            if (confirm("Are you sure you want to delete this transaction?")) {
                deleteTransaction(btn.dataset.docId);
            }
        });
    });
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) closeAllDropdowns();
});

window.addEventListener('scroll', closeAllDropdowns, true);

/* LOAD TRANSACTIONS */
function loadTransactions() {
    const tbody = document.getElementById("inventoryBody");
    database.ref("transactions").on("value", (snapshot) => {
        allTransactions = [];
        if (!snapshot.exists()) {
            renderTransactions();
            return;
        }
        snapshot.forEach((childSnapshot) => {
            allTransactions.push({
                docId: childSnapshot.key,
                data: childSnapshot.val()
            });
        });
        sortTransactions(currentSortOrder);
    });
}

/* DELETE TRANSACTION */
function deleteTransaction(docId) {
    database.ref('transactions/' + docId).remove()
        .then(() => alert('Transaction deleted successfully!'))
        .catch((error) => alert('Error: ' + error.message));
}

/* EDIT TRANSACTION */
function editTransaction(docId) {
    loadDropdownOptions();
    
    database.ref('transactions/' + docId).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            alert('Transaction not found!');
            return;
        }
        
        const data = snapshot.val();
        
        setTimeout(() => {
            document.getElementById("officerId").value = data.officerId || "";
            document.getElementById("officerName").value = data.officerName || "";
            document.getElementById("warehouseId").value = data.warehouseId || "";
            document.getElementById("warehouseName").value = data.warehouseName || "";
            document.getElementById("periodFrom").value = data.periodFrom || "";
            document.getElementById("periodTo").value = data.periodTo || "";
            document.getElementById("documentNo").value = data.documentNo || "";
            document.getElementById("documentType").value = data.documentType || "";
            document.getElementById("orNo").value = data.orNo || "";
            document.getElementById("aiNo").value = data.aiNo || "";
            document.getElementById("refWSINo").value = data.refWSINo || "";
            document.getElementById("recdFromIssdTo").value = data.recdFromIssdTo || "";
            document.getElementById("transactionDate").value = data.transactionDate || "";
            document.getElementById("activityCode").value = data.activityCode || "";
            document.getElementById("varietyCode").value = data.varietyCode || "";
            document.getElementById("sackCode").value = data.sackCode || "";
            
            if (data.sackCode) document.getElementById("sackCondition").disabled = false;
            
            document.getElementById("sackCondition").value = data.sackCondition || "";
            document.getElementById("sackWeight").value = data.sackWeight || "";
            document.getElementById("age").value = data.age || "";
            document.getElementById("pileNo").value = data.pileNo || "";
            document.getElementById("numberOfBags").value = data.numberOfBags || "";
            document.getElementById("grossWeight").value = data.grossWeight || "";
            document.getElementById("moistureContent").value = data.moistureContent || "";
            document.getElementById("netWeight").value = data.netWeight || "";
            document.getElementById("cancelled").checked = data.cancelled || false;
            
            document.getElementById("transactionForm").setAttribute('data-edit-id', docId);
            setupSackInteraction();
            setupFieldClickHandlers();
            document.getElementById('transactionModal').classList.add('active');
        }, 300);
    });
}

window.addEventListener("DOMContentLoaded", () => {
    loadTransactions();
    document.getElementById('sortSelect')?.addEventListener('change', (e) => {
        sortTransactions(e.target.value);
    });
});