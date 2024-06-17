let natureChart, assetChart;

const colorMapping = {
    '은행 계좌 잔고': '#FF595E',
    '현금': '#DD3E43',
    '단기 금융 상품': '#BA2429',
    '저축성 보험': '#98090E',

    '주식': '#FF924C',
    '채권': '#EB8442',
    '펀드': '#D67638',
    'ETF': '#C2682E',
    '암호화폐': '#AE5A25',
    '금': '#9A4C1B',
    '은': '#853E11',
    '배당금': '#713007',

    '주거용 부동산': '#FFCA3A',
    '상업용 부동산': '#DFAE27',
    '임대용 부동산': '#C09213',
    '기타 부동산 자산': '#A07600',

    '401(k)': '#8AC926',
    'IRA': '#6DA513',
    '기타 연금 계좌': '#4F8000',

    '생명 보험 해지 환급금': '#1982C4',
    '예술품, 보석류 등': '#1170AB',
    '미술품': '#085D93',
    '골동품': '#004B7A',

    '기타 자산': '#606060',
    
    '주택 담보 대출': '#6A4C93',
    '자동차 대출': '#5E3D8B',
    '학자금 대출': '#512E82',
    '신용 카드 잔액': '#451E7A',
    '기타 개인 대출': '#380F71',
    '기타 부채': '#2C0069'
};

export function createCharts() {
    const natureChartOptions = {
        chart: {
            type: 'pie',
            height: 350
        },
        labels: ['현금 및 현금성 자산', '투자 자산', '부동산', '퇴직연금 및 연금 계좌', '기타 장기 자산', '부채'],
        series: [],
        colors: ['#FF595E', '#FF924C', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93'],
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };

    const assetChartOptions = {
        chart: {
            type: 'pie',
            height: 350
        },
        labels: [],
        series: [],
        colors: [],
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };

    natureChart = new ApexCharts(document.querySelector('#natureChart'), natureChartOptions);
    assetChart = new ApexCharts(document.querySelector('#assetChart'), assetChartOptions);

    natureChart.render();
    assetChart.render();
}

export function updateCharts() {
    const assetValues = Array.from(document.querySelectorAll('#assetsContainer input')).map(input => parseFloat(input.value.replace(/,/g, '')) || 0);
    const assetLabels = Array.from(document.querySelectorAll('#assetsContainer td:first-child')).map(td => td.textContent.trim());
    const assetNatures = Array.from(document.querySelectorAll('#assetsContainer td:first-child')).map(td => td.getAttribute('data-nature'));

    const liabilityValues = Array.from(document.querySelectorAll('#liabilitiesContainer input')).map(input => parseFloat(input.value.replace(/,/g, '')) || 0);
    const liabilityLabels = Array.from(document.querySelectorAll('#liabilitiesContainer td:first-child')).map(td => td.textContent.trim());

    const totalAssets = assetValues.reduce((a, b) => a + b, 0).toLocaleString();
    const totalLiabilities = liabilityValues.reduce((a, b) => a + b, 0).toLocaleString();
    const netWorth = (parseFloat(totalAssets.replace(/,/g, '')) - parseFloat(totalLiabilities.replace(/,/g, ''))).toLocaleString();

    document.getElementById('total_assets').innerText = `총 자산: ${totalAssets}`;
    document.getElementById('total_liabilities').innerText = `총 부채: ${totalLiabilities}`;
    document.getElementById('net_worth').innerText = `순자산: ${netWorth}`;

    let investmentAssetsTotal = 0;
    let cashEquivalentsTotal = 0;
    let realEstateTotal = 0;
    let retirementAccountsTotal = 0;
    let otherLongTermAssetsTotal = 0;

    assetNatures.forEach((nature, index) => {
        const value = assetValues[index];
        if (nature === 'investment_asset') {
            investmentAssetsTotal += value;
        } else if (nature === 'stability_asset') {
            cashEquivalentsTotal += value;
        } else if (nature === 'real_estate_asset') {
            realEstateTotal += value;
        } else if (nature === 'retirement_asset') {
            retirementAccountsTotal += value;
        } else if (nature === 'other_asset') {
            otherLongTermAssetsTotal += value;
        }
    });

    document.getElementById('investment_assets_total').innerText = `투자 자산 합: ${investmentAssetsTotal.toLocaleString()}`;
    document.getElementById('cash_equivalents_total').innerText = `현금 및 현금성 자산 합: ${cashEquivalentsTotal.toLocaleString()}`;
    document.getElementById('real_estate_total').innerText = `부동산 자산 합: ${realEstateTotal.toLocaleString()}`;
    document.getElementById('retirement_accounts_total').innerText = `퇴직연금 및 연금 계좌 합: ${retirementAccountsTotal.toLocaleString()}`;
    document.getElementById('other_long_term_assets_total').innerText = `기타 장기 자산 합: ${otherLongTermAssetsTotal.toLocaleString()}`;

    const debtRatio = ((parseFloat(totalLiabilities.replace(/,/g, '')) / parseFloat(totalAssets.replace(/,/g, ''))) * 100).toFixed(2);
    const liquidityRatio = ((cashEquivalentsTotal / parseFloat(totalAssets.replace(/,/g, ''))) * 100).toFixed(2);

    document.getElementById('debt_ratio').innerText = `부채 비율: ${debtRatio}%`;
    document.getElementById('liquidity_ratio').innerText = `자산 대비 현금 비율: ${liquidityRatio}%`;
    
    const assetColors = assetLabels.map(label => colorMapping[label] || '#FF4500');
    const liabilityColors = liabilityLabels.map(label => colorMapping[label] || '#FF4500');

    assetChart.updateOptions({
        labels: [...assetLabels, ...liabilityLabels],
        series: [...assetValues, ...liabilityValues],
        colors: [...assetColors, ...liabilityColors]
    });

    const natureData = {
        '현금 및 현금성 자산': cashEquivalentsTotal,
        '투자 자산': investmentAssetsTotal,
        '부동산': realEstateTotal,
        '퇴직연금 및 연금 계좌': retirementAccountsTotal,
        '기타 장기 자산': otherLongTermAssetsTotal,
        '부채': parseFloat(totalLiabilities.replace(/,/g, ''))
    };

    natureChart.updateOptions({
        series: Object.values(natureData),
        labels: Object.keys(natureData)
    });
}

export function formatCurrency(input) {
    let value = input.value.replace(/,/g, '');
    value = parseFloat(value);
    if (!isNaN(value)) {
        input.value = formatValue(value);
    }
}

export function parseCurrency(input) {
    let value = input.value.replace(/,/g, '');
    value = parseFloat(value);
    if (!isNaN(value)) {
        input.value = value.toString();
    }
}

export function formatValue(value) {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}


document.addEventListener('DOMContentLoaded', createCharts);