import { getDisplayNature } from '../utils.js';

export function updateChart(assets, assetChart, natureChart) {
    const assetValues = assets.filter(asset => asset.category === 'asset').map(asset => asset.value);
    const totalAssets = assetValues.reduce((a, b) => a + b, 0);
    const liabilityValues = assets.filter(asset => asset.category === 'liability').map(asset => asset.value);
    const totalLiabilities = liabilityValues.reduce((a, b) => a + b, 0);
    const netWorth = totalAssets - totalLiabilities;

    const currency = document.getElementById('currency').value;
    document.getElementById('total_assets').innerText = `총 자산: ${totalAssets.toLocaleString()} ${currency}`;
    document.getElementById('total_liabilities').innerText = `총 부채: ${totalLiabilities.toLocaleString()} ${currency}`;
    document.getElementById('net_worth').innerText = `순자산: ${netWorth.toLocaleString()} ${currency}`;

    const groupedAssets = assets.filter(asset => asset.category === 'asset').reduce((acc, asset) => {
        if (!acc[asset.nature]) {
            acc[asset.nature] = 0;
        }
        acc[asset.nature] += asset.value;
        return acc;
    }, {});

    const groupedLiabilities = assets.filter(asset => asset.category === 'liability').reduce((acc, asset) => {
        if (!acc[asset.nature]) {
            acc[asset.nature] = 0;
        }
        acc[asset.nature] += asset.value;
        return acc;
    }, {});

    const natureChartLabels = Object.keys(groupedAssets).map(nature => getDisplayNature(nature));
    const natureChartData = Object.values(groupedAssets);

    natureChart.data.labels = natureChartLabels;
    natureChart.data.datasets[0].data = natureChartData;
    natureChart.update();

    const assetChartLabels = assets.filter(asset => asset.category === 'asset').map(asset => asset.name)
        .concat(assets.filter(asset => asset.category === 'liability').map(asset => asset.name));
    const assetChartData = assetValues.concat(liabilityValues);

    assetChart.data.labels = assetChartLabels;
    assetChart.data.datasets[0].data = assetChartData;
    assetChart.update();
}