import Asset from '../models/Asset.js';

export async function fetchAssets() {
    const response = await fetch('/assets');
    const data = await response.json();
    return data.map((item, index) => new Asset(item.id, item.name, item.type, item.category, item.nature));
}

export async function fetchAllAssets() {
    const response = await fetch('/all_assets');
    const data = await response.json();
    return data;
}