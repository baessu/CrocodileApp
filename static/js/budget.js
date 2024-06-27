function formatCurrency(input) {
    let value = input.value.replace(/,/g, '');  // Remove existing commas
    value = parseFloat(value);  // Convert to float
    if (!isNaN(value)) {
        input.value = value.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
}

function parseCurrency(input) {
    let value = input.value.replace(/,/g, '');  // Remove commas
    value = parseFloat(value);  // Convert to float
    if (!isNaN(value)) {
        input.value = value.toString();  // Convert back to string
    }
}



let budgetEntries = [];
let chart;

const categoryTranslations = {
    Income: "수입",
    Expense: "지출",
    Savings: "저축/투자"
};




document.addEventListener('DOMContentLoaded', function () {
    initializeBudgetForm();
    initializeChart();
    loadInitialBudgetEntries(initialBudgetEntries);
});



function initializeBudgetForm() {
    const monthList = document.querySelector('.grid-container');
    const categoryList = document.getElementById('categoryList');
    const subCategoryContainer = document.getElementById('subCategoryContainer');
    const subCategoryList = document.getElementById('subCategoryList');
    const customSubCategory = document.getElementById('customSubCategory');
    const yearSelect = document.getElementById('yearSelect');
    const viewMonthSelect = document.getElementById('viewMonthSelect');

    let selectedYear = yearSelect.value;
    let selectedMonth = null;
    let selectedCategory = 'Expense'; 
    let selectedSubCategory = null;

    const categories = {
        Income: ["월급", "용돈"],
        Expense: {
            Eat: ["식비", "카페"],
            Live: ["대출이자/월세", "관리비", "통신비", "생필품", "보험료", "경조사", "의료비"],
            Wear: ["의류", "잡화", "뷰티/미용"],
            Enjoy: ["취미", "운동", "도서", "여행", "구독서비스"],
            Edu: ["교육비/클래스","교재"],
            Ride: ["대중교통", "택시비"],
            Other: ["세금", "직접입력"]
        },
        Savings: ["예금", "적금", "펀드", "주식", "기타"]
    };

    function translateCategory(category) {
        return categoryTranslations[category] || category;
    }

    yearSelect.addEventListener('change', function () {
        selectedYear = this.value;
        updateViewMonthSelect();
    });

    document.querySelectorAll('.month-cell').forEach(cell => {
        cell.addEventListener('click', function () {
            document.querySelector('.month-cell.active')?.classList.remove('active');
            this.classList.add('active');
            selectedMonth = this.getAttribute('data-month');
        });
    });

    categoryList.addEventListener('click', function (e) {
        if (e.target.classList.contains('list-group-item')) {
            document.querySelector('.list-group-item.active')?.classList.remove('active');
            e.target.classList.add('active');
            selectedCategory = e.target.getAttribute('data-category');
            updateSubCategoryList();
        }
    });

    subCategoryList.addEventListener('click', function (e) {
        if (e.target.classList.contains('list-group-item')) {
            document.querySelector('#subCategoryList .active')?.classList.remove('active');
            e.target.classList.add('active');
            selectedSubCategory = e.target.textContent.trim();
            if (selectedSubCategory === '직접입력') {
                customCategoryContainer.style.display = 'block';
            } else {
                customCategoryContainer.style.display = 'none';
            }
        }
    });

    function updateSubCategoryList() {
        subCategoryList.innerHTML = '';
        subCategoryContainer.style.display = 'block';

        if (selectedCategory === 'Income' || selectedCategory === 'Savings') {
            const subCategories = categories[selectedCategory];
            subCategories.forEach(sub => {
                const li = document.createElement('li');
                li.classList.add('list-group-item');
                li.textContent = sub;
                subCategoryList.appendChild(li);
            });
        } else if (selectedCategory === 'Expense') {
            for (const mainCategory in categories.Expense) {
                const subCategories = categories.Expense[mainCategory];
                const categoryHeader = document.createElement('li');
                categoryHeader.classList.add('list-group-item', 'bold-text');
                categoryHeader.textContent = mainCategory;
                subCategoryList.appendChild(categoryHeader);
                subCategories.forEach(sub => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item');
                    li.textContent = sub;
                    subCategoryList.appendChild(li);
                });
            }
        }
    }

    function updateViewMonthSelect() {
        viewMonthSelect.innerHTML = '<option value="">전체 보기</option>';
        for (let month = 1; month <= 12; month++) {
            const option = document.createElement('option');
            option.value = `${selectedYear}-${month.toString().padStart(2, '0')}`;
            option.textContent = `${selectedYear}년 ${month}월`;
            viewMonthSelect.appendChild(option);
        }
    }

    window.addBudgetEntry = async function () {
        if (!selectedYear || !selectedMonth || !selectedCategory || !selectedSubCategory) {
            alert('모든 항목을 선택해주세요.');
            return;
        }

        const amount = document.getElementById('amount').value;
        const description = document.getElementById('description').value;

        if (!amount || isNaN(amount)) {
            alert('유효한 금액을 입력해주세요.');
            return;
        }
        const subCategory = selectedSubCategory === '직접입력' ? customCategory.value.trim() : selectedSubCategory;

        if (selectedSubCategory === '직접입력' && !subCategory) {
            alert('항목 카테고리를 입력해주세요.');
            return;
        }

        try {
            const response = await fetch('/add_budget_entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    year: selectedYear,
                    month: selectedMonth,
                    category: selectedCategory,
                    sub_category: subCategory,
                    amount: parseFloat(amount),
                    description: description
                })
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error('Failed to add budget entry');
            }

            const tableBody = document.getElementById('budgetTableBody');
            const row = document.createElement('tr');
            row.dataset.month = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
            const translatedCategory = translateCategory(selectedCategory);
            row.innerHTML = `
                <td>${selectedYear}년 ${selectedMonth}월</td>
                <td>${translatedCategory}</td>
                <td>${subCategory}</td>
                <td>${amount}</td>
                <td>${description}</td>
                <td><span style="cursor: pointer;" class="material-icons" onclick="deleteBudgetEntry(this, ${result.id})">remove_circle_outline</span></td>
            `;
            tableBody.appendChild(row);

            budgetEntries.push({
                year: selectedYear,
                month: selectedMonth,
                category: selectedCategory,
                sub_category: subCategory,
                amount: parseFloat(amount),
                description: description,
                id: result.id
            });

            clearForm();
            updateViewMonthSelect();
            updateChart(budgetEntries); // Update the chart with new data
        } catch (error) {
            alert('데이터 저장 중 오류가 발생했습니다.');
            console.error('Error adding budget entry:', error);
        }
    };

    window.deleteBudgetEntry = async function (btn, id) {
        try {
            const response = await fetch(`/delete_budget_entry/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error('Failed to delete budget entry');
            }

            const row = btn.closest('tr');
            row.remove();

            budgetEntries = budgetEntries.filter(entry => entry.id !== id);

            updateViewMonthSelect();
            updateChart(budgetEntries); // Update the chart with new data
        } catch (error) {
            alert('데이터 삭제 중 오류가 발생했습니다.');
            console.error('Error deleting budget entry:', error);
        }
    };

    window.filterBudgetEntriesByMonth = function () {
        const selectedViewMonth = viewMonthSelect.value;
        const tableBody = document.getElementById('budgetTableBody');
        const rows = Array.from(document.querySelectorAll('#budgetTableBody tr'));
    
        rows.forEach(row => {
            if (selectedViewMonth === '' || row.dataset.month === selectedViewMonth) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    
        if (selectedViewMonth === '') {
            rows.sort((a, b) => {
                const [aYear, aMonth] = a.dataset.month.split('-').map(Number);
                const [bYear, bMonth] = b.dataset.month.split('-').map(Number);
    
                if (aYear === bYear) {
                    return aMonth - bMonth;
                } else {
                    return aYear - bYear;
                }
            });
    
            // Clear the table body and append the sorted rows
            tableBody.innerHTML = '';
            rows.forEach(row => tableBody.appendChild(row));
        }
    };
    

    function clearForm() {
        selectedMonth = null;
        selectedCategory = 'Expense';  // 기본 선택 상태로 '지출' 유지
        selectedSubCategory = null;
        document.querySelector('.month-cell.active')?.classList.remove('active');
        document.querySelector('.list-group-item.active')?.classList.remove('active');
        document.querySelector('#subCategoryList .active')?.classList.remove('active');
        document.getElement;
        const amountInput = document.getElementById('amount');
        const descriptionInput = document.getElementById('description');
        const customCategoryInput = document.getElementById('customCategory');

        amountInput.value = '';
        descriptionInput.value = '';
        customCategoryInput.value = '';
        
        subCategoryContainer.style.display = 'none';
        document.querySelector('[data-category="Expense"]').classList.add('active'); // '지출' 항목 활성화
        updateSubCategoryList(); // 세부 항목 리스트 업데이트
    }

    // 초기 로딩 시 '지출' 카테고리와 해당 세부 항목 리스트를 설정
    document.querySelector('[data-category="Expense"]').classList.add('active');
    updateSubCategoryList();
    updateViewMonthSelect();
    //updateChart(); // Update the chart with new data
}

function loadInitialBudgetEntries(initialBudgetEntries) {
    budgetEntries = initialBudgetEntries;

    // Sort the initial budget entries by year and month
    budgetEntries.sort((a, b) => {
        const [aYear, aMonth] = [a.year, a.month].map(Number);
        const [bYear, bMonth] = [b.year, b.month].map(Number);

        if (aYear === bYear) {
            return aMonth - bMonth;
        } else {
            return aYear - bYear;
        }
    });

    const tableBody = document.getElementById('budgetTableBody');
    budgetEntries.forEach(entry => {
        const row = document.createElement('tr');
        row.dataset.month = `${entry.year}-${entry.month.toString().padStart(2, '0')}`;
        const translatedCategory = entry.category;
        row.innerHTML = `
            <td>${entry.year}년 ${entry.month}월</td>
            <td>${translatedCategory}</td>
            <td>${entry.sub_category}</td>
            <td>${entry.amount}</td>
            <td>${entry.description}</td>
            <td><span style="cursor: pointer;" class="material-icons" onclick="deleteBudgetEntry(this, ${entry.id})">remove_circle_outline</span></td>
        `;
        tableBody.appendChild(row);
    });

    updateChart(budgetEntries);
}




function classify_budget(initialBudgetEntries) {
    const data = initialBudgetEntries || [];  // 데이터가 없는 경우 빈 배열로 초기화

    const expenseCategories = {
        "Eat": ["식비", "카페"],
        "Live": ["대출이자/월세", "관리비", "통신비", "생필품", "보험료", "경조사", "의료비"],
        "Wear": ["의류", "잡화", "뷰티/미용"],
        "Enjoy": ["취미", "운동", "도서", "여행", "구독서비스"],
        "Edu": ["교육비/클래스", "교재"],
        "Ride": ["대중교통", "택시비"],
        "Other": ["세금"]  // 세금 카테고리 추가
    };

    // Initialize month-category totals for all months in the year
    const monthCategoryTotals = {};
    for (let month = 1; month <= 12; month++) {
        const key = `${new Date().getFullYear()}-${month.toString().padStart(2, '0')}`;
        monthCategoryTotals[key] = {
            "Eat": 0,
            "Live": 0,
            "Wear": 0,
            "Enjoy": 0,
            "Edu": 0,
            "Ride": 0,
            "Other": 0
        };
    }

    // Calculate totals by month and category
    data.forEach(entry => {
        if (entry.category === 'Expense') {
            const key = `${entry.year}-${entry.month.toString().padStart(2, '0')}`;
            if (!monthCategoryTotals[key]) {
                monthCategoryTotals[key] = {
                    "Eat": 0,
                    "Live": 0,
                    "Wear": 0,
                    "Enjoy": 0,
                    "Edu": 0,
                    "Ride": 0,
                    "Other": 0
                };
            }

            let categorized = false;
            Object.keys(expenseCategories).forEach(category => {
                if (expenseCategories[category].includes(entry.sub_category)) {
                    monthCategoryTotals[key][category] += entry.amount;
                    categorized = true;
                }
            });

            // If not categorized, add to "Other" category
            if (!categorized) {
                monthCategoryTotals[key]["Other"] += entry.amount;
            }
        }
    });

    console.log("Classified Budget Data:", monthCategoryTotals); // 디버깅용 콘솔 로그 추가
    return monthCategoryTotals;
}


function initializeChart() {
    const options = {
        chart: {
            type: 'line',
            height: 350,
            width: '100%',
            animations: {
                enabled: true
            },
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            }
        },
        series: [],
        xaxis: {
            categories: []
        },
        yaxis: {
            title: {
                text: '금액 (원)'
            },
            max: undefined // Set dynamically later
        },
        plotOptions: {
            bar: {
                horizontal: false,
                dataLabels: {
                    total: {
                        enabled: true,
                        style: {
                            fontSize: '13px',
                            fontWeight: 900
                        }
                    }
                }
            }
        }
    };

    chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
}


function updateChart(budgetEntries) {
    const monthCategoryTotals = classify_budget(budgetEntries);

    // Check if monthCategoryTotals is valid
    if (!monthCategoryTotals || Object.keys(monthCategoryTotals).length === 0) {
        console.error("Invalid data returned from classify_budget:", monthCategoryTotals);
        return;
    }

    // Extract sorted categories and months
    const categories = Object.keys(monthCategoryTotals[Object.keys(monthCategoryTotals)[0]]).sort();
    const months = Object.keys(monthCategoryTotals).sort();

    // Prepare series data
    const series = categories.map(category => ({
        name: category,
        type: 'bar',
        data: months.map(month => monthCategoryTotals[month][category])
    }));

    // Calculate total expenses for line chart
    const totalExpenses = months.map(month => {
        return categories.reduce((sum, category) => sum + monthCategoryTotals[month][category], 0);
    });

    // Add total expenses series as a line chart
    series.push({
        name: '총 지출',
        type: 'line',
        data: totalExpenses
    });

    // Find the maximum value in the total expenses
    const maxTotalExpense = Math.max(...totalExpenses);
    const yAxisMax = maxTotalExpense * 1.2;

    // Update chart with new data and y-axis maximum value
    chart.updateOptions({
        xaxis: {
            categories: months
        },
        series: series,
        yaxis: {
            max: yAxisMax
        }
    });
}