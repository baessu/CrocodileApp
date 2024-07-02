document.addEventListener('DOMContentLoaded', function () {
    // 로컬 스토리지에서 'economicIndicators' 항목을 삭제
    localStorage.removeItem('economicIndicators');
    fetchEconomicIndicators();
});

function fetchEconomicIndicators() {
    const cachedData = JSON.parse(localStorage.getItem('economicIndicators'));
    const now = new Date();

    if (cachedData && (now - new Date(cachedData.timestamp)) < 60 * 60 * 1000) {
        renderCharts(cachedData.data);
    } else {
        fetch('/api/economic_indicators')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem('economicIndicators', JSON.stringify({ timestamp: new Date(), data }));
                renderCharts(data);
            })
            .catch(error => console.error('Error fetching economic indicators:', error));
    }
}

function renderCharts(data) {
    if (!data || !data.dates) {
        console.error('Data or dates not defined');
        return;
    }
    // 최근 30일 데이터 추출
    const recentDates = data.dates.slice(-30);
    const recentNasdaq = data.nasdaq.slice(-30);
    const recentSp500 = data.sp500.slice(-30);
    const recentKospi = data.kospi.slice(-30);
    const recentKosdaq = data.kosdaq.slice(-30);
    const recentDisparity20 = data.kospi_disparity_20.slice(-30);
    const recentDisparity60 = data.kospi_disparity_60.slice(-30);
    const recentDisparity200 = data.kospi_disparity_200.slice(-30);
    const recentKospiPbrValues = data.kospi_pbr_values.slice(-30);
    const recentKospiPbrDates = data.kospi_pbr_dates.slice(-30);

    // NASDAQ and S&P 500 with dual y-axes
    if (data.nasdaq && data.sp500) {
        const optionsNasdaqSp500 = getOptions(
            'area',
            'NASDAQ and S&P 500',
            [
                { name: 'NASDAQ', data: recentNasdaq },
                { name: 'S&P 500', data: recentSp500 }
            ],
            recentDates,
            'NASDAQ',
            'S&P 500'
        );
        var chartNasdaqSp500 = new ApexCharts(document.querySelector("#chart-nasdaq-sp500"), optionsNasdaqSp500);
        chartNasdaqSp500.render().then(() => {
            renderIndexChange('index-nasdaq', recentNasdaq, 'NASDAQ');
            renderIndexChange('index-sp500', recentSp500, 'S&P 500');
        });
    }

    // KOSPI and KOSDAQ with dual y-axes
    if (data.kospi && data.kosdaq) {
        const optionsKospiKosdaq = getOptions(
            'area',
            'KOSPI and KOSDAQ',
            [
                { name: 'KOSPI', data: recentKospi },
                { name: 'KOSDAQ', data: recentKosdaq }
            ],
            recentDates,
            'KOSPI',
            'KOSDAQ'
        );
        var chartKospiKosdaq = new ApexCharts(document.querySelector("#chart-kospi-kosdaq"), optionsKospiKosdaq);
        chartKospiKosdaq.render().then(() => {
            renderIndexChange('index-kospi', recentKospi, 'KOSPI');
            renderIndexChange('index-kosdaq', recentKosdaq, 'KOSDAQ');
        });
    }

    // KOSPI Disparity Index
    if (data.kospi_disparity_20 && data.kospi_disparity_60 && data.kospi_disparity_200) {
        const optionsKospiDisparity = getOptions(
            'line',
            'KOSPI Disparity Index',
            [
                { name: 'Disparity 20', data: recentDisparity20 },
                { name: 'Disparity 60', data: recentDisparity60 },
                { name: 'Disparity 200', data: recentDisparity200 }
            ],
            recentDates,
            'Disparity'
        );
        var chartKospiDisparity = new ApexCharts(document.querySelector("#chart-kospi-disparity"), optionsKospiDisparity);
        chartKospiDisparity.render().then(() => {
            renderIndexChange('index-disparity-20', recentDisparity20, 'Disparity 20');
            renderIndexChange('index-disparity-60', recentDisparity60, 'Disparity 60');
            renderIndexChange('index-disparity-200', recentDisparity200, 'Disparity 200');
        });
    }

    // KOSPI PBR
    if (recentKospiPbrValues && recentKospiPbrDates) {
        const maxValue = Math.max(...recentKospiPbrValues);
        const minValue = Math.min(...recentKospiPbrValues);
        const rangePadding = (maxValue - minValue) * 0.2;

        const optionsKospiPbr = getOptions(
            'line',
            'KOSPI PBR',
            [{ name: 'KOSPI PBR', data: recentKospiPbrValues }],
            recentKospiPbrDates,
            'PBR'
        );
        optionsKospiPbr.yaxis[0].min = minValue - rangePadding;
        optionsKospiPbr.yaxis[0].max = maxValue + rangePadding;

        var chartKospiPbr = new ApexCharts(document.querySelector("#chart-kospi-pbr"), optionsKospiPbr);
        chartKospiPbr.render().then(() => {
            renderIndexChange('index-kospi-pbr', recentKospiPbrValues, 'KOSPI PBR');
        });
    }
}