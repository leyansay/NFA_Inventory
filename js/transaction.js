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
let filteredTransactions = [];
let currentSortOrder = 'newest';
let dateFilterFrom = null;
let dateFilterTo = null;
let selectedColumns = ['grosswt', 'mc', 'netwt'];

// Store all data for table modals
let activitiesData = [];
let sacksData = [];
let varietiesData = [];

// Store data for preview
let officersData = {};
let transactionsData = {};
let warehousesData = {};

// Column Labels Map
const columnLabels = {
    'grosswt': 'GROSS WT',
    'mc': 'MC%',
    'netwt': 'NET WT',
    'bags': 'BAGS',
    'sackwt': 'SACK WT'
};

// ===================================================================
// ROW SELECTION FUNCTIONALITY
// ===================================================================

let selectedRow = null;
let selectedDocId = null;

function attachRowSelectionListeners() {
    const tbody = document.getElementById('inventoryBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.querySelector('.loading') || !row.hasAttribute('data-doc-id')) return;
        
        row.addEventListener('click', function() {
            const docId = this.getAttribute('data-doc-id');
            
            if (selectedDocId === docId) {
                deselectRow();
                return;
            }
            
            if (selectedRow) {
                selectedRow.classList.remove('selected');
            }
            
            this.classList.add('selected');
            selectedRow = this;
            selectedDocId = docId;
            
            document.getElementById('rowActions').classList.add('active');
        });
    });
}

document.getElementById('editRowBtn').addEventListener('click', function() {
    if (selectedDocId) {
        editTransaction(selectedDocId);
        deselectRow();
    }
});

document.getElementById('deleteRowBtn').addEventListener('click', function() {
    if (selectedDocId) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            deleteTransaction(selectedDocId);
            deselectRow();
        }
    }
});

function deselectRow() {
    if (selectedRow) {
        selectedRow.classList.remove('selected');
    }
    selectedRow = null;
    selectedDocId = null;
    document.getElementById('rowActions').classList.remove('active');
}

document.addEventListener('click', function(e) {
    const table = document.querySelector('.table-container');
    const rowActions = document.getElementById('rowActions');
    
    if (!table.contains(e.target) && !rowActions.contains(e.target)) {
        deselectRow();
    }
});

// ===================================================================
// DATE RANGE FILTER FUNCTIONALITY
// ===================================================================

const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const clearDateFilterBtn = document.getElementById('clearDateFilter');

if (dateFromInput) {
    dateFromInput.addEventListener('change', handleDateRangeFilter);
}

if (dateToInput) {
    dateToInput.addEventListener('change', handleDateRangeFilter);
}

if (clearDateFilterBtn) {
    clearDateFilterBtn.addEventListener('click', clearDateFilter);
}

function handleDateRangeFilter() {
    dateFilterFrom = dateFromInput.value;
    dateFilterTo = dateToInput.value;
    
    if (dateFilterFrom || dateFilterTo) {
        clearDateFilterBtn.disabled = false;
    } else {
        clearDateFilterBtn.disabled = true;
    }
    
    filterAndDisplayTransactions();
    updateSummaryCards();
}

function clearDateFilter() {
    dateFromInput.value = '';
    dateToInput.value = '';
    dateFilterFrom = null;
    dateFilterTo = null;
    clearDateFilterBtn.disabled = true;
    
    filterAndDisplayTransactions();
    updateSummaryCards();
}

// ===================================================================
// COLUMN SELECTION FUNCTIONALITY
// ===================================================================

const columnTags = document.querySelectorAll('.column-tag');
const addColumnBtn = document.getElementById('addColumnBtn');
const columnModal = document.getElementById('columnModal');
const closeColumnModal = document.getElementById('closeColumnModal');
const columnOptions = document.querySelectorAll('.column-option');

// Initialize active tags
columnTags.forEach(tag => {
    tag.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-close')) {
            tag.classList.remove('active');
            updateSelectedColumns();
        } else {
            tag.classList.toggle('active');
            updateSelectedColumns();
        }
    });
});

