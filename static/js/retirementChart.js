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

    function calculateFutureValue(pv, annualContrib, annualRate, years) {
        const fvSavings = pv * Math.pow((1 + annualRate), years);
        const fvContrib = annualContrib * (Math.pow((1 + annualRate), years) - 1) / annualRate;
        return fvSavings + fvContrib;
    }

    function calculateRequiredSavings(annualExpense, annualRate, years) {
        let presentValue = 0;
        for (let i = 0; i < years; i++) {
            presentValue += annualExpense / Math.pow((1 + annualRate), i);
            annualExpense *= (1 + inflationRate / 100);
        }
        return presentValue;
    }

    const futureValue = calculateFutureValue(currentSavings, annualSavings, investmentReturn / 100, yearsToRetirement);
    const requiredSavings = calculateRequiredSavings(retirementSpending, investmentReturn / 100, yearsInRetirement);

    let savings = currentSavings;
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

        savingsHistory.push(Math.floor(savings));
        if (age >= retirementAge) {
            requiredSavingsHistory.push(Math.floor(calculateRequiredSavings(retirementSpending, investmentReturn / 100, lifeExpectancy - age)));
        } else {
            requiredSavingsHistory.push(0);
        }
        annualSavingsHistory.push(age < retirementAge ? Math.floor(annualSavings) : 0);
        annualSpendingHistory.push(Math.floor(annualExpenses));

        if (savings > maxSavings) {
            maxSavings = savings;
            maxSavingsAge = age;
        }
    }

    const retirementShortfall = futureValue - requiredSavings;

    if (document.getElementById('resultText')) {
        document.getElementById('resultText').innerHTML = `
            <div>최대 누적 자산: ${Math.floor(maxSavings).toLocaleString()} 원 (나이 ${maxSavingsAge}에 도달)</div>
            <div>필요 자산과 예상 자산의 차이: ${Math.abs(retirementShortfall).toLocaleString()} 원</div>
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
                data: annualSavingsHistory
            },
            {
                name: '연간 생활비',
                type: 'column',
                data: annualSpendingHistory
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
                serieseName: '예상 누적 자산',
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
                min: 0,
                max: Math.max(...savingsHistory) * 1.2
            },
            {
                serieseName: '필요 누적 자산',
                show: false,
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
                min: 0,
                max: Math.max(...savingsHistory) * 1.2
            },
            {
                opposite: true,
                title: {
                    text: '연간 저축액 및 생활비 (원)'
                },
                serieseName: '연간 저축액',
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
                min: 0,
                max: Math.max(...annualSpendingHistory) * 1.2
            },
            {
                serieseName: '연간 생활비',
                show: false,
                labels: {
                    formatter: function (value) {
                        return value.toLocaleString();
                    }
                },
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
        <div>• 최대 누적 자산:  ${Math.floor(maxSavings).toLocaleString()} 원 (나이 ${maxSavingsAge}에 도달)</div>
        <div>• 필요 누적 자산:  ${Math.floor(requiredSavings).toLocaleString()} 원</div>
        <div>• 필요 자산과 예상 자산의 차이:  ${Math.floor(retirementShortfall).toLocaleString()} 원</div>

    `;

    if (retirementShortfall < 0) {
        const additionalSavings = Math.floor(Math.abs(retirementShortfall) / yearsToRetirement);
        const totalSavingsRequired = currentSavings + (annualSavings + additionalSavings) * yearsToRetirement;
        const requiredReturnRate = (Math.pow(requiredSavings / totalSavingsRequired, 1 / yearsToRetirement) - 1) * 100;
    
        analysisText += `
            <div>• 목표를 달성하기 위해 연간 추가 저축액:  ${additionalSavings.toLocaleString()} 원</div>
            <div>• 필요한 투자 수익률:  ${requiredReturnRate.toFixed(2)}%</div>
        `;
    } else {
        analysisText += `
            <div><b>🎉 축하합니다! 현재 저축 계획과 투자 수익률로 은퇴 목표를 달성할 수 있습니다.</b></div>
        `;
    }

    if (document.getElementById('analysisText')) {
        document.getElementById('analysisText').innerHTML = analysisText;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    calculateRetirement();
});