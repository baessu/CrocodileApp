document.addEventListener('DOMContentLoaded', function () {
    fetchEconomicIndicators();
});

function fetchEconomicIndicators() {
    const cachedData = localStorage.getItem('economicIndicators');
    if (cachedData) {
        renderCharts(JSON.parse(cachedData));
    } else {
        fetch('/api/economic_indicators')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem('economicIndicators', JSON.stringify(data));
                renderCharts(data);
            })
            .catch(error => console.error('Error fetching economic indicators:', error));
    }
}

function renderCharts(data) {
    // 최근 30일 데이터 추출
    const recentDates = data.dates.slice(-30);
    const recentNasdaq = data.nasdaq.slice(-30);
    const recentSp500 = data.sp500.slice(-30);
    const recentKospi = data.kospi.slice(-30);
    const recentKosdaq = data.kosdaq.slice(-30);
    const recentDisparity20 = data.kospi_disparity_20.slice(-30);
    const recentDisparity60 = data.kospi_disparity_60.slice(-30);
    const recentDisparity200 = data.kospi_disparity_200.slice(-30);

    // 숫자를 K, M으로 축약하는 함수
    function formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
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

    // NASDAQ and S&P 500 with dual y-axes
    if (data.nasdaq && data.sp500) {
        const optionsNasdaqSp500 = {
            chart: {
                type: 'area',
                stacked: false,
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
                        stops: [50, 90, 100]
                    }
                }
            },
            dataLabels: {
                enabled: false
            },
            series: [
                {
                    name: 'NASDAQ',
                    data: recentNasdaq
                },
                {
                    name: 'S&P 500',
                    data: recentSp500
                }
            ],
            xaxis: {
                categories: recentDates
            },
            yaxis: [
                {
                    title: {
                        text: 'NASDAQ'
                    },
                    labels: {
                        formatter: formatNumber
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'S&P 500'
                    },
                    labels: {
                        formatter: formatNumber
                    }
                }
            ],
            title: {
                text: 'NASDAQ and S&P 500',
                align: 'center'
            }
        };
        var chartNasdaqSp500 = new ApexCharts(document.querySelector("#chart-nasdaq-sp500"), optionsNasdaqSp500);
        chartNasdaqSp500.render().then(() => {
            renderIndexChange('index-nasdaq', recentNasdaq, 'NASDAQ');
            renderIndexChange('index-sp500', recentSp500, 'S&P 500');
        });
    }

    // KOSPI and KOSDAQ with dual y-axes
    if (data.kospi && data.kosdaq) {
        const optionsKospiKosdaq = {
            chart: {
                type: 'area',
                stacked: false,
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
            series: [
                {
                    name: 'KOSPI',
                    data: recentKospi
                },
                {
                    name: 'KOSDAQ',
                    data: recentKosdaq
                }
            ],
            xaxis: {
                categories: recentDates
            },
            yaxis: [
                {
                    title: {
                        text: 'KOSPI'
                    },
                    labels: {
                        formatter: formatNumber
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'KOSDAQ'
                    },
                    labels: {
                        formatter: formatNumber
                    }
                }
            ],
            title: {
                text: 'KOSPI and KOSDAQ',
                align: 'center'
            }
        };
        var chartKospiKosdaq = new ApexCharts(document.querySelector("#chart-kospi-kosdaq"), optionsKospiKosdaq);
        chartKospiKosdaq.render().then(() => {
            renderIndexChange('index-kospi', recentKospi, 'KOSPI');
            renderIndexChange('index-kosdaq', recentKosdaq, 'KOSDAQ');
        });
    }

    // KOSPI Disparity Index
    if (data.kospi_disparity_20 && data.kospi_disparity_60 && data.kospi_disparity_200) {
        const optionsKospiDisparity = {
            chart: {
                type: 'line',
                height: 350
            },
            series: [
                {
                    name: 'Disparity 20',
                    data: recentDisparity20
                },
                {
                    name: 'Disparity 60',
                    data: recentDisparity60
                },
                {
                    name: 'Disparity 200',
                    data: recentDisparity200
                }
            ],
            xaxis: {
                categories: recentDates
            },
            yaxis: {
                labels: {
                    formatter: formatNumber
                }
            },
            title: {
                text: 'KOSPI Disparity Index',
                align: 'center'
            }
        };
        var chartKospiDisparity = new ApexCharts(document.querySelector("#chart-kospi-disparity"), optionsKospiDisparity);
        chartKospiDisparity.render().then(() => {
            renderIndexChange('index-disparity-20', recentDisparity20, 'Disparity 20');
            renderIndexChange('index-disparity-60', recentDisparity60, 'Disparity 60');
            renderIndexChange('index-disparity-200', recentDisparity200, 'Disparity 200');
        });
    }
}