addColumnBtn.addEventListener('click', () => {
    columnModal.classList.add('active');
});

closeColumnModal.addEventListener('click', () => {
    columnModal.classList.remove('active');
});

columnOptions.forEach(option => {
    option.addEventListener('click', () => {
        const column = option.dataset.column;
        const label = option.dataset.label;
        addColumnTag(column, label);
        columnModal.classList.remove('active');
    });
});

function addColumnTag(column, label) {
    const existingTag = Array.from(columnTags).find(tag => tag.dataset.column === column);
    if (existingTag) {
        existingTag.classList.add('active');
        updateSelectedColumns();
        return;
    }
    
    const newTag = document.createElement('button');
    newTag.className = 'column-tag active';
    newTag.dataset.column = column;
    newTag.innerHTML = `
        <span class="tag-dot"></span>
        <span class="tag-text">${label}</span>
        <span class="tag-close">×</span>
    `;
    
    newTag.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-close')) {
            newTag.remove();
            updateSelectedColumns();
        }
    });
    
    document.getElementById('columnTags').insertBefore(newTag, addColumnBtn);
    updateSelectedColumns();
}

function updateSelectedColumns() {
    selectedColumns = [];
    document.querySelectorAll('.column-tag.active').forEach(tag => {
        selectedColumns.push(tag.dataset.column);
    });
    updateSummaryCards();
}

// ===================================================================
// SUMMARY CARDS
// ===================================================================

function updateSummaryCards() {
    const summarySection = document.getElementById('summarySection');
    summarySection.innerHTML = '';
    
    if (selectedColumns.length === 0) {
        return;
    }
    
    const dataToSummarize = getFilteredTransactions();
    
    selectedColumns.forEach(column => {
        const card = createSummaryCard(column, dataToSummarize);
        summarySection.appendChild(card);
    });
}

window.addEventListener('DOMContentLoaded', function() {
            const currentUser = sessionStorage.getItem('currentUser');
            if (currentUser) {
                try {
                    const user = JSON.parse(currentUser);
                    document.getElementById('displayUsername').textContent = `Hi, ${user.username}`;
                    document.getElementById('displayUserRole').textContent = user.role || 'USER';
                    document.getElementById('displayAvatar').textContent = user.username.charAt(0).toUpperCase();
                } catch (e) {
                    console.error('Error parsing user data:', e);
                }
            }
            loadAllData();
        });

function createSummaryCard(column, data) {
    const card = document.createElement('div');
    card.className = 'summary-card';
    
    let total = 0;
    let unit = '';
    
    switch(column) {
        case 'grosswt':
            total = data.reduce((sum, t) => sum + (parseFloat(t.data.grossWeight) || 0), 0);
            unit = 'kg';
            break;
        case 'mc':
            const validMC = data.filter(t => t.data.moistureContent);
            total = validMC.length > 0 
                ? validMC.reduce((sum, t) => sum + (parseFloat(t.data.moistureContent) || 0), 0) / validMC.length
                : 0;
            unit = '%';
            break;
        case 'netwt':
            total = data.reduce((sum, t) => sum + (parseFloat(t.data.netWeight) || 0), 0);
            unit = 'kg';
            break;
        case 'bags':
            total = data.reduce((sum, t) => sum + (parseInt(t.data.numberOfBags) || 0), 0);
            unit = 'bags';
            break;
        case 'sackwt':
            total = data.reduce((sum, t) => sum + (parseFloat(t.data.sackWeight) || 0), 0);
            unit = 'kg';
            break;
    }
    
    const formattedTotal = column === 'mc' 
        ? total.toFixed(2) 
        : total.toLocaleString('en-US', { maximumFractionDigits: 2 });
    
    let periodText = 'All periods';
    if (dateFilterFrom && dateFilterTo) {
        periodText = `Date Range: ${formatDateForDisplay(dateFilterFrom)} - ${formatDateForDisplay(dateFilterTo)}`;
    } else if (dateFilterFrom) {
        periodText = `Date from ${formatDateForDisplay(dateFilterFrom)}`;
    } else if (dateFilterTo) {
        periodText = `Date until ${formatDateForDisplay(dateFilterTo)}`;
    }
    
    card.innerHTML = `
        <div class="summary-label">${columnLabels[column]}</div>
        <div class="summary-value">${formattedTotal}</div>
        <div class="summary-subtitle">${unit}</div>
        <div class="summary-period">${periodText} • ${data.length} transaction(s)</div>
    `;
    
    return card;
}

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// ===================================================================
// FILTER AND DISPLAY TRANSACTIONS
// ===================================================================

