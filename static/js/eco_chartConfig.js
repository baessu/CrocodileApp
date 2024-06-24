// 숫자를 K, M으로 축약하는 함수
function formatNumber(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
     } 
    //else if (value >= 1000) {
    //     return (value / 1000).toFixed(1) + 'K';
    // }
    return value.toString();
}

function formatNumberFixed(value, decimals = 2) {
    return value.toFixed(decimals);
}

// 지수 변화를 표시하는 함수
function renderIndexChange(elementId, recentData, indexName) {
    const todayValue = recentData[recentData.length - 1];
    const yesterdayValue = recentData[recentData.length - 2];
    const change = todayValue - yesterdayValue;
    const changePercentage = (change / yesterdayValue * 100).toFixed(2);

    const changeText = change > 0 ? `▲ ${formatNumberFixed(change)} (${changePercentage}%)` : `▼ ${formatNumberFixed(Math.abs(change))} (${changePercentage}%)`;
    const indexText = ` • 오늘의 ${indexName} 지수: ${formatNumberFixed(todayValue)} (${changeText})`;

    document.getElementById(elementId).innerText = indexText;
}

function getOptions(type, title, series, categories, yaxisTitle, yaxisOppositeTitle = null) {
    const yaxis = [
        {
            title: {
                text: yaxisTitle
            },
            labels: {
                formatter: formatNumber
            }
        }
    ];

    if (yaxisOppositeTitle) {
        yaxis.push({
            opposite: true,
            title: {
                text: yaxisOppositeTitle
            },
            labels: {
                formatter: formatNumber
            }
        });
    }

    return {
        chart: {
            type: type,
            height: 350,
            zoom: {
                type: 'x',
                enabled: true,
                autoScaleYaxis: true
            },
            toolbar: {
                autoSelected: 'zoom'
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: false,
                    opacityFrom: 0.5,
                    opacityTo: 0,
                    stops: [0, 90, 100]
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        series: series,
        xaxis: {
            categories: categories
        },
        yaxis: yaxis,
        title: {
            text: title,
            align: 'center'
        }
    };
}