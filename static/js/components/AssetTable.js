export function renderAssets(assets, deleteAsset, updateChart, draggedElement) {
    const assetContainer = document.getElementById('assetsContainer');
    const liabilityContainer = document.getElementById('liabilitiesContainer');
    assetContainer.innerHTML = '<thead><tr><th>자산 이름</th><th>자산 값</th><th>삭제</th></tr></thead><tbody></tbody>';
    liabilityContainer.innerHTML = '<thead><tr><th>부채 이름</th><th>부채 값</th><th>삭제</th></tr></thead><tbody></tbody>';
    
    const assetTbody = assetContainer.querySelector('tbody');
    const liabilityTbody = liabilityContainer.querySelector('tbody');
    
    assets.forEach((asset, index) => {
        const row = asset.createElement(index, deleteAsset, updateChart, draggedElement);
        if (asset.category === 'asset') {
            assetTbody.appendChild(row);
        } else if (asset.category === 'liability') {
            liabilityTbody.appendChild(row);
        }
    });
}