function getFilteredTransactions() {
    let filtered = [...allTransactions];
    
    // Filter based on DATE (transactionDate) column
    if (dateFilterFrom || dateFilterTo) {
        filtered = filtered.filter(t => {
            const transactionDate = t.data.transactionDate ? new Date(t.data.transactionDate) : null;
            const filterFrom = dateFilterFrom ? new Date(dateFilterFrom) : null;
            const filterTo = dateFilterTo ? new Date(dateFilterTo) : null;
            
            // Skip transactions without date
            if (!transactionDate) return false;
            
            // Check if the transaction date is within the filter range
            if (filterFrom && filterTo) {
                // Both dates selected: date must be between FROM and TO (inclusive)
                return (transactionDate >= filterFrom && transactionDate <= filterTo);
            } else if (filterFrom) {
                // Only FROM date: date must be on or after filter FROM
                return transactionDate >= filterFrom;
            } else if (filterTo) {
                // Only TO date: date must be on or before filter TO
                return transactionDate <= filterTo;
            }
            
            return true;
        });
    }
    
    return filtered;
}

function filterAndDisplayTransactions() {
    filteredTransactions = getFilteredTransactions();
    sortTransactions(currentSortOrder, true);
}

function sortTransactions(order, keepFiltered = false) {
    currentSortOrder = order;
    console.log("Sorting by:", order, "keepFiltered:", keepFiltered);
    
    const dataToSort = keepFiltered && (dateFilterFrom || dateFilterTo) ? filteredTransactions : allTransactions;
    
    dataToSort.sort((a, b) => {
        const dateA = new Date(a.data.transactionDate || '1900-01-01');
        const dateB = new Date(b.data.transactionDate || '1900-01-01');
        return order === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    renderTransactions(dataToSort);
}

function renderTransactions(transactionsToRender = allTransactions) {
    console.log("Rendering transactions:", transactionsToRender.length);
    const tbody = document.getElementById("inventoryBody");
    
    if (!tbody) {
        console.error("inventoryBody element not found!");
        return;
    }
    
    tbody.innerHTML = "";
    deselectRow();
    
    if (transactionsToRender.length === 0) {
        const message = (dateFilterFrom || dateFilterTo)
            ? 'No transactions found for the selected date range' 
            : 'No transactions found';
        tbody.innerHTML = `<tr><td colspan="25" style="text-align:center;">${message}</td></tr>`;
        return;
    }
    
    transactionsToRender.forEach(item => {
        const data = item.data;
        const docId = item.docId;
        
        // Highlight DATE column if filter is active
        const dateStyle = (dateFilterFrom || dateFilterTo) 
            ? 'style="background-color: rgba(249, 168, 37, 0.15); font-weight: bold;"' 
            : '';
        
        const tr = document.createElement("tr");
        tr.setAttribute('data-doc-id', docId);
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
            <td ${dateStyle}>${data.transactionDate || "-"}</td>
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
        `;
        tbody.appendChild(tr);
    });
    
    attachRowSelectionListeners();
    console.log("Transactions rendered successfully");
}

/* LOAD DROPDOWN OPTIONS */
function loadDropdownOptions() {
    console.log("Loading dropdown options...");
    
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
            console.log("Activities loaded:", activitiesData.length);
        }
    }).catch(error => console.error("Error loading activities:", error));

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
            console.log("Sacks loaded:", sacksData.length);
        }
    }).catch(error => console.error("Error loading sacks:", error));

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
            console.log("Varieties loaded:", varietiesData.length);
        }
    }).catch(error => console.error("Error loading varieties:", error));
}

/* CREATE SELECTION MODALS */
function createSelectionModal(title, columns, data, onSelect) {
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

    document.getElementById('closeSelectionModal').onclick = () => modal.remove();

    const searchInput = document.getElementById('selectionSearch');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#selectionTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    document.querySelectorAll('.selectable-row').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            onSelect(data[index]);
            modal.remove();
        });
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(249, 168, 37, 0.12)';
        });
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

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
        console.error("Error loading officers:", error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Error loading officers</td></tr>';
    });
}

/* LOAD PREVIEW DATA */
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

const previewForm = document.getElementById('previewForm');
if (previewForm) {
    previewForm.addEventListener('submit', function(e) {
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

        const fromDate = new Date(periodFrom);
        const toDate = new Date(periodTo);
        
        const key = `${officerId}_${officer.warehouse}`;
        const officerTransactions = transactionsData[key] || [];
        
        const transactionsInRange = officerTransactions.filter(transaction => {
            if (!transaction.transactionDate) return false;
            const transactionDate = new Date(transaction.transactionDate);
            return transactionDate >= fromDate && transactionDate <= toDate;
        });
        
        if (transactionsInRange.length === 0) {
            alert(`No transactions found for Officer ID "${officerId}" between ${periodFrom} and ${periodTo}.\n\nPlease select a different date range or verify the officer has transactions in this period.`);
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
}

/* MODAL CONTROLS */
const addTransactionBtn = document.getElementById("addTransaction");
if (addTransactionBtn) {
    addTransactionBtn.onclick = () => {
        loadOfficersFromFirebase();
        loadDropdownOptions();
        document.getElementById('officerModal').classList.add('active');
    };
}

const previewTransactionBtn = document.getElementById("previewTransaction");
if (previewTransactionBtn) {
    previewTransactionBtn.onclick = () => {
        loadPreviewData();
        document.getElementById('previewModal').classList.add('active');
    };
}

const closeOfficerBtn = document.getElementById("closeOfficer");
if (closeOfficerBtn) {
    closeOfficerBtn.onclick = () => {
        document.getElementById('officerModal').classList.remove('active');
    };
}

const closePreviewBtn = document.getElementById("closePreview");
if (closePreviewBtn) {
    closePreviewBtn.onclick = () => {
        document.getElementById('previewModal').classList.remove('active');
    };
}

const closeTransactionBtn = document.getElementById("closeTransaction");
if (closeTransactionBtn) {
    closeTransactionBtn.onclick = () => {
        document.getElementById('transactionModal').classList.remove('active');
    };
}

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

function setupFieldClickHandlers() {
    const activityInput = document.getElementById('activityCode');
    activityInput.style.cursor = 'pointer';
    activityInput.readOnly = true;
    activityInput.onclick = () => showActivitySelection();

    const sackInput = document.getElementById('sackCode');
    sackInput.style.cursor = 'pointer';
    sackInput.readOnly = true;
    sackInput.onclick = () => showSackSelection();

    const varietyInput = document.getElementById('varietyCode');
    varietyInput.style.cursor = 'pointer';
    varietyInput.readOnly = true;
    varietyInput.onclick = () => showVarietySelection();
    
    const locationInput = document.getElementById('recdFromIssdTo');
    locationInput.style.cursor = 'text';
    locationInput.readOnly = false;
    locationInput.onclick = null;
}

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

// Add RECAP button handler
const recapBtn = document.getElementById('recapBtn');
if (recapBtn) {
    recapBtn.addEventListener('click', function(e) {
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

        const fromDate = new Date(periodFrom);
        const toDate = new Date(periodTo);
        
        const key = `${officerId}_${officer.warehouse}`;
        const officerTransactions = transactionsData[key] || [];
        
        const transactionsInRange = officerTransactions.filter(transaction => {
            if (!transaction.transactionDate) return false;
            const transactionDate = new Date(transaction.transactionDate);
            return transactionDate >= fromDate && transactionDate <= toDate;
        });
        
        if (transactionsInRange.length === 0) {
            alert(`No transactions found for Officer ID "${officerId}" between ${periodFrom} and ${periodTo}.\n\nPlease select a different date range or verify the officer has transactions in this period.`);
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
        
        // Open recap.html in a new window
        window.open(`recap.html?${params.toString()}`, '_blank');
        
        // Close the preview modal
        document.getElementById('previewModal').classList.remove('active');
        
        // Reset the form
        document.getElementById('previewForm').reset();
    });
}

function computeNetWeight() {
    const gross = parseFloat(document.getElementById("grossWeight").value) || 0;
    const sack = parseFloat(document.getElementById("sackWeight").value) || 0;
    const bags = parseFloat(document.getElementById("numberOfBags").value) || 0;
    
    const totalSackWeight = sack * bags;
    document.getElementById("netWeight").value = (gross - totalSackWeight).toFixed(2);
}

const grossWeightInput = document.getElementById("grossWeight");
if (grossWeightInput) {
    grossWeightInput.addEventListener("input", computeNetWeight);
}

const sackWeightInputField = document.getElementById("sackWeight");
if (sackWeightInputField) {
    sackWeightInputField.addEventListener("input", computeNetWeight);
}

const numberOfBagsInput = document.getElementById("numberOfBags");
if (numberOfBagsInput) {
    numberOfBagsInput.addEventListener("input", computeNetWeight);
}

/* SAVE TRANSACTION */
const transactionForm = document.getElementById("transactionForm");
if (transactionForm) {
    transactionForm.addEventListener('submit', function(e) {
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
            const requiredFieldIds = ['documentNo', 'documentType', 'aiNo', 'recdFromIssdTo',
                'transactionDate', 'activityCode', 'varietyCode', 'sackCode', 'sackCondition',
                'sackWeight', 'age', 'pileNo', 'numberOfBags', 'grossWeight', 'moistureContent', 'netWeight'];
            
            let hasEmptyFields = false;
            requiredFieldIds.forEach(fieldId => {
                const element = document.getElementById(fieldId);
                if (!transactionData[fieldId]) {
                    element.style.border = '2px solid #D84315';
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
    });
}

/* LOAD TRANSACTIONS */
function loadTransactions() {
    console.log("Loading transactions from Firebase...");
    const tbody = document.getElementById("inventoryBody");
    
    if (!tbody) {
        console.error("ERROR: inventoryBody element not found in DOM!");
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="25" class="loading">Loading data...</td></tr>';
    
    database.ref("transactions").on("value", (snapshot) => {
        console.log("Firebase snapshot received");
        allTransactions = [];
        
        if (!snapshot.exists()) {
            console.log("No transactions found in database");
            renderTransactions();
            updateSummaryCards();
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            allTransactions.push({
                docId: childSnapshot.key,
                data: childSnapshot.val()
            });
        });
        
        console.log("Total transactions loaded:", allTransactions.length);
        
        if (dateFilterFrom || dateFilterTo) {
            filterAndDisplayTransactions();
        } else {
            sortTransactions(currentSortOrder, false);
        }
        
        updateSummaryCards();
    }, (error) => {
        console.error("Firebase error:", error);
        tbody.innerHTML = '<tr><td colspan="25" style="text-align:center; color:#D84315;">Error loading data: ' + error.message + '</td></tr>';
    });
}

function deleteTransaction(docId) {
    database.ref('transactions/' + docId).remove()
        .then(() => alert('Transaction deleted successfully!'))
        .catch((error) => alert('Error: ' + error.message));
}

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

/* INITIALIZATION */
window.addEventListener("DOMContentLoaded", () => {
    console.log("=== DOM LOADED ===");
    console.log("Checking for inventoryBody:", document.getElementById("inventoryBody"));
    
    loadTransactions();
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortTransactions(e.target.value, (dateFilterFrom || dateFilterTo) !== null);
        });
    }
    
    console.log("Event listeners attached");
});