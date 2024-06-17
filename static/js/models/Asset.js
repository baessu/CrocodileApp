import { getCurrencySymbol } from '../utils.js';

export default class Asset {
    constructor(id, name, type, category, nature, value = 0) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.category = category;
        this.nature = nature;
        this.value = value;
    }

    createElement(index, deleteAsset, updateChart, draggedElement) {
        const row = document.createElement('tr');
        row.setAttribute('draggable', true);
        row.classList.add('draggable');

        row.addEventListener('dragstart', () => {
            draggedElement.current = { element: row, index: index, category: this.category };
            row.classList.add('dragging');
        });

        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            draggedElement.current = null;
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            row.classList.add('drag-over');
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over');
        });

        row.addEventListener('drop', () => {
            row.classList.remove('drag-over');
            if (draggedElement.current && draggedElement.current.element !== row && draggedElement.current.category === this.category) {
                const parent = row.parentNode;
                const draggedIndex = Array.from(parent.children).indexOf(draggedElement.current.element);
                const droppedIndex = Array.from(parent.children).indexOf(row);

                if (draggedIndex > droppedIndex) {
                    parent.insertBefore(draggedElement.current.element, row);
                } else {
                    parent.insertBefore(draggedElement.current.element, row.nextSibling);
                }

                const draggedAsset = assets.splice(draggedElement.current.index, 1)[0];
                assets.splice(droppedIndex, 0, draggedAsset);
                updateChart();
            }
        });

        const nameCell = document.createElement('td');
        nameCell.textContent = this.name;
        row.appendChild(nameCell);

        const valueCell = document.createElement('td');
        valueCell.style.display = 'flex';
        valueCell.style.alignItems = 'center';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.value = this.formatNumber(this.value);
        input.oninput = () => {
            this.value = this.parseNumber(input.value);
            input.value = this.formatNumber(this.value);
            updateChart();
        };
        valueCell.appendChild(input);

        const currencySymbol = document.createElement('span');
        currencySymbol.className = 'currency-symbol';
        currencySymbol.style.marginLeft = '8px';
        currencySymbol.textContent = getCurrencySymbol();
        valueCell.appendChild(currencySymbol);

        row.appendChild(valueCell);

        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.onclick = () => {
            deleteAsset(index);
        };
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);

        return row;
    }

    formatNumber(num) {
        return num.toLocaleString();
    }

    parseNumber(str) {
        return parseFloat(str.replace(/,/g, '')) || 0;
    }
}