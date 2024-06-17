import { createCharts, updateCharts } from './chartConfig.js';

document.addEventListener('DOMContentLoaded', function () {
    createCharts();
    updateCharts();
    initializeSortable();
});

export function initializeSortable() {
    const assetsContainer = document.getElementById('assetsContainer').getElementsByTagName('tbody')[0];
    const liabilitiesContainer = document.getElementById('liabilitiesContainer').getElementsByTagName('tbody')[0];

    if (assetsContainer) {
        new Sortable(assetsContainer, {
            animation: 150,
            onEnd: updateCharts
        });
    }

    if (liabilitiesContainer) {
        new Sortable(liabilitiesContainer, {
            animation: 150,
            onEnd: updateCharts
        });
    }
}

function showAddAssetModal() {
    $('#addAssetModal').modal('show');
}

function showAddLiabilityModal() {
    $('#addLiabilityModal').modal('show');
}

function addAsset() {
    const assetSelect = document.getElementById('asset_type_id');
    const selectedAsset = assetSelect.options[assetSelect.selectedIndex];
    const assetName = selectedAsset.text;
    const assetCategory = selectedAsset.getAttribute('data-category');
    const assetNature = selectedAsset.getAttribute('data-nature');
    const assetValue = 0;

    const table = document.getElementById('assetsContainer').getElementsByTagName('tbody')[0];

    const newRow = table.insertRow();
    newRow.innerHTML = `
        <tr>
            <td data-category="${assetCategory}" data-nature="${assetNature}">${assetName}</td>
            <td><input type="text" class="form-control" value="${formatValue(assetValue)}" onchange="updateAssetValue(this, assetId)" oninput="formatCurrency(this)" onblur="parseCurrency(this)"></td>
            <td><button type="button" class="btn btn-danger" onclick="removeAsset(this, assetId)">X</button></td>
        </tr>
    `;
    $('#addAssetModal').modal('hide');
    updateCharts();
}

function addLiability() {
    const liabilitySelect = document.getElementById('liability_type_id');
    const selectedLiability = liabilitySelect.options[liabilitySelect.selectedIndex];
    const liabilityName = selectedLiability.text;
    const liabilityCategory = selectedLiability.getAttribute('data-category');
    const liabilityNature = selectedLiability.getAttribute('data-nature');
    const liabilityValue = 0;

    const table = document.getElementById('liabilitiesContainer').getElementsByTagName('tbody')[0];

    const newRow = table.insertRow();
    newRow.innerHTML = `
        <tr>
            <td data-category="${liabilityCategory}" data-nature="${liabilityNature}">${liabilityName}</td>
            <td><input type="text" class="form-control" value="${formatValue(liabilityValue)}" onchange="updateLiabilityValue(this, liabilityId)" oninput="formatCurrency(this)" onblur="parseCurrency(this)"></td>
            <td><button type="button" class="btn btn-danger" onclick="removeLiability(this, liabilityId)">X</button></td>
        </tr>
    `;
    $('#addLiabilityModal').modal('hide');
    updateCharts();
}

function removeAsset(button, assetId) {
    fetch(`/delete_asset/${assetId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            const row = button.closest('tr');
            row.remove();
            updateCharts();
        } else {
            alert('Failed to delete asset');
        }
    });
}


function removeLiability(button, liabilityId) {
    fetch(`/delete_liability/${liabilityId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            const row = button.closest('tr');
            row.remove();
            updateCharts();
        } else {
            alert('Failed to delete liability');
        }
    });
}

function updateAssetValue(input, assetId) {
    const value = parseFloat(input.value.replace(/,/g, '')) || 0;
    fetch(`/update_asset/${assetId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: value })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateCharts();
        } else {
            alert('Error updating asset value: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating asset value:', error);
        alert('Error updating asset value: ' + error);
    });
}

function updateLiabilityValue(input, liabilityId) {
    const value = parseFloat(input.value.replace(/,/g, '')) || 0;
    fetch(`/update_liability/${liabilityId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: value })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateCharts();
        } else {
            alert('Error updating liability value: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating liability value:', error);
        alert('Error updating liability value: ' + error);
    });
}

function formatCurrency(input) {
    let value = input.value.replace(/,/g, '');
    value = parseFloat(value);
    if (!isNaN(value)) {
        input.value = formatValue(value);
    }
}

function parseCurrency(input) {
    let value = input.value.replace(/,/g, '');
    value = parseFloat(value);
    if (!isNaN(value)) {
        input.value = value.toString();
    }
}

function formatValue(value) {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

window.showAddAssetModal = showAddAssetModal;
window.showAddLiabilityModal = showAddLiabilityModal;
window.addAsset = addAsset;
window.addLiability = addLiability;
window.removeAsset = removeAsset;
window.removeLiability = removeLiability;
window.updateAssetValue = updateAssetValue;
window.updateLiabilityValue = updateLiabilityValue;
window.updateCharts = updateCharts;
window.formatCurrency = formatCurrency;
window.formatValue = formatValue;
window.parseCurrency = parseCurrency;