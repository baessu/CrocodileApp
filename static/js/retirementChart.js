let retirementChart;

export function formatNumber(input) {
    const value = input.value.replace(/\D/g, '');
    input.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    calculateRetirement();
}

export function calculateRetirement() {
    const currentAge = parseInt(document.getElementById('currentAge')?.value.replace(/,/g, '')) || 0;
    const retirementAge = parseInt(document.getElementById('retirementAge')?.value.replace(/,/g, '')) || 0;
    const lifeExpectancy = parseInt(document.getElementById('lifeExpectancy')?.value.replace(/,/g, '')) || 0;
    const currentSavings = parseFloat(document.getElementById('currentSavings')?.value.replace(/,/g, '')) || 0;
    const annualSavings = parseFloat(document.getElementById('annualSavings')?.value.replace(/,/g, '')) || 0;
    const retirementSpending = parseFloat(document.getElementById('retirementSpending')?.value.replace(/,/g, '')) || 0;
    const inflationRate = parseFloat(document.getElementById('inflationRate')?.value.replace(/,/g, '')) || 0;
    const investmentReturn = parseFloat(document.getElementById('investmentReturn')?.value.replace(/,/g, '')) || 0;

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retirementAge;

    let savings = currentSavings;
    let requiredSavings = 0;
    let savingsHistory = [];
    let requiredSavingsHistory = [];
    let maxSavings = 0;
    let maxSavingsAge = currentAge;
    let annualSavingsHistory = [];
    let annualSpendingHistory = [];

    for (let age = currentAge; age <= lifeExpectancy; age++) {
        const annualExpenses = age < retirementAge ? 0 : retirementSpending * Math.pow((1 + inflationRate / 100), age - retirementAge);

        if (age < retirementAge) {
            savings += annualSavings;
        } else {
            savings -= annualExpenses;
        }

        savings += savings * (investmentReturn / 100);
        requiredSavings += annualExpenses;
        savingsHistory.push(savings.toFixed(0));
        requiredSavingsHistory.push(requiredSavings.toFixed(0));
        annualSavingsHistory.push(age < retirementAge ? annualSavings.toFixed(0) : 0);
        annualSpendingHistory.push(annualExpenses.toFixed(0));

        if (savings > maxSavings) {
            maxSavings = savings;
            maxSavingsAge = age;
        }
    }

    const retirementShortfall = requiredSavingsHistory[requiredSavingsHistory.length - 1] - savingsHistory[savingsHistory.length - 1];

    if (document.getElementById('resultText')) {
        document.getElementById('resultText').innerHTML = `
            <p>최대 누적 자산: ${maxSavings.toLocaleString()} 원 (나이 ${maxSavingsAge}에 도달)</p>
            <p>필요 자산과 예상 자산의 차이: ${retirementShortfall.toLocaleString()} 원</p>
        `;
    }

    const years = Array.from({ length: lifeExpectancy - currentAge + 1 }, (_, i) => currentAge + i);

    const maxValue = Math.max(...savingsHistory, ...requiredSavingsHistory, ...annualSavingsHistory, ...annualSpendingHistory);

    const retirementChartOptions = {
        chart: {
            type: 'line',
            height: 600
        },
        series: [
            {
                name: '예상 누적 자산',
                data: savingsHistory
            },
            {
                name: '필요 누적 자산',
                data: requiredSavingsHistory
            },
            {
                name: '연간 저축액',
                type: 'column',
                data: annualSavingsHistory,
                yaxis: 1
            },
            {
                name: '연간 생활비',
                type: 'column',
                data: annualSpendingHistory,
                yaxis: 2
            }
        ],
        xaxis: {
            categories: years,
            title: {
                text: '나이'
            },
            labels: {
                rotate: -45,
                rotateAlways: true,
                formatter: function (val) {
                    return val % 5 === 0 ? val : '';
                }
            }
        },
        yaxis: [
            {
                title: {
                    text: '저축액 (원)'
                },
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
                min: 0,
                max: maxValue
            },
            {
                opposite: true,
                title: {
                    text: '연간 저축액 (원)'
                },
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
                min: 0,
                max: Math.max(...annualSavingsHistory) * 1.2
            },
            {
                opposite: true,
                title: {
                    text: '연간 생활비 (원)'
                },
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
                min: 0,
                max: Math.max(...annualSpendingHistory) * 1.2
            }
        ]
    };

    const retirementChartElement = document.querySelector("#retirementChart");

    if (retirementChartElement) {
        if (retirementChart) {
            retirementChart.updateOptions(retirementChartOptions);
        } else {
            retirementChart = new ApexCharts(retirementChartElement, retirementChartOptions);
            retirementChart.render();
        }
    }

    let analysisText = `
        <p>최대 누적 자산: ${maxSavings.toLocaleString()} 원 (나이 ${maxSavingsAge}에 도달)</p>
        <p>필요 자산과 예상 자산의 차이: ${retirementShortfall.toLocaleString()} 원</p>
    `;

    if (retirementShortfall > 0) {
        const additionalSavings = retirementShortfall / yearsToRetirement;
        const requiredReturnRate = ((retirementShortfall / currentSavings) / yearsInRetirement) * 100;

        analysisText += `
            <p>목표를 달성하기 위해 연간 추가 저축액: ${additionalSavings.toLocaleString()} 원</p>
            <p>필요한 투자 수익률: ${requiredReturnRate.toFixed(2)}%</p>
        `;
    } else {
        analysisText += `
            <p>축하합니다! 현재 저축 계획과 투자 수익률로 은퇴 목표를 달성할 수 있습니다.</p>
        `;
    }

    if (document.getElementById('analysisText')) {
        document.getElementById('analysisText').innerHTML = analysisText;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    calculateRetirement();
});