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

function showModal(modalId) {
    $(`#${modalId}`).modal('show');
}

function addItem(type) {
    const selectElement = document.getElementById(`${type}_type_id`);
    const selectedItem = selectElement.options[selectElement.selectedIndex];
    const itemName = selectedItem.text;
    const itemCategory = selectedItem.getAttribute('data-category');
    const itemNature = selectedItem.getAttribute('data-nature');
    const itemValue = 0;

    const table = document.getElementById(`${type}sContainer`).getElementsByTagName('tbody')[0];

    const newRow = table.insertRow();
    newRow.innerHTML = `
        <tr>
            <td data-category="${itemCategory}" data-nature="${itemNature}">${itemName}</td>
            <td><input type="text" class="form-control" value="${formatValue(itemValue)}" onchange="updateItemValue(this, '${type}Id')" oninput="formatCurrency(this)" onblur="parseCurrency(this)"></td>
            <td><button type="button" class="btn btn-danger" onclick="removeItem(this, '${type}Id')">X</button></td>
        </tr>
    `;
    $(`#add${type.charAt(0).toUpperCase() + type.slice(1)}Modal`).modal('hide');
    updateCharts();
}

function removeItem(button, itemId, type) {
    fetch(`/delete_${type}/${itemId}`, {
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
            alert(`Failed to delete ${type}`);
        }
    })
    .catch(error => {
        console.error(`Error deleting ${type}:`, error);
        alert(`Error deleting ${type}: ` + error);
    });
}

function updateItemValue(input, itemId, type) {
    const value = parseFloat(input.value.replace(/,/g, '')) || 0;
    fetch(`/update_${type}/${itemId}`, {
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
            alert(`Error updating ${type} value: ` + data.message);
        }
    })
    .catch(error => {
        console.error(`Error updating ${type} value:`, error);
        alert(`Error updating ${type} value: ` + error);
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

// Export functions for global access if needed
export {
    showModal,
    addItem,
    removeItem,
    updateItemValue,
    formatCurrency,
    parseCurrency,
    formatValue
};

// Assign functions to window object for global access if needed
window.showAddAssetModal = () => showModal('addAssetModal');
window.showAddLiabilityModal = () => showModal('addLiabilityModal');
window.addAsset = () => addItem('asset');
window.addLiability = () => addItem('liability');
window.removeAsset = (button, assetId) => removeItem(button, assetId, 'asset');
window.removeLiability = (button, liabilityId) => removeItem(button, liabilityId, 'liability');
window.updateAssetValue = (input, assetId) => updateItemValue(input, assetId, 'asset');
window.updateLiabilityValue = (input, liabilityId) => updateItemValue(input, liabilityId, 'liability');
window.updateCharts = updateCharts;
window.formatCurrency = formatCurrency;
window.formatValue = formatValue;
window.parseCurrency = parseCurrency;