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
    const layoutTemplate = {
        responsive: true,
        margin: { t: 30 }
    };

    // NASDAQ and S&P 500 with dual y-axes
    if (data.nasdaq && data.sp500) {
        const traceNasdaq = {
            x: data.dates,
            y: data.nasdaq,
            name: 'NASDAQ',
            yaxis: 'y1',
            type: 'scatter'
        };

        const traceSp500 = {
            x: data.dates,
            y: data.sp500,
            name: 'S&P 500',
            yaxis: 'y2',
            type: 'scatter'
        };

        const layout = {
            ...layoutTemplate,
            title: 'NASDAQ and S&P 500',
            yaxis: { title: 'NASDAQ' },
            yaxis2: {
                title: 'S&P 500',
                overlaying: 'y',
                side: 'right'
            }
        };

        Plotly.newPlot('chart-nasdaq-sp500', [traceNasdaq, traceSp500], layout);
    }

    // KOSPI and KOSDAQ with dual y-axes
    if (data.kospi && data.kosdaq) {
        const traceKospi = {
            x: data.dates,
            y: data.kospi,
            name: 'KOSPI',
            yaxis: 'y1',
            type: 'scatter'
        };

        const traceKosdaq = {
            x: data.dates,
            y: data.kosdaq,
            name: 'KOSDAQ',
            yaxis: 'y2',
            type: 'scatter'
        };

        const layout = {
            ...layoutTemplate,
            title: 'KOSPI and KOSDAQ',
            yaxis: { title: 'KOSPI' },
            yaxis2: {
                title: 'KOSDAQ',
                overlaying: 'y',
                side: 'right'
            }
        };

        Plotly.newPlot('chart-kospi-kosdaq', [traceKospi, traceKosdaq], layout);
    }

    // KOSPI Disparity Index
    if (data.kospi_disparity_20 && data.kospi_disparity_60 && data.kospi_disparity_200) {
        const traceDisparity20 = {
            x: data.dates,
            y: data.kospi_disparity_20,
            name: 'Disparity 20',
            type: 'scatter'
        };

        const traceDisparity60 = {
            x: data.dates,
            y: data.kospi_disparity_60,
            name: 'Disparity 60',
            type: 'scatter'
        };

        const traceDisparity200 = {
            x: data.dates,
            y: data.kospi_disparity_200,
            name: 'Disparity 200',
            type: 'scatter'
        };

        const layout = {
            ...layoutTemplate,
            title: 'KOSPI Disparity Index'
        };

        Plotly.newPlot('chart-kospi-disparity', [traceDisparity20, traceDisparity60, traceDisparity200], layout);
    }
}